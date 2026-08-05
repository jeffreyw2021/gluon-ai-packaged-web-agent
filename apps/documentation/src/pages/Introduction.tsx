import { useNavigate } from "react-router-dom";

export function Introduction() {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero */}
      <div
        style={{
          marginBottom: "3rem",
          paddingBottom: "2.5rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <span className="badge badge-beta">Beta</span>
          <span style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>v0.1.0-beta</span>
        </div>

        <h1 style={{ marginBottom: "0.75rem" }}>
          Drop-in AI agent for any React app
        </h1>

        <p style={{ fontSize: "1rem", color: "var(--text-2)", maxWidth: 580, marginBottom: "1.75rem", lineHeight: 1.65 }}>
          Sometimes you want to build an AI-native product from scratch. Sometimes you just want
          an agent inside an existing product. Gluon packages the backend — chats, streaming, tools,
          a worker, Redis, a DB — so you can drop an agent into any web app and focus on the product.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/quick-start")}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "7px",
              background: "var(--accent)",
              color: "#000",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.85")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
          >
            Get Started
          </button>
          <a
            href="https://github.com/jeffreyw2021/gluon-ai-packaged-web-agent/blob/main/README.md"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "7px",
              background: "var(--surface)",
              color: "var(--text-1)",
              fontSize: "0.85rem",
              fontWeight: 500,
              border: "1px solid var(--border)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              transition: "border-color 0.12s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-2)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)")}
          >
            README on GitHub ↗
          </a>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: "1.25rem", textAlign: "center" }}>
          <a
            href="https://github.com/jeffreyw2021/gluon-ai-packaged-web-agent/blob/main/README.md"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-3)", textDecoration: "underline" }}
          >
            View the full README on GitHub
          </a>
        </p>
      </div>

      {/* Compatibility */}
      <h2>Compatibility</h2>

      <div style={{ overflowX: "auto" }}>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Any React 19+ frontend</td>
              <td>Next.js, Vite, Remix, SvelteKit, or a plain React app</td>
            </tr>
            <tr>
              <td>Docker <em style={{ color: "var(--text-3)" }}>(optional)</em></td>
              <td>Handy for local postgres/redis. Not required — <code>gluon-ai start</code> is a plain Node process</td>
            </tr>
            <tr>
              <td>PostgreSQL</td>
              <td>Bundled in the dev compose file. In production: any managed Postgres (RDS, Neon, Cloud SQL, etc.)</td>
            </tr>
            <tr>
              <td>Redis</td>
              <td>Bundled in the dev compose file. In production: any Redis-compatible service (Upstash, ElastiCache, etc.)</td>
            </tr>
            <tr>
              <td>AI provider</td>
              <td>OpenAI, Anthropic, Google, Mistral, Groq, xAI, DeepSeek, or Vercel AI Gateway</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* What Gluon gives you */}
      <h2>What Gluon gives you</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
          margin: "1rem 0 2rem",
        }}
      >
        {[
          { icon: "💬", title: "Multi-chat history", desc: "Persistent chat sessions scoped per user, stored in Postgres." },
          { icon: "⚡", title: "Real-time streaming", desc: "Text and reasoning deltas delivered over SSE with zero buffering." },
          { icon: "🔧", title: "Tool use", desc: "Define custom tools with Zod schemas, human approval, and UI hints." },
          { icon: "⚙️", title: "Background worker", desc: "BullMQ queue + worker so long agent loops never block your server." },
          { icon: "🔐", title: "Auth integration", desc: "Plug in any auth system. Chats and runs scoped per userId." },
          { icon: "🎨", title: "4-layer React UI", desc: "From drop-in panel to fully headless hooks — pick your level." },
        ].map((card) => (
          <div
            key={card.title}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{card.icon}</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-1)", marginBottom: "0.3rem" }}>{card.title}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-2)", lineHeight: 1.5 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <h2>How it works</h2>
      <p>
        Gluon runs as a standalone Hono server beside your existing app. Your frontend connects
        to it via a same-origin proxy route (auto-scaffolded by <code>init</code>). The backend
        handles all agent state — you only need to render the UI.
      </p>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "1.25rem 1.5rem",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "0.78rem",
          color: "var(--text-2)",
          lineHeight: 2,
          margin: "1rem 0 1.5rem",
          overflow: "auto",
        }}
      >
        <div><span style={{ color: "var(--text-1)" }}>Browser</span> → <span style={{ color: "var(--text-3)" }}>/api/gluon/*</span> → <span style={{ color: "var(--text-1)" }}>Next.js proxy</span></div>
        <div style={{ marginLeft: "2rem" }}>↓ <span style={{ color: "var(--text-3)" }}>GLUON_UPSTREAM_URL</span></div>
        <div><span style={{ color: "var(--accent)" }}>Gluon</span><span style={{ color: "var(--text-2)" }}> Hono :3001</span></div>
        <div style={{ marginLeft: "2rem" }}>├── <span style={{ color: "var(--text-1)" }}>REST:</span> <span style={{ color: "var(--text-3)" }}>commands · chats · thread · config</span></div>
        <div style={{ marginLeft: "2rem" }}>├── <span style={{ color: "var(--text-1)" }}>SSE:</span> <span style={{ color: "var(--text-3)" }}>events (text deltas, run status)</span></div>
        <div style={{ marginLeft: "2rem" }}>├── <span style={{ color: "var(--text-1)" }}>BullMQ worker</span> <span style={{ color: "var(--text-3)" }}>(same process)</span></div>
        <div style={{ marginLeft: "2rem" }}>├── <span style={{ color: "var(--text-1)" }}>Postgres</span> <span style={{ color: "var(--text-3)" }}>(chats + job runs)</span></div>
        <div style={{ marginLeft: "2rem" }}>└── <span style={{ color: "var(--text-1)" }}>Redis</span> <span style={{ color: "var(--text-3)" }}>(queue + live event bus)</span></div>
      </div>

      <h2>Run modes</h2>
      <p>Choose during <code>gluon-ai init</code> — you can switch later by re-running init.</p>

      <table className="doc-table">
        <thead>
          <tr>
            <th>Mode</th>
            <th>What init does</th>
            <th>How you start</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Node.js</strong> (default)</td>
            <td>Writes <code>docker-compose.infra.yml</code> (postgres + redis only) and injects <code>gluon-ai start</code> into <code>npm run dev</code></td>
            <td><code>docker compose -f gluon/docker-compose.infra.yml up -d</code> once, then <code>npm run dev</code></td>
          </tr>
          <tr>
            <td><strong>Docker</strong></td>
            <td>Writes a full <code>Dockerfile</code> + <code>docker-compose.yml</code> (Gluon + postgres + redis)</td>
            <td><code>docker compose -f gluon/docker-compose.yml up -d --build</code></td>
          </tr>
        </tbody>
      </table>

      <h2>Package exports</h2>
      <p>Everything lives in <code>gluon-ai</code>. Pick the import that matches your use case:</p>

      <table className="doc-table">
        <thead>
          <tr><th>Import</th><th>Use for</th></tr>
        </thead>
        <tbody>
          {[
            ["gluon-ai", "defineTool, shared types (ActionBlockProps, TokenUsage, …)"],
            ["gluon-ai/react", "Provider, panels, hooks, message/input primitives"],
            ["gluon-ai/app", "Hono server entry — used internally by gluon-ai start"],
            ["gluon-ai/routes", "Catch-all GET / POST / DELETE handlers (custom server)"],
            ["gluon-ai/tool", "Tool helpers / types"],
            ["gluon-ai/server", "Commands, queue, Redis, DB adapter types"],
            ["gluon-ai/instrumentation", "register() starts the worker (Next.js embedded mode)"],
            ["gluon-ai/cli", "CLI command implementations"],
          ].map(([imp, use]) => (
            <tr key={imp}>
              <td><code>{imp}</code></td>
              <td>{use}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
