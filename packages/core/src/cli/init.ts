import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { execSync } from "node:child_process";
import { reinstallLocalDepsWithLinks } from "./install";

// ── Helpers ────────────────────────────────────────────────────────────────

function exists(p: string) {
  return fs.existsSync(p);
}

function read(p: string) {
  return fs.readFileSync(p, "utf-8");
}

function write(p: string, content: string, { overwrite = false } = {}) {
  if (exists(p) && !overwrite) {
    log("skip", p);
    return false;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf-8");
  log("write", p);
  return true;
}

function log(verb: "skip" | "write" | "append" | "info" | "warn", msg: string) {
  const icons: Record<string, string> = {
    skip: "  ⏭  skip  ",
    write: "  ✅ wrote ",
    append: "  ➕ appended to ",
    info: "  ℹ️  ",
    warn: "  ⚠️  ",
  };
  console.log((icons[verb] ?? "  ") + msg);
}

// ── Project scanner ────────────────────────────────────────────────────────

type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

interface ScanResult {
  root: string;
  packageManager: PackageManager;
  /** Detected host framework for printing the proxy snippet */
  hostFramework: "nextjs" | "vite" | "remix" | "sveltekit" | null;
  /** Whether gluon/ folder already exists */
  alreadyInitialized: boolean;
}

function scanProject(root: string): ScanResult {
  let packageManager: PackageManager = "npm";
  const pkgPath = path.join(root, "package.json");
  if (exists(pkgPath)) {
    const pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
    if (typeof pkg.packageManager === "string") {
      const pm = pkg.packageManager;
      if (pm.startsWith("pnpm")) packageManager = "pnpm";
      else if (pm.startsWith("yarn")) packageManager = "yarn";
      else if (pm.startsWith("bun")) packageManager = "bun";
    }
  }
  if (exists(path.join(root, "pnpm-workspace.yaml"))) packageManager = "pnpm";
  if (exists(path.join(root, "yarn.lock"))) packageManager = "yarn";
  if (exists(path.join(root, "bun.lockb"))) packageManager = "bun";

  // Detect host framework for proxy snippet
  let hostFramework: ScanResult["hostFramework"] = null;
  if (
    exists(path.join(root, "next.config.ts")) ||
    exists(path.join(root, "next.config.js")) ||
    exists(path.join(root, "next.config.mjs"))
  ) {
    hostFramework = "nextjs";
  } else if (
    exists(path.join(root, "vite.config.ts")) ||
    exists(path.join(root, "vite.config.js"))
  ) {
    hostFramework = "vite";
  } else if (
    exists(path.join(root, "remix.config.js")) ||
    exists(path.join(root, "remix.config.ts"))
  ) {
    hostFramework = "remix";
  } else if (exists(path.join(root, "svelte.config.js"))) {
    hostFramework = "sveltekit";
  }

  return {
    root,
    packageManager,
    hostFramework,
    alreadyInitialized: exists(path.join(root, "gluon")),
  };
}

// ── AI provider definitions ────────────────────────────────────────────────

const PROVIDERS = [
  {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    configKey: "openaiApiKey",
    // o4-mini uses the Responses API and requires reasoning items on multi-turn
    // calls, which gluon-ai's message history doesn't store. Use gpt-4o-mini
    // (Chat Completions API) which works correctly across all conversation rounds.
    defaultModel: "openai/gpt-4o-mini",
    sdkPackage: "@ai-sdk/openai",
    // @ai-sdk/openai@4+ switched to Responses-API spec v4, which is incompatible
    // with the ai@6.x (AI SDK 5) bundled inside gluon-ai. Pin to ^3.
    sdkVersion: "3",
  },
  {
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    configKey: "anthropicApiKey",
    defaultModel: "anthropic/claude-sonnet-4-5",
    sdkPackage: "@ai-sdk/anthropic",
    sdkVersion: "4",
  },
  {
    label: "Google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    configKey: "googleApiKey",
    defaultModel: "google/gemini-2.0-flash",
    sdkPackage: "@ai-sdk/google",
    sdkVersion: "4",
  },
  {
    label: "Other / configure manually",
    envKey: "",
    configKey: "",
    defaultModel: "openai/o4-mini",
    sdkPackage: "",
    sdkVersion: "",
  },
] as const;

interface Answers {
  providerIndex: number;
  model: string;
  port: number;
}

// ── Interactive prompts ────────────────────────────────────────────────────

async function askQuestions(
  scan: ScanResult,
  useDefaults: boolean,
): Promise<Answers> {
  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  gluon-ai — setup");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  if (scan.alreadyInitialized) {
    console.log(
      "  ⚠️  gluon/ folder already exists. Re-running init will\n" +
        "      skip existing files and only add what's missing.\n",
    );
  }

  console.log(`  Detected: package manager ${scan.packageManager}\n`);

  const defaults: Answers = { providerIndex: 0, model: "openai/gpt-4o-mini", port: 3001 };

  if (useDefaults) {
    console.log("  Using all defaults (--default flag set):\n");
    console.log(`    AI provider : ${PROVIDERS[defaults.providerIndex].label}`);
    console.log(`    Model       : ${defaults.model}`);
    console.log(`    Port        : ${defaults.port}\n`);
    return defaults;
  }

  const rl = readline.createInterface({ input, output });

  function prompt(question: string, defaultVal: string): Promise<string> {
    return rl
      .question(`  ${question} [${defaultVal}]: `)
      .then((ans) => ans.trim() || defaultVal);
  }

  // Provider selection
  console.log("  Which AI provider will you use?");
  PROVIDERS.forEach((p, i) => {
    const envNote = p.envKey ? `  (${p.envKey})` : "";
    console.log(`    ${i + 1}  ${p.label}${envNote}`);
  });
  const providerChoice = await prompt("Choice", "1");
  const providerIndex = Math.max(
    0,
    Math.min(PROVIDERS.length - 1, parseInt(providerChoice, 10) - 1 || 0),
  );

  const defaultModel = PROVIDERS[providerIndex].defaultModel;
  const model = await prompt("Model", defaultModel);

  const portStr = await prompt("Gluon container port", "3001");
  const port = parseInt(portStr, 10) || 3001;

  rl.close();

  return { providerIndex, model, port };
}

// ── File templates ─────────────────────────────────────────────────────────

function agentConfigTemplate(answers: Answers): string {
  const provider = PROVIDERS[answers.providerIndex];
  const envBlock: Record<string, string> = {
    databaseUrl: "AGENT_DATABASE_URL",
    redisUrl: "REDIS_URL",
  };
  if (provider.configKey && provider.envKey) {
    envBlock[provider.configKey] = provider.envKey;
  }

  const cfg = {
    model: answers.model,
    systemPrompt: "./agent/system-prompt.md",
    maxOutputTokens: 16384,
    maxRounds: 25,
    tools: {
      web_search: "./agent/tools/webSearch.ts",
    },
    actionBlocks: {},
    skills: [],
    context: ["./agent/context/datetime.ts"],
    auth: {
      handler: "allow",
    },
    sendReasoning: false,
    suggestedPrompts: [
      "What's happening in the news today?",
      "Search for the latest on AI models",
      "Summarize recent developments in technology",
    ],
    env: envBlock,
  };

  return JSON.stringify(cfg, null, 2);
}

function dockerfileTemplate(sdkPackage?: string, sdkVersion?: string): string {
  const versionedSdkPkg = sdkPackage && sdkVersion ? `${sdkPackage}@${sdkVersion}` : sdkPackage;
  const globalPkgs = ["gluon-ai@beta", "tsx", "prisma@6", versionedSdkPkg].filter(Boolean).join(" ");
  return `FROM node:24-slim

# Prisma's query engine binary requires OpenSSL at runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install gluon-ai + tsx + prisma@6 + the chosen AI provider SDK globally.
# Pinning prisma@6 matches gluon-ai's schema format — Prisma 7 changed the
# datasource schema syntax and is not compatible with the bundled schema.prisma.
# The provider SDK (e.g. @ai-sdk/openai) must be globally installed so the
# worker process can require() it from the gluon-ai global package location.
RUN npm install -g ${globalPkgs}

# Generate the Prisma client for this platform (Linux/amd64 binaries).
# Must run after the global install so the correct schema.prisma is in place.
RUN AGENT_DATABASE_URL=postgresql://placeholder:5432/agent \\
    prisma generate \\
    --schema /usr/local/lib/node_modules/gluon-ai/prisma/schema.prisma

WORKDIR /app
COPY agent.config.json .
COPY agent/ ./agent/

ENV AGENT_CONFIG_PATH=/app/agent.config.json
ENV NODE_ENV=production

# Install gluon-ai and its full transitive deps (zod, ai, etc.) into
# /app/agent/node_modules so ESM imports in tool/context files resolve.
# npm reuses the cache from the global install above, so this is fast.
RUN cd /app/agent && npm install --no-audit --no-fund

EXPOSE 3001
CMD ["gluon-ai", "start"]
`;
}

function dockerComposeTemplate(port: number): string {
  return `# Gluon agent stack — postgres + redis included
# Run: docker compose -f gluon/docker-compose.yml up -d
services:
  gluon:
    build: .
    ports:
      - "\${PORT:-${port}}:3001"
    env_file:
      - ../.env
    environment:
      AGENT_DATABASE_URL: postgresql://gluon:gluon@postgres:5432/gluon
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: gluon
      POSTGRES_PASSWORD: gluon
      POSTGRES_DB: gluon
    ports:
      - "5433:5432"          # 5433 on host to avoid clashes with local postgres
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gluon"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:8-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  pg_data:
  redis_data:
`;
}

function agentPackageJsonTemplate(sdkPackage?: string, sdkVersion?: string): string {
  const deps: Record<string, string> = { "gluon-ai": "beta" };
  if (sdkPackage) deps[sdkPackage] = sdkVersion ?? "latest";
  return `${JSON.stringify(
    { name: "gluon-agent", private: true, type: "module", dependencies: deps },
    null,
    2,
  )}\n`;
}

function systemPromptTemplate(): string {
  return `# Role

You are a capable AI assistant embedded in a web application. Help the user accomplish their goals clearly, accurately, and efficiently.

# How you work

- Prefer concrete, actionable answers over vague advice.
- When information may be outdated or time-sensitive, use available tools (such as web search) rather than guessing from memory.
- Treat any injected **Context** block as ground truth for this request (e.g. current date/time or app state). Use it; do not contradict it.
- For multi-step work: state a brief plan, execute, then summarize what you did and what the user should know next.
- If the request is ambiguous in a way that would change the outcome, ask one focused clarifying question instead of assuming.

# Communication

- Be concise by default; go deeper when the task needs it or the user asks.
- Prefer short paragraphs and lists over long walls of text.
- When you use tool or search results, cite sources (titles/URLs) when they are available.
- If you cannot do something, a tool fails, or you lack access, say so plainly and suggest a practical next step.

# Integrity

- Never invent tool results, URLs, citations, or data you did not receive.
- Do not claim access to systems, accounts, or private data you do not have.
- Distinguish clearly between what you know, what you inferred, and what came from a tool.
`;
}

function datetimeContextTemplate(): string {
  return `// Context provider — injects the current date/time into the agent's system prompt.
// Called fresh on every request so the value is always up to date.
//
// To add more context providers:
//   1. Create a new .ts file in agent/context/ that exports a default async function.
//   2. Add its path to the "context" array in agent.config.json.
//
// The return value is appended under a "## Context" section in the system prompt.

export default async function (): Promise<string> {
  const now = new Date();
  return \`Current date and time: \${now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  })}\`;
}
`;
}

function webSearchToolTemplate(): string {
  return `import { defineTool } from "gluon-ai";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// ── Web search — OpenAI built-in web search ───────────────────────────────
// Uses OpenAI's native web_search tool via the Responses API.
// No extra API key needed — uses the same OPENAI_API_KEY as the agent.

export default defineTool({
  description:
    "Search the web for current, real-time information. Use for recent news, " +
    "current events, prices, or anything that may have changed since your training cutoff.",
  inputSchema: z.object({
    query: z.string().describe("The search query — be specific."),
  }),
  execute: async ({ query }) => {
    const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { text, sources } = await generateText({
      model: provider.responses("gpt-4o-mini"),
      tools: { web_search: provider.tools.webSearch() },
      prompt: query,
    });
    return {
      summary: text,
      citations: (sources ?? []).map((s) => ({ title: s.title ?? "", url: s.url })),
    };
  },
});
`;
}

function envExampleTemplate(answers: Answers): string {
  const provider = PROVIDERS[answers.providerIndex];
  const keyLine = provider.envKey
    ? `${provider.envKey}=                           # ← fill this in`
    : `# Add your AI provider key here (e.g. OPENAI_API_KEY=sk-...)`;

  return `# Gluon environment — copy to .env and fill in your API key
# Generated by: npx gluon-ai init

${keyLine}

# Postgres + Redis are provided by docker-compose.yml — no changes needed below
AGENT_DATABASE_URL=postgresql://gluon:gluon@localhost:5433/gluon
REDIS_URL=redis://localhost:6379

# Lock down in production (e.g. GLUON_CORS_ORIGIN=https://myapp.com)
GLUON_CORS_ORIGIN=*
`;
}

// ── Proxy auto-patcher ─────────────────────────────────────────────────────

/**
 * Scaffold a Next.js App Router catch-all route that streams responses from
 * the Gluon container directly, without buffering (unlike async rewrites()).
 * Returns true if the route was created or already exists.
 */
function scaffoldNextProxyRoute(root: string, port: number): boolean {
  const appRouterDir = exists(path.join(root, "src", "app")) ? "src/app" : "app";
  const routeDir = path.join(root, appRouterDir, "api", "gluon", "[[...path]]");
  const routePath = path.join(routeDir, "route.ts");

  if (exists(routePath)) {
    log("skip", `${appRouterDir}/api/gluon/[[...path]]/route.ts (already exists)`);
    return true;
  }

  const upstream = `http://localhost:${port}`;
  // Use a variable name that doesn't shadow the outer `path` import
  const template = `export const dynamic = "force-dynamic";

const UPSTREAM = process.env.GLUON_UPSTREAM_URL ?? "${upstream}";

async function proxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\\/api\\/gluon/, "");
  const upstream = await fetch(\`\${UPSTREAM}\${pathname}\${url.search}\`, {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    // @ts-expect-error — duplex required for streaming request bodies in Node.js
    duplex: "half",
    signal: req.signal,
  });
  // Pipe upstream.body as a ReadableStream — never buffers, so SSE deltas
  // flow to the browser in real time instead of appearing all at once.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as DELETE,
  proxy as PUT,
  proxy as PATCH,
};
`;

  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(routePath, template, "utf-8");
  log("write", `${appRouterDir}/api/gluon/[[...path]]/route.ts`);
  return true;
}

/**
 * Apply same-origin proxy config automatically where possible, otherwise
 * print manual instructions.
 * Returns the basePath to use in GluonAgentPanel.
 */
function applyProxyConfig(
  framework: ScanResult["hostFramework"],
  root: string,
  port: number,
): string {
  if (!framework) return `http://localhost:${port}`;

  let patched = false;

  if (framework === "nextjs") {
    patched = scaffoldNextProxyRoute(root, port);
  }

  if (patched) {
    return "/api/gluon";
  }

  // Auto-patch failed — print manual instructions
  console.log("  ── Same-origin proxy (recommended) ─────────────────────────\n");
  console.log(
    "  Point your frontend at /api/gluon (no CORS) instead of the\n" +
      `  container directly (http://localhost:${port}).\n`,
  );

  if (framework === "nextjs") {
    console.log("  Create src/app/api/gluon/[[...path]]/route.ts with a streaming proxy.");
    console.log("  See: https://github.com/gluon-ai/gluon-ai#nextjs-proxy\n");
  } else if (framework === "vite") {
    console.log("  In vite.config.ts → server.proxy:");
    console.log(`
    server: {
      proxy: { '/api/gluon': { target: 'http://localhost:${port}', changeOrigin: true } }
    }
`);
  } else if (framework === "remix") {
    console.log(
      "  Add a Remix resource route at app/routes/api.gluon.$.ts\n" +
        `  that proxies to http://localhost:${port}.\n`,
    );
  } else if (framework === "sveltekit") {
    console.log("  In vite.config.ts → server.proxy:");
    console.log(`
    server: {
      proxy: { '/api/gluon': { target: 'http://localhost:${port}', changeOrigin: true } }
    }
`);
  }

  return "/api/gluon";
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function initCommand(
  targetDir: string,
  opts: { useDefaults?: boolean; development?: boolean } = {},
) {
  const root = path.resolve(targetDir);

  if (opts.development) {
    console.log(
      "\n  ── Development mode ────────────────────────────────────────\n",
    );
    console.log(
      "  Copying local file: packages into node_modules (--install-links).\n",
    );
    reinstallLocalDepsWithLinks(root);
    console.log();
  }

  const scan = scanProject(root);
  const answers = await askQuestions(scan, opts.useDefaults ?? false);
  const gluonDir = path.join(root, "gluon");

  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  Scaffolding gluon/ folder…");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  const sdkPkg = PROVIDERS[answers.providerIndex].sdkPackage || undefined;
  const sdkVer = PROVIDERS[answers.providerIndex].sdkVersion || undefined;

  // gluon/agent.config.json
  write(path.join(gluonDir, "agent.config.json"), agentConfigTemplate(answers));

  // gluon/Dockerfile
  write(path.join(gluonDir, "Dockerfile"), dockerfileTemplate(sdkPkg, sdkVer));

  // gluon/docker-compose.yml
  write(path.join(gluonDir, "docker-compose.yml"), dockerComposeTemplate(answers.port));

  // gluon/agent/package.json
  write(path.join(gluonDir, "agent", "package.json"), agentPackageJsonTemplate(sdkPkg, sdkVer));

  // gluon/agent/system-prompt.md
  write(path.join(gluonDir, "agent", "system-prompt.md"), systemPromptTemplate());

  // gluon/agent/tools/webSearch.ts
  write(path.join(gluonDir, "agent", "tools", "webSearch.ts"), webSearchToolTemplate());

  // gluon/agent/context/datetime.ts
  write(path.join(gluonDir, "agent", "context", "datetime.ts"), datetimeContextTemplate());

  // .env.example (at project root)
  write(path.join(root, ".env.example"), envExampleTemplate(answers));

  // ── Proxy config (auto-patch or print snippet) ───────────────────────────

  const basePath = applyProxyConfig(scan.hostFramework, root, answers.port);

  // ── Summary ──────────────────────────────────────────────────────────────

  const provider = PROVIDERS[answers.providerIndex];
  const envKeyNote = provider.envKey ? provider.envKey : "your provider key";

  console.log(`
─────────────────────────────────────────────────────────────
  ✨ Setup complete!
─────────────────────────────────────────────────────────────

  Add these to your .env before starting (if not already set):

    ${envKeyNote}=...
    AGENT_DATABASE_URL=postgresql://gluon:gluon@localhost:5433/gluon
    REDIS_URL=redis://localhost:6379

  Then add to your frontend:
    <GluonAgentPanel basePath="${basePath}" />

  Customize: gluon/agent/system-prompt.md  and  gluon/agent/tools/
`);

  console.log(
    "  To add tools later:  npx gluon-ai add-tool <name>\n" +
      "  To upgrade Gluon:    edit gluon/Dockerfile → docker compose build gluon\n",
  );

  // ── Auto-start Docker ─────────────────────────────────────────────────────

  console.log(
    "─────────────────────────────────────────────────────────────",
  );
  console.log("  Starting Docker container…");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  try {
    execSync(`docker compose -f gluon/docker-compose.yml up -d --build`, {
      cwd: root,
      stdio: "inherit",
    });
    console.log(`
  ✅ Container started. Health check:

     curl http://localhost:${answers.port}/config
`);
  } catch {
    console.log(`
  ⚠️  Docker start failed (Docker may not be running, or .env vars are missing).
     Once ready, start manually:

       docker compose -f gluon/docker-compose.yml up -d --build
`);
  }
}
