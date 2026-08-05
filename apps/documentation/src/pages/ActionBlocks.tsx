import { CodeBlock } from "../components/CodeBlock";
import { PropsTable } from "../components/PropsTable";

export function ActionBlocks() {
  return (
    <>
      <h1>Action Blocks</h1>
      <p>
        An action block is a React component that replaces the default tool-row in the chat
        stream for a specific tool. By default, tool calls show a text row in the ThoughtWindow.
        Register an action block to render a full UI card — a map, a data table, a preview —
        inside the message thread instead.
      </p>

      <h2>Default behaviour</h2>
      <p>
        Tool invocations appear as collapsible rows in the ThoughtWindow using{" "}
        <code>ui.executingLabel</code> / <code>ui.completedLabel</code>. No custom UI components
        are loaded.
      </p>

      <h2>Defining an action block</h2>
      <CodeBlock language="tsx" filename="gluon/agent/blocks/MyToolBlock.tsx">{`"use client";
import type { ActionBlockProps } from "gluon-ai";

export default function MyToolBlock({
  toolInput,
  toolOutput,
  state,
}: ActionBlockProps) {
  const isRunning = state === "call";
  if (isRunning) return <div>Running…</div>;
  return <div>Result: {JSON.stringify(toolOutput)}</div>;
}`}</CodeBlock>

      <CodeBlock language="json" filename="gluon/agent.config.json">{`{
  "actionBlocks": { "my_tool": "./agent/blocks/MyToolBlock.tsx" }
}`}</CodeBlock>

      <h2>ActionBlockProps</h2>
      <PropsTable rows={[
        { name: "toolInput", type: "unknown", description: "The validated input the agent passed to the tool." },
        { name: "toolOutput", type: "unknown", description: "The value returned by execute (undefined while the tool is still running)." },
        { name: "toolName", type: "string", description: 'The registered tool name (e.g. "my_tool").' },
        { name: "messageId", type: "string", description: "ID of the assistant message this block belongs to." },
        { name: 'state', type: '"call" | "result" | "partial-call"', description: "State of the tool invocation." },
      ]} />

      <h2>Wiring the component to the client</h2>
      <p>
        The config path is used for server-side loading only. The client bundle can't load
        TypeScript paths at runtime, so you must pass the imported component explicitly:
      </p>
      <CodeBlock language="tsx">{`import MyToolBlock from "@/agent/blocks/MyToolBlock";

// Drop-in panel:
<GluonAgentPanel actionBlocks={{ my_tool: MyToolBlock }} />

// Or via AgentProvider directly:
<AgentProvider actionBlocks={{ my_tool: MyToolBlock }}>…</AgentProvider>`}</CodeBlock>
    </>
  );
}
