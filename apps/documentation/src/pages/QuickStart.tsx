import { CodeBlock } from "../components/CodeBlock";

export function QuickStart() {
  return (
    <>
      <h1>Quick Start</h1>
      <p>Four steps to a working agent in your app.</p>

      {/* Step 1 */}
      <div className="step-item">
        <div className="step-num">1</div>
        <div className="step-body">
          <h3 style={{ marginTop: 0 }}>Install</h3>
          <CodeBlock language="bash">{`npm install gluon-ai@beta`}</CodeBlock>
          <p>
            This puts the React components (<code>gluon-ai/react</code>) into your project and
            makes the CLI available locally so the next step uses your installed version.
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="step-item">
        <div className="step-num">2</div>
        <div className="step-body">
          <h3 style={{ marginTop: 0 }}>Set env vars</h3>
          <p>Add these to your <code>.env</code> before running <code>init</code>:</p>
          <CodeBlock language="bash" filename=".env">{`OPENAI_API_KEY=sk-...              # or whichever provider key you chose
AGENT_DATABASE_URL=postgresql://gluon:gluon@localhost:5433/gluon
REDIS_URL=redis://localhost:6379
GLUON_CORS_ORIGIN=*`}</CodeBlock>
          <div className="callout">
            <strong>Note:</strong> <code>AGENT_DATABASE_URL</code> and <code>REDIS_URL</code> match
            the bundled docker-compose defaults — no changes needed if you use it as-is.
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="step-item">
        <div className="step-num">3</div>
        <div className="step-body">
          <h3 style={{ marginTop: 0 }}>Scaffold</h3>
          <CodeBlock language="bash">{`npx gluon-ai init`}</CodeBlock>
          <p>
            Creates a <code>gluon/</code> folder with <code>agent.config.json</code>, system prompt,
            tools, and context providers. Prompts you for provider, model, port, and <strong>run mode</strong>.
          </p>

          <table className="doc-table">
            <thead>
              <tr><th>Run mode</th><th>What init does</th><th>How you start</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Node.js</strong> (default)</td>
                <td>Writes <code>docker-compose.infra.yml</code> and injects <code>gluon-ai start</code> into <code>npm run dev</code></td>
                <td><code>docker compose up -d</code> once, then <code>npm run dev</code></td>
              </tr>
              <tr>
                <td><strong>Docker</strong></td>
                <td>Full <code>Dockerfile</code> + <code>docker-compose.yml</code></td>
                <td><code>docker compose up -d --build</code></td>
              </tr>
            </tbody>
          </table>

          <p>
            Skip the compose infra step if you already have Postgres and Redis running.
            Health check: <code>curl http://localhost:3001/config</code>
          </p>
        </div>
      </div>

      {/* Step 4 */}
      <div className="step-item">
        <div className="step-num">4</div>
        <div className="step-body">
          <h3 style={{ marginTop: 0 }}>Add to your frontend</h3>
          <p><code>gluon-ai</code> is already installed from Step 1:</p>

          <CodeBlock language="tsx">{`import { GluonAgentPanel } from "gluon-ai/react";

// Direct (requires GLUON_CORS_ORIGIN=* in .env):
<GluonAgentPanel basePath="http://localhost:3001" />

// Proxy through your own server (no CORS needed — recommended):
<GluonAgentPanel basePath="/api/gluon" />`}</CodeBlock>

          <p>
            That's enough for a working agent with web search, multi-chat, streaming, and the
            background worker.
          </p>
        </div>
      </div>

      {/* Same-origin proxy */}
      <h2>Same-origin proxy (recommended for production)</h2>
      <p>
        Point the frontend at <code>/api/gluon</code> instead of the container directly — this
        avoids exposing the container port to the internet and eliminates CORS configuration.
      </p>

      <h3>Next.js</h3>
      <p>
        <code>npx gluon-ai init</code> creates a streaming catch-all Route Handler automatically
        at <code>app/api/gluon/[[...path]]/route.ts</code>. It pipes <code>upstream.body</code> as
        a <code>ReadableStream</code>, so SSE text deltas stream in real time without buffering.
      </p>
      <CodeBlock language="tsx" filename="app/api/gluon/[[...path]]/route.ts">{`export const dynamic = "force-dynamic";
import { Agent } from "undici";

const UPSTREAM = process.env.GLUON_UPSTREAM_URL ?? "http://localhost:3001";
const noTimeoutAgent = new Agent({ bodyTimeout: 0 });

async function proxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\\/api\\/gluon/, "");
  const upstream = await fetch(\`\${UPSTREAM}\${pathname}\${url.search}\`, {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" ? req.body : undefined,
    duplex: "half",
    signal: req.signal,
    dispatcher: noTimeoutAgent,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

export { proxy as GET, proxy as POST, proxy as DELETE };`}</CodeBlock>

      <h3>Vite</h3>
      <CodeBlock language="typescript" filename="vite.config.ts">{`server: {
  proxy: {
    "/api/gluon": { target: "http://localhost:3001", changeOrigin: true }
  }
}`}</CodeBlock>

      <h3>Then use basePath</h3>
      <CodeBlock language="tsx">{`<GluonAgentPanel basePath="/api/gluon" />`}</CodeBlock>
    </>
  );
}
