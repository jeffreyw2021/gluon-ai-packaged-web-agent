import { z } from "zod";

export const AgentConfigSchema = z.object({
  model: z.string().default("gpt-4o"),

  systemPrompt: z.string().default("You are a helpful assistant."),

  maxOutputTokens: z.number().int().positive().default(32_768),
  maxRounds: z.number().int().positive().default(25),

  tools: z.record(z.string(), z.string()).default({}),

  actionBlocks: z.record(z.string(), z.string()).optional().default({}),

  skills: z.array(z.string()).optional().default([]),

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

  suggestedPrompts: z.array(z.string()).optional().default([]),

  env: z
    .object({
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
