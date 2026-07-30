
import { tool } from "ai";
import { z } from "zod";
import type { ToolDefinition } from "../../../tool";

// ─── Zod schema → human-readable string ──────────────────────────────────────

function zodTypeName(schema: z.ZodTypeAny, depth = 0): string {
  const tn: string = (schema._def as { typeName?: string })?.typeName ?? "unknown";

  switch (tn) {
    case "ZodString":  return "string";
    case "ZodNumber":  return "number";
    case "ZodBoolean": return "boolean";
    case "ZodNull":    return "null";
    case "ZodAny":     return "any";
    case "ZodUnknown": return "unknown";

    case "ZodLiteral":
      return JSON.stringify((schema._def as { value: unknown }).value);

    case "ZodEnum":
      return ((schema._def as { values: unknown[] }).values)
        .map((v) => JSON.stringify(v))
        .join(" | ");

    case "ZodArray":
      return `array<${zodTypeName((schema._def as { type: z.ZodTypeAny }).type, depth)}>`;

    case "ZodOptional":
      return `${zodTypeName((schema._def as { innerType: z.ZodTypeAny }).innerType, depth)} (optional)`;

    case "ZodNullable":
      return `${zodTypeName((schema._def as { innerType: z.ZodTypeAny }).innerType, depth)} | null`;

    case "ZodDefault": {
      const def = schema._def as { innerType: z.ZodTypeAny; defaultValue: () => unknown };
      return `${zodTypeName(def.innerType, depth)} (default: ${JSON.stringify(def.defaultValue())})`;
    }

    case "ZodObject":
      if (depth >= 2) return "object";
      return serializeObjectShape(
        (schema as z.ZodObject<z.ZodRawShape>).shape as Record<string, z.ZodTypeAny>,
        depth + 1,
      );

    default:
      return tn.replace("Zod", "").toLowerCase();
  }
}

function serializeObjectShape(
  shape: Record<string, z.ZodTypeAny>,
  depth: number,
): string {
  const indent = "  ".repeat(depth);
  const entries = Object.entries(shape)
    .map(([key, val]) => {
      const desc = val.description ? ` — ${val.description}` : "";
      return `${indent}${key}: ${zodTypeName(val, depth)}${desc}`;
    })
    .join("\n");
  return `{\n${entries}\n${"  ".repeat(depth - 1)}}`;
}

function serializeToolSpec(name: string, def: ToolDefinition): string {
  let out = `### ${name}\n${def.description}`;

  try {
    if (def.inputSchema instanceof z.ZodObject) {
      const shape = (def.inputSchema as z.ZodObject<z.ZodRawShape>).shape as Record<string, z.ZodTypeAny>;
      const params = Object.entries(shape)
        .map(([key, val]) => {
          const desc = val.description ? ` — ${val.description}` : "";
          return `  - \`${key}\` (${zodTypeName(val)})${desc}`;
        })
        .join("\n");
      if (params) out += `\n\n**Parameters:**\n${params}`;
    }
  } catch {
    // schema not introspectable — skip params
  }

  return out;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Internal tool always injected into every agent.
 * Returns the full catalog of user-configured tools — their descriptions and
 * parameter signatures — so the model can decide which tool to use and how
 * to call it correctly.
 */
export function createDiscoverToolsTool(tools: Record<string, ToolDefinition>) {
  const toolNames = Object.keys(tools);

  return tool({
    description:
      "Discover the tools configured for this agent and learn how to use them. " +
      "Call this once per conversation before attempting any tool-assisted task. " +
      "Returns the full description and parameter reference for every available tool. " +
      "Do NOT skip this step and guess at tool names or call signatures.",
    inputSchema: z.object({
      toolName: z
        .string()
        .optional()
        .describe(
          "Name of a specific tool to inspect. Omit to get the full catalog of all tools.",
        ),
    }),
    execute: async ({ toolName }) => {
      if (toolNames.length === 0) {
        return { message: "No custom tools are configured for this agent." };
      }

      // Single-tool detail view
      if (toolName) {
        const def = tools[toolName];
        if (!def) {
          return {
            error: `Tool "${toolName}" not found.`,
            available: toolNames,
          };
        }
        return { spec: serializeToolSpec(toolName, def) };
      }

      // Full catalog
      const catalog = toolNames
        .map((name) => serializeToolSpec(name, tools[name]!))
        .join("\n\n---\n\n");

      return { catalog, toolCount: toolNames.length };
    },
  });
}
