import { CodeBlock } from "../components/CodeBlock";

interface CLICommandProps {
  command: string;
  flags?: string[];
  description: string;
  examples?: string[];
}

function CLICommand({ command, flags, description, examples }: CLICommandProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "1rem 1.25rem",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "0.875rem",
          color: "var(--text-1)",
          fontWeight: 600,
          marginBottom: "0.5rem",
        }}
      >
        gluon-ai {command}
      </div>
      {flags && flags.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          {flags.map((f) => (
            <code
              key={f}
              style={{
                fontSize: "0.72rem",
                background: "var(--code-bg)",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                color: "var(--text-2)",
                border: "1px solid var(--border)",
              }}
            >
              {f}
            </code>
          ))}
        </div>
      )}
      <p style={{ margin: "0 0 0.5rem", color: "var(--text-2)", fontSize: "0.85rem", lineHeight: 1.6 }}>
        {description}
      </p>
      {examples && examples.map((ex) => (
        <div
          key={ex}
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "0.78rem",
            color: "var(--text-3)",
            marginTop: "0.25rem",
          }}
        >
          $ {ex}
        </div>
      ))}
    </div>
  );
}

export function CLIReference() {
  return (
    <>
      <h1>CLI Reference</h1>
      <CodeBlock language="bash">{`npx gluon-ai <command>`}</CodeBlock>

      <CLICommand
        command="start"
        description="Boot the Hono server + BullMQ worker on PORT (default 3001). Used as CMD in the scaffolded Dockerfile; also works with pm2 on bare metal."
        examples={[
          "gluon-ai start",
          'pm2 start "gluon-ai start" --name gluon',
        ]}
      />

      <CLICommand
        command="init [dir]"
        flags={["--default / -y", "--development / --dev"]}
        description="Interactive setup: scaffold gluon/ folder with Dockerfile, docker-compose.yml, agent.config.json, and agent/ files. Prompts for provider, model, port, and run mode. Use --default to skip all prompts."
        examples={[
          "npx gluon-ai init",
          "npx gluon-ai init --default",
          "npx gluon-ai init --dev",
        ]}
      />

      <CLICommand
        command="install [dir]"
        flags={["--development / --dev"]}
        description="Run npm install inside the target directory. --development uses --install-links for local file: packages (useful when developing gluon-ai itself)."
        examples={["npx gluon-ai install"]}
      />

      <CLICommand
        command="add-tool [name]"
        description="Scaffold a new tool file at agent/tools/<name>.ts and register it in agent.config.json. Prompts for name, description, and display label."
        examples={[
          "npx gluon-ai add-tool search_docs",
          "npx gluon-ai add-tool create_post",
        ]}
      />

      <CLICommand
        command="add-skill [name]"
        description="Scaffold a new skill Markdown file at agent/skills/<name>.md and register it in agent.config.json."
        examples={[
          "npx gluon-ai add-skill how-to-format-output",
          "npx gluon-ai add-skill api-reference",
        ]}
      />

      <CLICommand
        command="uninstall [dir]"
        description="Remove all scaffolded files, undo dev script injection, and uninstall the package. Prompts for confirmation. Does NOT drop database tables."
        examples={["npx gluon-ai uninstall", "npm run gluon:uninstall"]}
      />

      <CLICommand
        command="--help / -h"
        description="Print the help text with all commands and examples."
      />

      <div className="callout">
        <strong>DB tables not dropped on uninstall.</strong> Remove them manually if needed:
        <CodeBlock language="sql">{`DROP TABLE "gluon_chat_job_run", "gluon_chat";`}</CodeBlock>
      </div>

      <h2>Health check</h2>
      <CodeBlock language="bash">{`curl http://localhost:3001/config`}</CodeBlock>
      <p>Returns JSON with <code>suggestedPrompts</code> and <code>toolUi</code> from the loaded config.</p>

      <h2>Convenience script</h2>
      <p>After <code>init</code>, this script is automatically added to your <code>package.json</code>:</p>
      <CodeBlock language="json">{`{
  "scripts": {
    "dev": "concurrently -n gluon,app -c blue,green \\"npm run gluon:start\\" \\"npm run dev:app\\"",
    "dev:app": "next dev",
    "gluon:start": "node --env-file=.env ./node_modules/.bin/gluon-ai start",
    "gluon:uninstall": "npx gluon-ai uninstall"
  }
}`}</CodeBlock>
    </>
  );
}
