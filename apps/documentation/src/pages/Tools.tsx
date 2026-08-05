import { CodeBlock } from "../components/CodeBlock";
import { PropsTable } from "../components/PropsTable";

export function Tools() {
  return (
    <>
      <h1>Tools</h1>
      <p>
        Tools are TypeScript functions the agent can call at any point during a run.
        Define them with <code>defineTool</code>, register them in <code>agent.config.json</code>,
        and the agent discovers and uses them automatically.
      </p>

      <h2>Built-in tools</h2>
      <p>Three tools are always registered, regardless of config:</p>
      <table className="doc-table">
        <thead>
          <tr><th>Tool</th><th>When it fires</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>discover_tools</code></td>
            <td>Agent calls this automatically before using any custom tool for the first time to read descriptions and parameter signatures</td>
          </tr>
          <tr>
            <td><code>pause_for_input</code></td>
            <td>Called when a tool has <code>needsApproval: true</code>; pauses the run and shows a confirmation card in the UI</td>
          </tr>
          <tr>
            <td><code>load_skill</code></td>
            <td>Added automatically when <code>skills</code> is non-empty; lets the agent load a skill document on demand</td>
          </tr>
        </tbody>
      </table>

      <h2>Defining a tool</h2>
      <CodeBlock language="typescript" filename="gluon/agent/tools/myTool.ts">{`import { defineTool } from "gluon-ai";
import { z } from "zod";

export default defineTool({
  description: "Does something useful.",
  displayLabel: "My Tool",
  inputSchema: z.object({
    query: z.string().describe("The input query"),
  }),
  execute: async ({ query }) => {
    return { result: \`Processed: \${query}\` };
  },
  needsApproval: false,
  ui: {
    executingLabel: "Working…",
    completedLabel: "Done",
    icon: "Globe",
  },
});`}</CodeBlock>

      <CodeBlock language="json" filename="gluon/agent.config.json">{`{
  "tools": { "my_tool": "./agent/tools/myTool.ts" }
}`}</CodeBlock>

      <h2>defineTool fields</h2>
      <PropsTable rows={[
        { name: "description", required: true, description: "Shown to the model; describe what the tool does and when to use it." },
        { name: "inputSchema", required: true, type: "z.ZodTypeAny", description: "Zod schema; the model must match it; used for TypeScript types in execute." },
        { name: "execute", required: true, type: "async (input) => unknown", description: "Called with the validated input when the agent decides to invoke the tool." },
        { name: "displayLabel", required: false, description: 'Short human-readable name shown in the UI (e.g. "Web Search").' },
        { name: "needsApproval", required: false, type: "boolean | (input) => boolean", description: "Pause before executing and show a confirmation card in the UI." },
        { name: "ui.executingLabel", required: false, description: "ThoughtWindow text while the tool is running." },
        { name: "ui.completedLabel", required: false, description: "ThoughtWindow text after the tool finishes." },
        { name: "ui.icon", required: false, description: "Lucide icon name for the ThoughtWindow row (e.g. Globe, FileText). Defaults to Settings." },
      ]} />

      <h2>Human approval</h2>
      <p>
        Set <code>needsApproval: true</code> (or a function) to pause the run before the tool
        executes. The user sees a confirmation card in the chat; if they approve, the tool runs;
        if they reject, the run stops.
      </p>
      <CodeBlock language="typescript">{`// Approve only for destructive-looking queries
needsApproval: ({ query }) => query.toLowerCase().includes("delete"),`}</CodeBlock>

      <div className="callout">
        The <code>pause_for_input</code> built-in tool handles the pause/resume handshake
        automatically. No UI wiring needed beyond rendering <code>ChatMessageList</code>, which
        includes <code>ConfirmationBlock</code>.
      </div>

      <h2>CLI scaffolding</h2>
      <CodeBlock language="bash">{`npx gluon-ai add-tool my_tool
# → writes gluon/agent/tools/my_tool.ts and adds it to agent.config.json`}</CodeBlock>

      <div className="callout">
        <strong>Note:</strong> <code>add-tool</code> looks for <code>agent.config.json</code> in
        the current working directory. Run it from inside <code>gluon/</code> or use a flat layout
        where config is at the project root.
      </div>

      <h2>Data access patterns</h2>
      <p>Tools run inside the Gluon process, not inside your host app. Two patterns cover all cases:</p>

      <h3>Pattern 1 — Shared database URL</h3>
      <p>Point <code>AGENT_DATABASE_URL</code> at the same database your host app uses. Tools connect directly:</p>
      <CodeBlock language="typescript" filename="gluon/agent/tools/readUser.ts">{`import { defineTool } from "gluon-ai";
import { z } from "zod";
import postgres from "postgres"; // install in gluon/agent/package.json

const sql = postgres(process.env.AGENT_DATABASE_URL!);

export default defineTool({
  description: "Look up a user by email",
  inputSchema: z.object({ email: z.string() }),
  execute: async ({ email }) => {
    return sql\`SELECT id, name FROM users WHERE email = \${email}\`;
  },
});`}</CodeBlock>

      <h3>Pattern 2 — HTTP to host app's internal API</h3>
      <p>Call an internal endpoint on the host app. In sidecar mode this is <code>http://myapp:3000</code> — a Docker network call (~0.5 ms):</p>
      <CodeBlock language="typescript" filename="gluon/agent/tools/createPost.ts">{`export default defineTool({
  description: "Create a blog post on behalf of the user",
  inputSchema: z.object({ title: z.string(), body: z.string() }),
  execute: async ({ title, body }, { userId }) => {
    const res = await fetch("http://myapp:3000/api/internal/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": process.env.INTERNAL_TOKEN!,
      },
      body: JSON.stringify({ title, body, userId }),
    });
    return res.json();
  },
});`}</CodeBlock>

      <h2>Latency comparison</h2>
      <table className="doc-table">
        <thead>
          <tr><th>Access pattern</th><th>Sidecar container</th><th>Standalone container</th></tr>
        </thead>
        <tbody>
          <tr><td>DB query in tool</td><td>~0.5 ms</td><td>~5–50 ms</td></tr>
          <tr><td>Host app API in tool</td><td>~0.5 ms</td><td>~5–50 ms</td></tr>
          <tr><td>LLM API call</td><td>same</td><td>same</td></tr>
        </tbody>
      </table>
    </>
  );
}
