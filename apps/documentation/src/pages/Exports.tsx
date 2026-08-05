import { CodeBlock } from "../components/CodeBlock";

export function Exports() {
  return (
    <>
      <h1>Package Exports</h1>
      <p>
        Everything is shipped in a single npm package (<code>gluon-ai</code>) with multiple
        named export surfaces. Import only what you need.
      </p>

      <table className="doc-table">
        <thead>
          <tr><th>Import</th><th>Use for</th><th>Format</th></tr>
        </thead>
        <tbody>
          {[
            ["gluon-ai", "defineTool, shared types (ActionBlockProps, TokenUsage, …)", "ESM + CJS"],
            ["gluon-ai/react", "Provider, panels, hooks, message/input primitives", "ESM + CJS"],
            ["gluon-ai/app", "Hono server entry — used internally by gluon-ai start", "CJS"],
            ["gluon-ai/routes", "Catch-all GET / POST / DELETE handlers (custom server)", "CJS"],
            ["gluon-ai/tool", "Tool helpers / types", "ESM + CJS"],
            ["gluon-ai/server", "Commands, queue, Redis, DB adapter types", "CJS"],
            ["gluon-ai/instrumentation", "register() starts the worker (Next.js embedded mode)", "ESM + CJS"],
            ["gluon-ai/cli", "CLI command implementations", "CJS"],
          ].map(([imp, use, fmt]) => (
            <tr key={imp}>
              <td><code>{imp}</code></td>
              <td>{use}</td>
              <td style={{ color: "var(--text-3)", fontSize: "0.75rem" }}>{fmt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>API route segments</h2>
      <p>The catch-all route handler dispatches by the last URL path segment:</p>
      <table className="doc-table">
        <thead>
          <tr><th>Segment</th><th>Methods</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          {[
            ["events", "GET", "SSE stream — text deltas, run phase, tool updates"],
            ["thread", "GET", "Load chat messages + active run ID"],
            ["chats", "GET / POST / DELETE", "List, create, and delete chat sessions"],
            ["commands", "POST", "send | stop | toolApproval | clientToolOutput | summarize"],
            ["config", "GET", "Serve suggestedPrompts and toolUi for the frontend"],
          ].map(([seg, methods, purpose]) => (
            <tr key={seg}>
              <td><code>{seg}</code></td>
              <td><code>{methods}</code></td>
              <td>{purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Command types (POST /commands)</h2>
      <table className="doc-table">
        <thead>
          <tr><th>type</th><th>Required fields</th><th>Effect</th></tr>
        </thead>
        <tbody>
          {[
            ["send", "chatId, clientMessageId, message", "Enqueue a new agent run"],
            ["stop", "chatId", "Cancel the active run"],
            ["toolApproval", "chatId, runId, approvalId, approved", "Approve or reject a paused tool call"],
            ["clientToolOutput", "chatId, runId, toolCallId, output", "Supply tool output from the client"],
            ["summarize", "chatId", "On-demand context summarization"],
          ].map(([type, fields, effect]) => (
            <tr key={type}>
              <td><code>{type}</code></td>
              <td style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem" }}>{fields}</td>
              <td>{effect}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Embedding routes in a custom server</h2>
      <CodeBlock language="typescript">{`import { GET, POST, DELETE } from "gluon-ai/routes";
export const dynamic = "force-dynamic";
export { GET, POST, DELETE };`}</CodeBlock>

      <h2>Starting the worker embedded in Next.js</h2>
      <CodeBlock language="typescript" filename="instrumentation.ts">{`export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("gluon-ai/instrumentation").then((m) => m.register());
  }
}`}</CodeBlock>
    </>
  );
}
