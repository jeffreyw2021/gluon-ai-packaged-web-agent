import { CodeBlock } from "../components/CodeBlock";

export function Auth() {
  return (
    <>
      <h1>Auth</h1>
      <p>
        All requests are allowed without a check by default and attributed to the user ID{" "}
        <code>"anon"</code>. This is fine for local development, internal tools, or single-user
        demos. Add an auth gate when you need per-user chat history or access control.
      </p>

      <h2>Default behaviour</h2>
      <table className="doc-table">
        <thead>
          <tr><th>handler value</th><th>Effect</th></tr>
        </thead>
        <tbody>
          <tr><td><code>"allow"</code> (default)</td><td>All requests pass; userId is set to <code>"anon"</code></td></tr>
          <tr><td><code>"deny"</code></td><td>All requests are rejected with HTTP 401</td></tr>
          <tr><td>path string</td><td>Imports the file as a custom handler (see below)</td></tr>
        </tbody>
      </table>

      <h2>Adding an auth gate</h2>
      <CodeBlock language="json" filename="gluon/agent.config.json">{`{
  "auth": { "handler": "./agent/auth.ts" }
}`}</CodeBlock>

      <p>The handler file must default-export an async function receiving the raw <code>Request</code>:</p>
      <table className="doc-table">
        <thead>
          <tr><th>Return value</th><th>Effect</th></tr>
        </thead>
        <tbody>
          <tr><td><code>string</code> (non-empty)</td><td>Request is allowed; the string is used as the userId</td></tr>
          <tr><td><code>true</code></td><td>Request is allowed as the anonymous user <code>"anon"</code></td></tr>
          <tr><td><code>false</code> or <code>null</code></td><td>Request is rejected with HTTP 401</td></tr>
        </tbody>
      </table>

      <h2>Example — NextAuth v5</h2>
      <CodeBlock language="typescript" filename="gluon/agent/auth.ts">{`import { auth } from "@/auth"; // NextAuth v5

export default async function (req: Request): Promise<string | boolean | null> {
  const session = await auth();
  return session?.user?.id ?? null;
  // → returns the user's ID when signed in, null (→ 401) when not
}`}</CodeBlock>

      <h2>What the userId controls</h2>
      <ul>
        <li><strong>Scopes all chat sessions</strong> to that userId. Users only see their own chat history.</li>
        <li><strong>Scopes all run records</strong> to that userId. Billing, rate-limiting, and logs are per-user.</li>
        <li>Passed to <strong>lifecycle hooks</strong> (<code>onRunStart</code>, <code>onRunEnd</code>, <code>onRunError</code>) so you can record usage or enforce rate limits per user.</li>
      </ul>

      <h2>Role-based access</h2>
      <CodeBlock language="typescript" filename="gluon/agent/auth.ts">{`import { auth } from "@/auth";

export default async function (req: Request) {
  const session = await auth();
  if (!session?.user) return null;           // not signed in → 401
  if (session.user.role !== "admin") return null; // not admin → 401
  return session.user.id;                    // admin → allow, scoped to ID
}`}</CodeBlock>

      <div className="callout">
        <strong>Note:</strong> The auth handler runs inside the Gluon process. If it imports
        from your host app (e.g. <code>@/auth</code>), make sure those modules are accessible
        from within the <code>gluon/</code> directory or configure path aliases in{" "}
        <code>gluon/agent/package.json</code>.
      </div>
    </>
  );
}
