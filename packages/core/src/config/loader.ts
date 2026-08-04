import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import type { ToolDefinition, ActionBlockRegistry } from "../tool";
import { AgentConfigSchema, type AgentConfig } from "./schema";
import type { GluonDatabaseAdapter } from "../server/db/adapter";
import { setDbAdapter } from "../server/db/adapterRegistry";
import type { TokenUsage } from "../types/TokenUsage";

export interface LoadedConfig {
  raw: AgentConfig;
  tools: Record<string, ToolDefinition>;
  actionBlocks: ActionBlockRegistry;
  systemPrompt: string;
  skills: string[];
  /**
   * Context provider functions loaded from `agent.config.json#context`.
   * Each function is called fresh on every agent request; its string return
   * value is injected into the system prompt under a `## Context` block.
   * Stored as functions (not pre-called strings) so dynamic values like the
   * current date/time are always up to date, even though `loadConfig` is cached.
   */
  contextProviders: Array<() => Promise<string>>;
  auth: {
    getUserId: (req: Request) => Promise<string | null>;
  };
  hooks: {
    onRunStart?: (ctx: { userId: string; chatId: string; runId: string }) => Promise<void>;
    onRunEnd?: (ctx: { userId: string; chatId: string; finishReason: string; usage: TokenUsage }) => Promise<void>;
    onRunError?: (ctx: { userId: string; error: Error }) => Promise<void>;
  };
}

let cached: LoadedConfig | null = null;

function resolveConfigPath(): string {
  const envPath = process.env.AGENT_CONFIG_PATH;
  if (envPath) return path.resolve(envPath);

  // Check project root first (Docker / flat layout)
  const rootPath = path.resolve(process.cwd(), "agent.config.json");
  if (fs.existsSync(rootPath)) return rootPath;

  // Fall back to gluon/ subfolder (Node.js process mode default layout)
  return path.resolve(process.cwd(), "gluon", "agent.config.json");
}

function resolveRelativePath(base: string, relativePath: string): string {
  const configDir = path.dirname(base);
  return path.resolve(configDir, relativePath);
}

async function dynamicImport(filePath: string): Promise<unknown> {
  const resolved = path.resolve(filePath);
  // file:// URL is required for absolute paths under Node ESM; nearest
  // agent/package.json `"type":"module"` (scaffolded by init) avoids
  // MODULE_TYPELESS_PACKAGE_JSON warnings for host apps without root "type".
  const module = await import(pathToFileURL(resolved).href);
  return module.default ?? module;
}

async function loadSystemPrompt(configPath: string, value: string): Promise<string> {
  if (value.endsWith(".md") || value.endsWith(".txt")) {
    const resolved = resolveRelativePath(configPath, value);
    if (fs.existsSync(resolved)) {
      return fs.readFileSync(resolved, "utf-8");
    }
  }
  return value;
}

async function loadSkillContent(configPath: string, skillPath: string): Promise<string> {
  const resolved = resolveRelativePath(configPath, skillPath);
  if (fs.existsSync(resolved)) {
    return fs.readFileSync(resolved, "utf-8");
  }
  throw new Error(`Skill file not found: ${resolved}`);
}

/**
 * Resolve a getUserId function from the `auth.handler` config value.
 *
 * "allow"        → always returns "anon" (all requests pass)
 * "deny"         → always returns null  (all requests get 401)
 * "./path/to/auth.ts" → dynamically imports the file's default export:
 *
 *   export default async function(req: Request): Promise<string | boolean | null>
 *     string  → use as userId (allow)
 *     true    → allow as "anon"
 *     false   → reject (401)
 *     null    → reject (401)
 */
async function resolveGetUserId(
  configPath: string,
  handler: string,
): Promise<(req: Request) => Promise<string | null>> {
  if (handler === "allow") {
    return async () => "anon";
  }

  if (handler === "deny") {
    return async () => null;
  }

  // Custom file path
  const authPath = resolveRelativePath(configPath, handler);
  const authMod = await dynamicImport(authPath);
  const fn = authMod as (req: Request) => Promise<string | boolean | null>;

  return async (req: Request) => {
    const result = await fn(req);
    if (result === false || result === null || result === undefined) return null;
    if (result === true) return "anon";
    return String(result);
  };
}

export async function loadConfig(): Promise<LoadedConfig> {
  if (cached) return cached;

  const configPath = resolveConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `agent.config.json not found at ${configPath}. Run 'npx gluon-ai init' to scaffold it.`,
    );
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8")) as unknown;
  const config = AgentConfigSchema.parse(raw);

  const systemPrompt = await loadSystemPrompt(configPath, config.systemPrompt);

  const tools: Record<string, ToolDefinition> = {};
  for (const [name, filePath] of Object.entries(config.tools)) {
    const resolved = resolveRelativePath(configPath, filePath);
    let mod: unknown;
    try {
      mod = await dynamicImport(resolved);
    } catch (err) {
      throw new Error(
        `[gluon-ai] Failed to load tool "${name}" from "${resolved}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!mod || typeof (mod as ToolDefinition).execute !== "function") {
      throw new Error(
        `[gluon-ai] Tool "${name}" loaded from "${resolved}" does not export a valid ToolDefinition (missing .execute). Check that the file exports a defineTool() result as its default export.`,
      );
    }
    tools[name] = mod as ToolDefinition;
  }

  const actionBlocks: ActionBlockRegistry = {};
  for (const [name, filePath] of Object.entries(config.actionBlocks ?? {})) {
    const resolved = resolveRelativePath(configPath, filePath);
    const mod = await dynamicImport(resolved);
    actionBlocks[name] = mod as ActionBlockRegistry[string];
  }

  const skills: string[] = [];
  for (const skillPath of config.skills ?? []) {
    const content = await loadSkillContent(configPath, skillPath);
    skills.push(content);
  }

  const contextProviders: Array<() => Promise<string>> = [];
  for (const contextPath of config.context ?? []) {
    const resolved = resolveRelativePath(configPath, contextPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`[gluon-ai] Context provider file not found: ${resolved}`);
    }
    const mod = await dynamicImport(resolved);
    if (typeof mod !== "function") {
      throw new Error(
        `[gluon-ai] Context provider "${resolved}" must export a default async function () => Promise<string>.`,
      );
    }
    contextProviders.push(mod as () => Promise<string>);
  }

  const getUserId = await resolveGetUserId(configPath, config.auth.handler);

  let hooks: LoadedConfig["hooks"] = {};
  if (config.hooks) {
    const hooksPath = resolveRelativePath(configPath, config.hooks);
    const hooksMod = await import(hooksPath) as LoadedConfig["hooks"] & Record<string, unknown>;
    hooks = {
      onRunStart: hooksMod.onRunStart as LoadedConfig["hooks"]["onRunStart"],
      onRunEnd: hooksMod.onRunEnd as LoadedConfig["hooks"]["onRunEnd"],
      onRunError: hooksMod.onRunError as LoadedConfig["hooks"]["onRunError"],
    };
  }

  // ── Database adapter ─────────────────────────────────────────────────────
  if (config.db?.adapter) {
    // Custom adapter path (any ORM / DB client)
    const adapterPath = resolveRelativePath(configPath, config.db.adapter);
    const adapterMod = await dynamicImport(adapterPath);
    setDbAdapter(adapterMod as GluonDatabaseAdapter);
  } else {
    // Built-in Prisma adapter — supports postgresql / mysql / sqlite / sqlserver
    const { getPrismaClient } = require("../server/db/prismaClient") as typeof import("../server/db/prismaClient");
    const { createPrismaAdapter } = require("../server/db/prismaAdapter") as typeof import("../server/db/prismaAdapter");
    setDbAdapter(createPrismaAdapter(getPrismaClient()));
  }

  cached = {
    raw: config,
    tools,
    actionBlocks,
    systemPrompt,
    skills,
    contextProviders,
    auth: { getUserId },
    hooks,
  };

  return cached;
}

export function invalidateConfigCache(): void {
  cached = null;
}

export function getEnvVar(
  name: keyof NonNullable<AgentConfig["env"]>,
  config: AgentConfig,
): string {
  const envName = config.env?.[name] ?? name;
  const value = process.env[envName];
  if (!value) {
    throw new Error(
      `Environment variable ${envName} is not set. Required for gluon-ai.`,
    );
  }
  return value;
}
