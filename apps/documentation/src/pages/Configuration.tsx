import { CodeBlock } from "../components/CodeBlock";
import { PropsTable } from "../components/PropsTable";

export function Configuration() {
  return (
    <>
      <h1>Configuration</h1>
      <p>
        All agent behaviour is driven by <code>gluon/agent.config.json</code>.
        The full JSON Schema lives at <code>packages/core/agent.config.schema.json</code>;
        the TypeScript source of truth is <code>AgentConfigSchema</code> in
        <code>src/config/schema.ts</code>.
      </p>

      <h2>Full example</h2>
      <CodeBlock language="json" filename="gluon/agent.config.json">{`{
  "model": "openai/gpt-4o-mini",
  "systemPrompt": "./agent/system-prompt.md",
  "maxOutputTokens": 16384,
  "maxRounds": 25,
  "tools": {
    "web_search": "./agent/tools/webSearch.ts"
  },
  "actionBlocks": {},
  "skills": [],
  "context": ["./agent/context/datetime.ts"],
  "auth": {
    "handler": "allow"
  },
  "sendReasoning": false,
  "suggestedPrompts": [
    "What's happening in the news today?",
    "Search for the latest on AI models"
  ],
  "env": {
    "openaiApiKey": "OPENAI_API_KEY",
    "databaseUrl": "AGENT_DATABASE_URL",
    "redisUrl": "REDIS_URL"
  }
}`}</CodeBlock>

      <h2>Field reference</h2>
      <PropsTable rows={[
        { name: "model", type: "string", default: "openai/o4-mini", description: "provider/model string. See AI Providers page." },
        { name: "systemPrompt", type: "string", default: "./agent/system-prompt.md", description: "Inline string or path to a .md / .txt file." },
        { name: "maxOutputTokens", type: "number", default: "32768", description: "Maximum tokens the model may emit per turn." },
        { name: "maxRounds", type: "number", default: "25", description: "Maximum tool-call rounds before the loop stops." },
        { name: "tools", type: "Record<string, string>", default: "{}", description: "name → relative path to a defineTool() module." },
        { name: "actionBlocks", type: "Record<string, string>", default: "{}", description: "name → React component path for in-stream UI cards." },
        { name: "skills", type: "string[]", default: "[]", description: "Markdown paths the agent can load on demand via load_skill." },
        { name: "context", type: "string[]", default: "[]", description: "Async () => string providers called fresh on every request." },
        { name: "auth.handler", type: "string", default: '"allow"', description: '"allow" | "deny" | relative path to custom auth module.' },
        { name: "hooks", type: "string", required: false, description: "Path to a hooks module exporting onRunStart / onRunEnd / onRunError." },
        { name: "sendReasoning", type: "boolean", default: "true", description: "Stream thinking tokens from reasoning-capable models." },
        { name: "suggestedPrompts", type: "string[]", default: "[]", description: "Empty-state prompt chips, also served from GET …/config." },
        { name: "env.*", type: "string", description: "Remap env var names if yours differ from the defaults." },
        { name: "db.provider", type: "string", default: "postgresql", description: "postgresql | mysql | sqlite | sqlserver (built-in Prisma)." },
        { name: "db.adapter", type: "string", required: false, description: "Path to a custom GluonDatabaseAdapter module." },
        { name: "contextWindow.tokenBudget", type: "number", required: false, description: "Token budget before context compression kicks in. Inferred per model if unset." },
        { name: "contextWindow.summaryModel", type: "string", required: false, description: "Model used to produce the summary. Defaults to main model." },
        { name: "workerConcurrency", type: "number", default: "5", description: "BullMQ worker concurrency. Also overridden by AGENT_WORKER_CONCURRENCY env var." },
      ]} />

      <h2>Config resolution order</h2>
      <p>At startup, <code>loadConfig()</code> looks for the config file in this order:</p>
      <ol>
        <li><code>AGENT_CONFIG_PATH</code> env var (if set)</li>
        <li><code>./agent.config.json</code> in cwd (Docker / flat layout)</li>
        <li><code>./gluon/agent.config.json</code> in cwd (Node.js mode default)</li>
      </ol>

      <h2>Context window compression</h2>
      <p>
        When the estimated token count of the conversation exceeds <code>tokenBudget</code>, old
        messages are condensed into a compact summary before the model call. The full history is
        always preserved in the database — only the slice sent to the model is compressed.
      </p>
      <CodeBlock language="json">{`{
  "contextWindow": {
    "tokenBudget": 80000,
    "summaryModel": "openai/gpt-4o-mini",
    "summaryMaxTokens": 1024,
    "minTailMessages": 8
  }
}`}</CodeBlock>

      <div className="callout">
        <strong>Default budgets:</strong> anthropic/* → 160 000 · openai/gpt-4* → 100 000 ·
        google/* → 120 000 · other → 200 000
      </div>

      <h2>Environment variables</h2>
      <table className="doc-table">
        <thead>
          <tr><th>Variable</th><th>Role</th><th>Default</th></tr>
        </thead>
        <tbody>
          {[
            ["OPENAI_API_KEY", "OpenAI provider key", "—"],
            ["ANTHROPIC_API_KEY", "Anthropic provider key", "—"],
            ["GOOGLE_GENERATIVE_AI_API_KEY", "Google provider key", "—"],
            ["AI_GATEWAY_API_KEY", "Vercel AI Gateway key; enables gateway/ models", "—"],
            ["AGENT_DATABASE_URL", "Postgres connection string", "—"],
            ["REDIS_URL", "Redis connection string", "—"],
            ["GLUON_CORS_ORIGIN", "Hono CORS allowed origin", "*"],
            ["PORT", "Gluon listen port", "3001"],
            ["AGENT_CONFIG_PATH", "Override config file path", "—"],
            ["GLUON_UPSTREAM_URL", "Next.js proxy target", "http://localhost:3001"],
            ["AGENT_WORKER_CONCURRENCY", "BullMQ concurrency", "5"],
          ].map(([v, r, d]) => (
            <tr key={v}><td><code>{v}</code></td><td>{r}</td><td>{d}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
