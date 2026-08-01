import { z } from "zod";

export const AgentConfigSchema = z.object({
  model: z.string().default("openai/gpt-4o"),

  // Prefer a path to agent/system-prompt.md (scaffolded by `gluon-ai init`).
  // Inline strings are also supported for simple setups.
  systemPrompt: z.string().default("./agent/system-prompt.md"),

  maxOutputTokens: z.number().int().positive().default(32_768),
  maxRounds: z.number().int().positive().default(25),

  tools: z.record(z.string(), z.string()).default({}),

  actionBlocks: z.record(z.string(), z.string()).optional().default({}),

  skills: z.array(z.string()).optional().default([]),

  /**
   * Array of relative paths to `.ts` files that each export a default
   * `async function(): Promise<string>`.  Every provider is called fresh on
   * each agent request; its return value is appended to the system prompt
   * under a `## Context` section.
   *
   * Use this for dynamic runtime information (current date/time, user data,
   * environment state) that the model should always know about.
   *
   * Example provider — `./agent/context/datetime.ts`:
   *   export default async function () {
   *     return `Today is ${new Date().toDateString()}`;
   *   }
   */
  context: z.array(z.string()).optional().default([]),

  auth: z.object({
    /**
     * Auth handler for incoming requests.
     *
     * "allow" (default) — all requests pass; userId is set to "anon".
     *                     Good for single-user or development setups.
     * "deny"            — all requests are rejected with 401.
     * "./path/to/auth.ts" — path to a custom handler file that the developer
     *                     controls. The file must export a default async function:
     *
     *   export default async function(req: Request): Promise<string | boolean | null>
     *     string  → allowed; the returned string is used as the userId
     *     true    → allowed; userId is set to "anon"
     *     false   → rejected (401)
     *     null    → rejected (401)
     */
    handler: z.string().default("allow"),
  }).default({ handler: "allow" }),

  hooks: z.string().optional(),

  worker: z.boolean().default(true),
  workerConcurrency: z.number().int().positive().default(5),

  sendReasoning: z.boolean().default(false),

  /**
   * Model to use when "Think" mode is requested (sendReasoning: true).
   * Must be a reasoning-capable model, e.g. "openai/o4-mini" or "openai/o3".
   * When omitted, the main `model` is used for all modes.
   * Format: "provider/model" (see gateway catalog at https://vercel.com/docs/ai-gateway).
   */
  reasoningModel: z.string().optional(),

  suggestedPrompts: z.array(z.string()).optional().default([]),

  env: z
    .object({
      /**
       * Env var name that holds the Vercel AI Gateway API key.
       * Defaults to VERCEL_AI_GATEWAY_API_KEY.
       * Falls back to openaiApiKey if not set.
       */
      gatewayApiKey: z.string().default("VERCEL_AI_GATEWAY_API_KEY"),
      /**
       * Env var name that holds the OpenAI API key (legacy fallback).
       * Still used by provider-specific scaffolds (e.g. OpenAI web_search tool).
       */
      openaiApiKey: z.string().default("OPENAI_API_KEY"),
      databaseUrl: z.string().default("AGENT_DATABASE_URL"),
      redisUrl: z.string().default("REDIS_URL"),
    })
    .optional()
    .default({}),

  db: z
    .object({
      /**
       * Database provider for the built-in Prisma adapter.
       * Ignored when `adapter` is set.
       */
      provider: z
        .enum(["postgresql", "mysql", "sqlite", "sqlserver"])
        .default("postgresql"),

      /**
       * Path to a custom adapter module (relative to agent.config.json).
       * When set, gluon imports this file and uses its default export as the
       * `GluonDatabaseAdapter`.  The built-in Prisma client is not used.
       *
       * Example:  "./agent/db.ts"
       */
      adapter: z.string().optional(),
    })
    .optional()
    .default({}),
});

export type AgentConfigInput = z.input<typeof AgentConfigSchema>;
export type AgentConfig = z.output<typeof AgentConfigSchema>;
