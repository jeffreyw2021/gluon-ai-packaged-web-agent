import { CodeBlock } from "../components/CodeBlock";

export function ContextProviders() {
  return (
    <>
      <h1>Context Providers</h1>
      <p>
        A context provider is a plain async function that returns a string. Gluon calls every
        registered provider fresh on every agent request and appends the results to the system
        prompt under a <code>## Context</code> block. The agent always sees current values — no
        stale cache.
      </p>

      <h2>Default behaviour</h2>
      <p>
        <code>npx gluon-ai init</code> scaffolds <code>agent/context/datetime.ts</code> which
        returns the current date and time. This keeps the agent temporally grounded without
        hardcoding anything in the system prompt.
      </p>

      <h2>Defining a context provider</h2>
      <CodeBlock language="typescript" filename="gluon/agent/context/datetime.ts">{`export default async function (): Promise<string> {
  return \`Current date and time: \${new Date().toLocaleString()}\`;
}`}</CodeBlock>

      <CodeBlock language="json" filename="gluon/agent.config.json">{`{
  "context": ["./agent/context/datetime.ts"]
}`}</CodeBlock>

      <p>
        The returned string is appended verbatim under <code>## Context</code> in the system
        prompt. Keep it short — it costs tokens on every request.
      </p>

      <h2>Multiple providers</h2>
      <CodeBlock language="json">{`{
  "context": [
    "./agent/context/datetime.ts",
    "./agent/context/userProfile.ts",
    "./agent/context/featureFlags.ts"
  ]
}`}</CodeBlock>

      <h2>Accessing external data</h2>
      <CodeBlock language="typescript" filename="gluon/agent/context/userProfile.ts">{`import { db } from "@/lib/db";

export default async function (): Promise<string> {
  const user = await db.user.findFirst({
    where: { email: process.env.DEV_USER_EMAIL },
  });
  return user
    ? \`Active user: \${user.name} (\${user.plan} plan)\`
    : "No user context available.";
}`}</CodeBlock>

      <div className="callout">
        <strong>Note:</strong> Context providers receive no request arguments and have no access
        to the calling user's session. For per-user dynamic context, use hooks or access user
        information through environment variables or a shared server-side session store.
      </div>
    </>
  );
}
