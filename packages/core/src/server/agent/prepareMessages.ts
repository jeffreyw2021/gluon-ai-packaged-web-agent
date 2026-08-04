import { generateId, type UIMessage } from "ai";
import { TOOL_PART_STATE, normalizeToolPartState } from "../thread/toolPartStatePolicy";

const BUILT_IN_INTERNAL_TOOLS = new Set(["load_skill", "pause_for_input"]);

export function dropEmptyPartsMessages(messages: UIMessage[]): UIMessage[] {
  return messages.filter((msg) => (msg.parts?.length ?? 0) > 0);
}

type ToolPartRow = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

export function ensureToolCallIdsOnParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "assistant") return msg;
    const parts = (msg.parts ?? []).map((part) => {
      if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
        return part;
      }
      const row = part as ToolPartRow;
      const toolCallId =
        typeof row.toolCallId === "string" ? row.toolCallId.trim() : "";
      if (toolCallId) return part;
      return { ...part, toolCallId: generateId() } as typeof part;
    });
    return { ...msg, parts } as UIMessage;
  });
}

export function normalizeToolPartsInMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "assistant") return msg;
    const parts = (msg.parts ?? []).map((part) => {
      if (
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        "state" in part
      ) {
        const p = part as { state?: string };
        const nextState = normalizeToolPartState(p.state);
        if (nextState === p.state) return part;
        return { ...part, state: nextState } as typeof part;
      }
      return part;
    });
    return { ...msg, parts } as UIMessage;
  });
}

export function redactInternalToolOutputsForAgent(
  messages: UIMessage[],
  internalToolNames: ReadonlySet<string> = BUILT_IN_INTERNAL_TOOLS,
): UIMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "assistant") return msg;
    const parts = (msg.parts ?? []).map((part) => {
      if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
        return part;
      }
      const toolName = part.type.slice(5);
      if (!internalToolNames.has(toolName)) return part;

      const row = part as ToolPartRow;
      if (row.state !== TOOL_PART_STATE.OUTPUT_AVAILABLE || row.output == null) {
        return part;
      }

      if (toolName === "load_skill") {
        const skill =
          row.input &&
          typeof row.input === "object" &&
          "skill" in row.input &&
          typeof (row.input as { skill?: unknown }).skill === "string"
            ? (row.input as { skill: string }).skill
            : "unknown";
        return {
          ...part,
          output: { content: `[Skill "${skill}" loaded for this conversation]` },
        } as typeof part;
      }

      return part;
    });
    return { ...msg, parts } as UIMessage;
  });
}

export function prepareUiMessagesForAgent(messages: UIMessage[]): UIMessage[] {
  return redactInternalToolOutputsForAgent(
    ensureToolCallIdsOnParts(dropEmptyPartsMessages(messages)),
  );
}
