import { CodeBlock } from "../components/CodeBlock";

export function Deployment() {
  return (
    <>
      <h1>Deployment</h1>
      <p>
        <code>gluon-ai start</code> is a plain Node process. Docker is optional packaging.
        Point <code>AGENT_DATABASE_URL</code> and <code>REDIS_URL</code> at managed
        Postgres/Redis, set your provider key, and keep Gluon off the public internet via
        the same-origin proxy.
      </p>

      <h2>Hosting options</h2>
      <table className="doc-table">
        <thead>
          <tr><th>Where the host app runs</th><th>How to run Gluon</th><th>Tools → host app</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Same VM / EC2</td>
            <td><code>pm2 start "gluon-ai start" --name gluon</code></td>
            <td><code>http://localhost:3000</code> (~0 ms)</td>
          </tr>
          <tr>
            <td>Docker Compose</td>
            <td>Add a <code>gluon</code> service (build: ./gluon)</td>
            <td><code>http://myapp:3000</code> (~0.5 ms)</td>
          </tr>
          <tr>
            <td>Kubernetes / ECS</td>
            <td>Sidecar in the same pod/task</td>
            <td>loopback / service name</td>
          </tr>
          <tr>
            <td>Vercel / serverless</td>
            <td>Separate container (Railway, Fly, Cloud Run)</td>
            <td>cross-service (~5–30 ms)</td>
          </tr>
        </tbody>
      </table>

      <h2>Example — sibling process on a VM</h2>
      <CodeBlock language="bash">{`pm2 start "gluon-ai start" --name gluon`}</CodeBlock>

      <h2>Example — Docker Compose sidecar</h2>
      <CodeBlock language="yaml" filename="docker-compose.yml">{`services:
  gluon:
    build: ./gluon
    expose: ["3001"]           # internal only — not published to host
    environment:
      AGENT_DATABASE_URL: postgresql://user:pass@postgres:5432/mydb
      REDIS_URL: redis://redis:6379
      GLUON_CORS_ORIGIN: http://localhost:3000
    depends_on: [postgres, redis]`}</CodeBlock>

      <h2>Example — Docker standalone</h2>
      <p>The scaffolded <code>Dockerfile</code> already handles everything:</p>
      <CodeBlock language="bash">{`docker compose -f gluon/docker-compose.yml up -d --build`}</CodeBlock>

      <h2>Production checklist</h2>
      <ul>
        <li>
          <strong>GLUON_CORS_ORIGIN</strong> — set to your frontend's origin instead of <code>*</code>
        </li>
        <li>
          <strong>Managed Postgres</strong> — RDS, Neon, Cloud SQL, Supabase, etc.
        </li>
        <li>
          <strong>Managed Redis</strong> — Upstash, ElastiCache, Redis Cloud, etc.
        </li>
        <li>
          <strong>GLUON_UPSTREAM_URL</strong> — set on your Next.js app to point at the Gluon container
        </li>
        <li>
          <strong>Keep Gluon off the internet</strong> — only expose it to your app via internal
          networking or a proxy
        </li>
        <li>
          <strong>Auth handler</strong> — configure <code>auth.handler</code> for production
          (never ship <code>"allow"</code> publicly)
        </li>
      </ul>

      <h2>Infra compose (Node.js mode)</h2>
      <p>
        In Node.js run mode, <code>init</code> creates a compose file with only postgres and
        redis:
      </p>
      <CodeBlock language="yaml" filename="gluon/docker-compose.infra.yml">{`services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: gluon
      POSTGRES_PASSWORD: gluon
      POSTGRES_DB: gluon
    ports:
      - "5433:5432"     # 5433 on host to avoid clashes with local postgres
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:8-alpine
    ports:
      - "6379:6379"     # add this if not already present
    volumes:
      - redis_data:/data

volumes:
  pg_data:
  redis_data:`}</CodeBlock>
    </>
  );
}
