import { CodeBlock } from "../components/CodeBlock";

export function Hooks() {
  return (
    <>
      <h1>Lifecycle Hooks &amp; Token Usage</h1>
      <p>
        Token counts are tracked automatically on every run. Register a hooks file to run code
        at key points in the agent lifecycle — record billing, enforce rate limits, emit
        analytics events, log to error trackers.
      </p>

      <h2>Server-side hooks</h2>
      <CodeBlock language="json" filename="gluon/agent.config.json">{`{ "hooks": "./agent/hooks.ts" }`}</CodeBlock>

      <CodeBlock language="typescript" filename="gluon/agent/hooks.ts">{`import type { TokenUsage } from "gluon-ai";

export async function onRunStart(ctx: {
  userId: string;
  chatId: string;
  runId: string;
}): Promise<void> {
  // e.g. check rate limits, emit analytics event
}

export async function onRunEnd(ctx: {
  userId: string;
  chatId: string;
  finishReason: string;
  usage: TokenUsage; // { promptTokens, completionTokens, totalTokens }
}): Promise<void> {
  // e.g. record billing, persist usage to your DB
}

export async function onRunError(ctx: {
  userId: string;
  error: Error;
}): Promise<void> {
  // e.g. log to Sentry, alert on critical failure
}`}</CodeBlock>

      <div className="callout">
        <strong>usage</strong> is summed across all tool-call rounds in the run. It reflects the
        total cost of the full agent loop, not just the final response step.
      </div>

      <h2>TokenUsage type</h2>
      <CodeBlock language="typescript">{`interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}`}</CodeBlock>

      <h2>Client-side token display</h2>
      <p>
        <code>adapter.lastRunUsage</code> holds the counts from the most recent completed run.
        Access it anywhere inside <code>AgentProvider</code>:
      </p>
      <CodeBlock language="tsx">{`"use client";
import { useAgentContext } from "gluon-ai/react";

export function TokenCounter() {
  const { adapter } = useAgentContext();
  const usage = adapter.lastRunUsage;
  if (!usage) return null;
  return (
    <p>
      Last run: {usage.totalTokens} tokens
      ({usage.promptTokens} in / {usage.completionTokens} out)
    </p>
  );
}`}</CodeBlock>
    </>
  );
}
