import { z } from "zod";

export const AgentConfigSchema = z.object({
  model: z.string().default("openai/o4-mini"),

  // Prefer a path to agent/system-prompt.md (scaffolded by `gluon-ai init`).
  // Inline strings are also supported for simple setups.
  systemPrompt: z.string().default("./agent/system-prompt.md"),

  maxOutputTokens: z.number().int().positive().default(32_768),
  maxRounds: z.number().int().positive().default(25),

  /**
   * Controls automatic context window compression. When the estimated token
   * count of the conversation exceeds `tokenBudget`, old messages are
   * condensed into a compact summary before the model call. The full history
   * is always preserved in the database — only the slice sent to the model
   * is compressed. A system message is injected into the thread once to mark
   * where the compression boundary is, visible in the UI.
   */
  contextWindow: z
    .object({
      /**
       * Token budget for the conversation sent to the model. If unset, a
       * default is inferred from the model name:
       *   anthropic/*   → 160 000
       *   openai/gpt-4* → 100 000
       *   google/*      → 120 000
       *   (other)       → 200 000
       */
      tokenBudget: z.number().int().positive().optional(),
      /**
       * Model used to produce the summary. Defaults to the main agent model.
       * Prefer a cheap/fast model (e.g. "openai/gpt-4o-mini") to keep costs low.
       */
      summaryModel: z.string().optional(),
      /** Max output tokens for the summary call. Default: 1024. */
      summaryMaxTokens: z.number().int().positive().default(1024),
      /** Keep at least this many recent messages unsummarized. Default: 8. */
      minTailMessages: z.number().int().positive().default(8),
    })
    .optional()
    .default({}),

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

  sendReasoning: z.boolean().default(true),

  suggestedPrompts: z.array(z.string()).optional().default([]),

  env: z
    .object({
      openaiApiKey: z.string().default("OPENAI_API_KEY"),
      anthropicApiKey: z.string().default("ANTHROPIC_API_KEY"),
      googleApiKey: z.string().default("GOOGLE_GENERATIVE_AI_API_KEY"),
      mistralApiKey: z.string().default("MISTRAL_API_KEY"),
      groqApiKey: z.string().default("GROQ_API_KEY"),
      xaiApiKey: z.string().default("XAI_API_KEY"),
      deepseekApiKey: z.string().default("DEEPSEEK_API_KEY"),
      aiGatewayApiKey: z.string().default("AI_GATEWAY_API_KEY"),
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
