import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawnSync } from "node:child_process";
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

interface ScanResult {
  /** Absolute path to project root */
  root: string;
  /** "app" | "src/app" | null */
  appRouterDir: string | null;
  /** Absolute path to prisma schema, if found */
  prismaSchemaPath: string | null;
  /** Existing env vars found across .env* files */
  detectedEnvVars: Map<string, string>;
  /** Detected auth libraries */
  authLibs: string[];
  /** Package manager */
  packageManager: "pnpm" | "yarn" | "bun" | "npm";
  /** Whether agent.config.json already exists */
  alreadyInitialized: boolean;
}

function scanProject(root: string): ScanResult {
  // App router dir
  let appRouterDir: string | null = null;
  if (exists(path.join(root, "src", "app"))) appRouterDir = "src/app";
  else if (exists(path.join(root, "app"))) appRouterDir = "app";

  // Prisma schema
  let prismaSchemaPath: string | null = null;
  const prismaLocations = [
    path.join(root, "prisma", "schema.prisma"),
    path.join(root, "schema.prisma"),
  ];
  for (const loc of prismaLocations) {
    if (exists(loc)) {
      prismaSchemaPath = loc;
      break;
    }
  }

  // Detect env vars from .env* files
  const detectedEnvVars = new Map<string, string>();
  const envFiles = [".env", ".env.local", ".env.development", ".env.example"];
  for (const envFile of envFiles) {
    const p = path.join(root, envFile);
    if (!exists(p)) continue;
    for (const line of read(p).split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) {
        // Strip surrounding single or double quotes
        const val = m[2].replace(/^["']|["']$/g, "");
        detectedEnvVars.set(m[1], val);
      }
    }
  }

  // Auth libraries
  const pkgPath = path.join(root, "package.json");
  const authLibs: string[] = [];
  let packageManager: ScanResult["packageManager"] = "npm";
  if (exists(pkgPath)) {
    const pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
    const allDeps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    };
    if (allDeps["next-auth"]) authLibs.push("next-auth");
    if (allDeps["@clerk/nextjs"]) authLibs.push("@clerk/nextjs");
    if (allDeps["@supabase/supabase-js"]) authLibs.push("supabase");
    if (allDeps["@auth/prisma-adapter"]) authLibs.push("next-auth");
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

  return {
    root,
    appRouterDir,
    prismaSchemaPath,
    detectedEnvVars,
    authLibs,
    packageManager,
    alreadyInitialized: exists(path.join(root, "agent.config.json")),
  };
}

// ── Interactive prompts ────────────────────────────────────────────────────

// [envVar, displayLabel, agent.config.json env key]
const KNOWN_PROVIDER_KEYS = [
  ["OPENAI_API_KEY", "openai", "openaiApiKey"],
  ["ANTHROPIC_API_KEY", "anthropic", "anthropicApiKey"],
  ["GOOGLE_GENERATIVE_AI_API_KEY", "google", "googleApiKey"],
  ["MISTRAL_API_KEY", "mistral", "mistralApiKey"],
  ["GROQ_API_KEY", "groq", "groqApiKey"],
  ["XAI_API_KEY", "xai", "xaiApiKey"],
  ["DEEPSEEK_API_KEY", "deepseek", "deepseekApiKey"],
  ["AI_GATEWAY_API_KEY", "gateway (Vercel AI Gateway)", "aiGatewayApiKey"],
] as const;

interface Answers {
  providerEnv: Record<string, string>;
  databaseUrlVar: string;
  redisUrlVar: string;
  model: string;
  systemPrompt: string;
  apiBasePath: string;
  dbMode: "prisma" | "custom";
  dbProvider: "postgresql" | "mysql" | "sqlite";
  dbAdapterPath: string;
}

function buildDefaults(scan: ScanResult): Answers {
  const providerEnv: Record<string, string> = {};
  for (const [envVar, , configKey] of KNOWN_PROVIDER_KEYS) {
    if (scan.detectedEnvVars.has(envVar)) {
      providerEnv[configKey] = envVar;
    }
  }
  return {
    providerEnv,
    databaseUrlVar: scan.detectedEnvVars.has("AGENT_DATABASE_URL")
      ? "AGENT_DATABASE_URL"
      : scan.detectedEnvVars.has("DATABASE_URL")
      ? "DATABASE_URL"
      : "AGENT_DATABASE_URL",
    redisUrlVar: scan.detectedEnvVars.has("REDIS_URL")
      ? "REDIS_URL"
      : ([...scan.detectedEnvVars.keys()].find(
          (k) => k.includes("REDIS") || k.includes("UPSTASH"),
        ) ?? "REDIS_URL"),
    model: "openai/o4-mini",
    // Points at the markdown file scaffolded by init — easier to edit than
    // an inline JSON string, and keeps a richer default prompt out of agent.config.json.
    systemPrompt: "./agent/system-prompt.md",
    apiBasePath: "/api/gluon-ai",
    dbMode: "prisma",
    dbProvider: "postgresql",
    dbAdapterPath: "./agent/db.ts",
  };
}

async function askQuestions(
  scan: ScanResult,
  useDefaults: boolean,
): Promise<Answers> {
  const defaults = buildDefaults(scan);

  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  gluon-ai — interactive setup");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  if (scan.alreadyInitialized) {
    console.log(
      "  ⚠️  agent.config.json already exists. Re-running init will\n" +
        "      skip existing files and only add what's missing.\n",
    );
  }

  console.log("  Detected:");
  console.log(
    `    App Router : ${scan.appRouterDir ?? "not found (will use app/)"}`,
  );
  console.log(`    Prisma     : ${scan.prismaSchemaPath ?? "not found"}`);
  console.log(`    Pkg mgr    : ${scan.packageManager}`);

  // Show detected provider keys
  const detectedProviders = KNOWN_PROVIDER_KEYS
    .filter(([k]) => scan.detectedEnvVars.has(k))
    .map(([, label]) => label);
  console.log(`    AI providers: ${detectedProviders.length > 0 ? detectedProviders.join(", ") : "none detected"}\n`);

  if (useDefaults) {
    console.log("  Using all defaults (--default flag set):\n");
    console.log(`    Database URL   : ${defaults.databaseUrlVar}`);
    console.log(`    Redis URL      : ${defaults.redisUrlVar}`);
    console.log(`    Model          : ${defaults.model}`);
    console.log(`    System prompt  : ${defaults.systemPrompt}`);
    console.log(`    API base path  : ${defaults.apiBasePath}\n`);

    if (detectedProviders.length > 0) {
      console.log(`  Detected provider keys: ${detectedProviders.join(", ")}\n`);
    } else {
      console.log("  No provider keys detected in .env* files. Add at least one provider key (e.g. OPENAI_API_KEY, ANTHROPIC_API_KEY) before starting.\n");
    }

    return defaults;
  }

  const rl = readline.createInterface({ input, output });

  function prompt(question: string, defaultVal: string): Promise<string> {
    return rl
      .question(`  ${question} [${defaultVal}]: `)
      .then((ans) => ans.trim() || defaultVal);
  }

  console.log(
    "  ── Env variable names ─────────────────────────────────────\n",
  );
  console.log(
    "  The package reads env vars to find your secrets. If you use\n" +
      "  different variable names than the defaults shown in [brackets],\n" +
      "  type the correct name. Otherwise press Enter to accept.\n",
  );

  const databaseUrlVar = await prompt(
    "PostgreSQL DATABASE_URL env var name",
    defaults.databaseUrlVar,
  );
  const redisUrlVar = await prompt(
    "Redis REDIS_URL env var name",
    defaults.redisUrlVar,
  );

  console.log(
    "\n  ── Agent configuration ─────────────────────────────────────\n",
  );
  console.log("  Press Enter to accept the value shown in [brackets].\n");

  const model = await prompt("Model (provider/model, e.g. openai/o4-mini)", defaults.model);
  const systemPrompt = await prompt("System prompt", defaults.systemPrompt);
  const apiBasePath = await prompt("API route base path", defaults.apiBasePath);

  console.log(
    "\n  ── Database connection ──────────────────────────────────────\n",
  );
  console.log(
    "  How should gluon-ai connect to your database?\n\n" +
      "    1  Built-in Prisma adapter (gluon manages its own tables)\n" +
      "    2  Custom adapter (Drizzle, Mongoose, raw SQL, etc.)\n",
  );
  const dbModeInput = await prompt("Choice", "1");
  const dbMode: Answers["dbMode"] = dbModeInput.trim() === "2" ? "custom" : "prisma";

  let dbProvider: Answers["dbProvider"] = "postgresql";
  let dbAdapterPath = defaults.dbAdapterPath;

  if (dbMode === "prisma") {
    console.log(
      "\n  Database provider:\n\n" +
        "    1  PostgreSQL (default)\n" +
        "    2  MySQL / MariaDB\n" +
        "    3  SQLite (great for local dev)\n",
    );
    const providerInput = await prompt("Choice", "1");
    if (providerInput.trim() === "2") dbProvider = "mysql";
    else if (providerInput.trim() === "3") dbProvider = "sqlite";
  } else {
    dbAdapterPath = await prompt(
      "Path to your adapter module (relative to project root)",
      defaults.dbAdapterPath,
    );
  }

  rl.close();

  return {
    providerEnv: defaults.providerEnv,
    databaseUrlVar,
    redisUrlVar,
    model,
    systemPrompt,
    apiBasePath,
    dbMode,
    dbProvider,
    dbAdapterPath,
  };
}

// ── Agent database setup ───────────────────────────────────────────────────

/**
 * Directly reads .env / .env.local in the project root and returns the first
 * non-empty value found for any of the given keys (in order).
 * Uses `startsWith` matching and handles both LF and CRLF line endings.
 */
function readDbUrlFromEnvFiles(root: string, ...keys: string[]): string | null {
  const files = [".env.local", ".env", ".env.development"];
  for (const file of files) {
    const p = path.join(root, file);
    if (!exists(p)) continue;
    const lines = read(p).split(/\r?\n/);
    for (const key of keys) {
      for (const line of lines) {
        if (line.startsWith(`${key}=`) || line.startsWith(`${key} =`)) {
          const val = line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
          if (val) return val;
        }
      }
    }
  }
  return null;
}

/**
 * Generates the package's own Prisma client and pushes the agent schema
 * (GluonChat + GluonChatJobRun) to the user's database.
 *
 * The package owns its schema at prisma/schema.prisma — the user's schema is
 * never modified. The agent tables live alongside the user's tables in the
 * same database (or a separate one if AGENT_DATABASE_URL differs).
 */
function applyAgentDatabase(
  root: string,
  databaseUrlVar: string,
  detectedEnvVars: Map<string, string>,
  provider: "postgresql" | "mysql" | "sqlite" = "postgresql",
) {
  // __dirname in the compiled dist/cli.js = <pkg-root>/dist/
  const pkgRoot = path.join(__dirname, "..");
  const templatesDir = path.join(pkgRoot, "prisma", "templates");
  const schemaPath = path.join(pkgRoot, "prisma", "schema.prisma");

  // Copy the provider-specific template into place
  const templateFile = path.join(templatesDir, `schema.${provider}.prisma`);
  const fallbackTemplate = path.join(templatesDir, "schema.postgresql.prisma");

  if (exists(templateFile)) {
    fs.copyFileSync(templateFile, schemaPath);
  } else if (exists(fallbackTemplate)) {
    fs.copyFileSync(fallbackTemplate, schemaPath);
    log("warn", `No template for provider "${provider}", fell back to postgresql.`);
  }

  if (!exists(schemaPath)) {
    log(
      "warn",
      "Package schema not found at " +
        schemaPath +
        ". Reinstall gluon-ai.",
    );
    return;
  }

  // 1. Generate the package's own Prisma client into <pkg-root>/prisma/generated/.
  //    `prisma generate` only reads schema structure — no real DB connection needed.
  log("info", "Generating package Prisma client…");
  const genResult = spawnSync(
    "npx",
    ["--yes", "prisma", "generate", "--schema", schemaPath],
    {
      stdio: "inherit",
      shell: true,
      cwd: root,
      env: {
          ...process.env,
          AGENT_DATABASE_URL:
            process.env.AGENT_DATABASE_URL ||
            process.env[databaseUrlVar] ||
            detectedEnvVars.get("AGENT_DATABASE_URL") ||
            detectedEnvVars.get(databaseUrlVar) ||
            (provider === "sqlite"
              ? "file:./agent.db"
              : provider === "mysql"
                ? "mysql://placeholder:3306/agent"
                : "postgresql://placeholder:5432/agent"),
        },
    },
  );

  if (genResult.status !== 0) {
    log(
      "warn",
      "prisma generate failed. Try running manually:\n\n" +
        `     npx prisma generate --schema ${schemaPath}\n`,
    );
    return;
  }
  log("info", `Prisma client generated at ${pkgRoot}/prisma/generated/`);

  // 2. Create the gluon tables using idempotent SQL (CREATE TABLE IF NOT EXISTS).
  //    This is deliberately NOT `prisma db push` — that command would drop any table
  //    not in the gluon schema, destroying the host app's own tables.
  //    `prisma db execute --stdin --url <url>` only runs the SQL we supply.
  const dbUrl =
    process.env.AGENT_DATABASE_URL ||
    process.env[databaseUrlVar] ||
    process.env.DATABASE_URL ||
    readDbUrlFromEnvFiles(root, "DATABASE_URL_UNPOOLED", databaseUrlVar, "DATABASE_URL") ||
    detectedEnvVars.get("DATABASE_URL_UNPOOLED") ||
    detectedEnvVars.get(databaseUrlVar) ||
    detectedEnvVars.get("DATABASE_URL");

  if (!dbUrl) {
    log(
      "warn",
      `Could not find a database URL — skipping table creation.\n` +
        `     Run this manually after setting your DB env var:\n\n` +
        `     npx prisma db execute --stdin --url <your-db-url> <<'EOF'\n` +
        `     -- (see node_modules/gluon-ai/prisma/init.sql)\n` +
        `     EOF\n`,
    );
    return;
  }

  const initSql = `
-- gluon-ai — idempotent table setup (safe to run multiple times)
CREATE TABLE IF NOT EXISTS "gluon_chat" (
    "id"             TEXT          NOT NULL,
    "userId"         TEXT          NOT NULL,
    "title"          TEXT          NOT NULL DEFAULT 'New Chat',
    "uiMessages"     JSONB         NOT NULL DEFAULT '[]',
    "activeJobRunId" TEXT,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gluon_chat_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "gluon_chat_userId_idx"
    ON "gluon_chat"("userId");

CREATE TABLE IF NOT EXISTS "gluon_chat_job_run" (
    "id"                            TEXT          NOT NULL,
    "chatId"                        TEXT          NOT NULL,
    "userId"                        TEXT          NOT NULL,
    "status"                        TEXT          NOT NULL DEFAULT 'QUEUED',
    "bullmqJobId"                   TEXT,
    "currentRoundIndex"             INTEGER       NOT NULL DEFAULT 0,
    "pendingConfirmationToolCallId" TEXT,
    "confirmationResolvedIds"       JSONB         NOT NULL DEFAULT '[]',
    "lastPublishedSeq"              INTEGER       NOT NULL DEFAULT 0,
    "errorMessage"                  TEXT,
    "startedAt"                     TIMESTAMP(3),
    "finishedAt"                    TIMESTAMP(3),
    "createdAt"                     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gluon_chat_job_run_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gluon_chat_job_run_chatId_fkey"
        FOREIGN KEY ("chatId") REFERENCES "gluon_chat"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "gluon_chat_job_run_bullmqJobId_key"
    ON "gluon_chat_job_run"("bullmqJobId");
CREATE INDEX IF NOT EXISTS "gluon_chat_job_run_chatId_createdAt_idx"
    ON "gluon_chat_job_run"("chatId", "createdAt");
CREATE INDEX IF NOT EXISTS "gluon_chat_job_run_userId_createdAt_idx"
    ON "gluon_chat_job_run"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "gluon_chat_job_run_status_updatedAt_idx"
    ON "gluon_chat_job_run"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "gluon_chat_job_run_chatId_status_idx"
    ON "gluon_chat_job_run"("chatId", "status");
`;

  log("info", "Creating gluon tables (non-destructive)…");
  const execResult = spawnSync(
    "npx",
    ["--yes", "prisma", "db", "execute", "--stdin", "--url", dbUrl],
    {
      input: initSql,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
      cwd: pkgRoot,
    },
  );

  if (execResult.status !== 0) {
    log(
      "warn",
      "Table creation failed. Run this manually:\n\n" +
        `     npx prisma db execute --stdin --url <your-db-url> \\\n` +
        `       < node_modules/gluon-ai/prisma/init.sql\n`,
    );
  } else {
    log("info", "Agent tables (gluon_chat, gluon_chat_job_run) created/verified.");
  }
}

// ── next.config patch ──────────────────────────────────────────────────────

/**
 * Ensures `serverExternalPackages: ["gluon-ai"]` is present in
 * next.config.{ts,js,mjs}. Required so Turbopack resolves subpath exports
 * from a symlinked file: package via Node's native resolution.
 */
function applyNextConfig(root: string) {
  const candidates = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
  ].map((f) => path.join(root, f));

  const configPath = candidates.find(exists);
  if (!configPath) {
    log(
      "warn",
      "next.config.{ts,js,mjs} not found — add manually:\n" +
        "     serverExternalPackages: ['gluon-ai']",
    );
    return;
  }

  let content = read(configPath);

  // Already patched
  if (content.includes("gluon-ai")) {
    log("skip", `${configPath} (serverExternalPackages already present)`);
    return;
  }

  // Case 1: serverExternalPackages already exists but without our package.
  // Insert into the existing array.
  const existingArrayRe = /(serverExternalPackages\s*:\s*\[)([^\]]*?)\]/;
  if (existingArrayRe.test(content)) {
    content = content.replace(
      existingArrayRe,
      (_m, open, inner) =>
        `${open}${inner.trimEnd()}${inner.trim() ? ", " : ""}"gluon-ai"]`,
    );
    fs.writeFileSync(configPath, content, "utf-8");
    log("append", `${configPath} (added to existing serverExternalPackages)`);
    return;
  }

  // Case 2: Config object contains only a comment placeholder or is empty.
  // Replace the placeholder with our entry.
  const emptyConfigRe =
    /(const\s+\w+\s*(?::\s*NextConfig)?\s*=\s*\{)\s*(?:\/\*[^*]*\*\/\s*)?\}/;
  if (emptyConfigRe.test(content)) {
    content = content.replace(
      emptyConfigRe,
      (_m, open) =>
        `${open}\n  // Lets Turbopack resolve subpath exports via Node instead of bundling.\n  serverExternalPackages: ["gluon-ai"],\n}`,
    );
    fs.writeFileSync(configPath, content, "utf-8");
    log("write", `${configPath} (added serverExternalPackages)`);
    return;
  }

  // Case 3: Non-empty config object — inject before the last closing brace.
  // Find the config object's closing `};` and insert before it.
  const closingRe = /(\n\s*\})\s*;\s*\nexport default/;
  if (closingRe.test(content)) {
    content = content.replace(
      closingRe,
      '\n  serverExternalPackages: ["gluon-ai"],$1;\nexport default',
    );
    fs.writeFileSync(configPath, content, "utf-8");
    log("append", `${configPath} (inserted serverExternalPackages)`);
    return;
  }

  // Fallback — can't safely patch, warn
  log(
    "warn",
    `Could not auto-patch ${configPath}.\n` +
      "     Add this manually inside your NextConfig object:\n\n" +
      '     serverExternalPackages: ["gluon-ai"],\n',
  );
}

// ── File templates ─────────────────────────────────────────────────────────

function configTemplate(answers: Answers): string {
  const cfg: Record<string, unknown> = {
    model: answers.model,
    systemPrompt: answers.systemPrompt,
    maxOutputTokens: 16384,
    maxRounds: 25,
    tools: {
      web_search: "./agent/tools/webSearch.ts",
    },
    actionBlocks: {},
    skills: [],
    // Each entry is a relative path to a .ts file that exports a default
    // async function () => Promise<string>.  Gluon calls it fresh on every
    // request and injects the result into the system prompt under ## Context.
    // Remove or add entries to control what dynamic context the agent receives.
    context: ["./agent/context/datetime.ts"],
    auth: {
      // "allow" (default) — all requests pass, userId = "anon". Good for dev / single-user.
      // "deny"            — all requests rejected with 401.
      // "./agent/auth.ts" — custom file: export default async (req) => "userId" | true | false
      handler: "allow",
    },
    sendReasoning: false,
    suggestedPrompts: [
      "What's happening in the news today?",
      "Search for the latest on AI models",
      "Summarize recent developments in technology",
    ],
    env: {
      ...answers.providerEnv,
      databaseUrl: answers.databaseUrlVar,
      redisUrl: answers.redisUrlVar,
    },
  };

  if (answers.dbMode === "custom") {
    cfg.db = { adapter: answers.dbAdapterPath };
  } else if (answers.dbProvider !== "postgresql") {
    cfg.db = { provider: answers.dbProvider };
  }

  return JSON.stringify(cfg, null, 2);
}

// Single catch-all route — handles /api/agent/events, /thread, /chats, /commands.
// force-dynamic ensures SSE is never cached.
const ROUTE_CATCHALL = `export { GET, POST, DELETE } from "gluon-ai/routes";
export const dynamic = "force-dynamic";
`;

function instrumentationTemplate(): string {
  return `export { register } from "gluon-ai/instrumentation";\n`;
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

function webSearchTool(): string {
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

// ── package.json — gluon:uninstall convenience script ─────────────────────
// npm 7+ removed the ability to run a package's own preuninstall hook when it
// is removed (RFC 0018). As a workaround, inject a project-level npm script so
// users can run `npm run gluon:uninstall` which invokes the CLI uninstall flow.

function customAdapterStub(): string {
  return `import type { GluonDatabaseAdapter } from "gluon-ai/server";

/**
 * Custom gluon-ai database adapter.
 *
 * Implement every method to connect gluon to your ORM, query builder, or
 * raw DB client (Drizzle, Mongoose, Knex, raw SQL, etc.).
 *
 * Docs: https://github.com/ziqinyeow/gluon-ai#custom-db-adapter
 */
const adapter: GluonDatabaseAdapter = {
  chat: {
    async create(userId, title = "New Chat") {
      // TODO: insert a row and return a GluonChatRow
      throw new Error("chat.create not implemented");
    },
    async upsert(chatId, userId, uiMessages) {
      // TODO: upsert a chat row (create if absent, touch updatedAt otherwise)
      throw new Error("chat.upsert not implemented");
    },
    async loadMessages(chatId) {
      // TODO: return the raw uiMessages JSON (UIMessage[]) for chatId
      throw new Error("chat.loadMessages not implemented");
    },
    async saveMessages(chatId, msgs, opts) {
      // TODO: overwrite uiMessages; also update activeJobRunId if opts?.activeJobRunId is set
      throw new Error("chat.saveMessages not implemented");
    },
    async listForUser(userId) {
      // TODO: return all chats for userId ordered newest first
      throw new Error("chat.listForUser not implemented");
    },
    async findOwned(chatId, userId) {
      // TODO: return { id } if the chat belongs to userId, else null
      throw new Error("chat.findOwned not implemented");
    },
    async findTitle(chatId) {
      // TODO: return { title } or null
      throw new Error("chat.findTitle not implemented");
    },
    async findWithActiveJob(chatId, userId) {
      // TODO: return { id, activeJobRunId } if owned, else null
      throw new Error("chat.findWithActiveJob not implemented");
    },
    async findForRun(chatId, userId) {
      // TODO: return the full GluonChatRow or null
      throw new Error("chat.findForRun not implemented");
    },
    async updateTitle(chatId, title) {
      throw new Error("chat.updateTitle not implemented");
    },
    async setActiveRun(chatId, runId) {
      throw new Error("chat.setActiveRun not implemented");
    },
    async clearActiveRunIfMatches(chatId, runId) {
      throw new Error("chat.clearActiveRunIfMatches not implemented");
    },
    async delete(chatId) {
      throw new Error("chat.delete not implemented");
    },
  },
  run: {
    async create(chatId, userId) {
      // TODO: insert a QUEUED job run and return GluonJobRunRow
      throw new Error("run.create not implemented");
    },
    async setBullmqId(runId, bullmqJobId) {
      throw new Error("run.setBullmqId not implemented");
    },
    async findById(runId) {
      throw new Error("run.findById not implemented");
    },
    async findActiveForChat(chatId) {
      throw new Error("run.findActiveForChat not implemented");
    },
    async findOwned(runId, userId) {
      throw new Error("run.findOwned not implemented");
    },
    async setRound(runId, nextRoundIndex) {
      throw new Error("run.setRound not implemented");
    },
    async markAwaitingUser(runId, toolCallId) {
      throw new Error("run.markAwaitingUser not implemented");
    },
    async clearAwaitingUser(runId) {
      throw new Error("run.clearAwaitingUser not implemented");
    },
    async claimApproval(runId, userId, chatId) {
      // TODO: atomically AWAITING_USER → RUNNING; return true if claimed
      throw new Error("run.claimApproval not implemented");
    },
    async appendConfirmationResolved(runId, toolCallId) {
      throw new Error("run.appendConfirmationResolved not implemented");
    },
    async transition(runId, status, extra) {
      throw new Error("run.transition not implemented");
    },
    async incrementSeq(runId) {
      // TODO: atomic increment of lastPublishedSeq; return new value
      throw new Error("run.incrementSeq not implemented");
    },
    async setSeqIfHigher(runId, seq) {
      throw new Error("run.setSeqIfHigher not implemented");
    },
  },
};

export default adapter;
`;
}

function injectUninstallScript(
  root: string,
  packageManager: "npm" | "pnpm" | "yarn" | "bun",
) {
  const pkgPath = path.join(root, "package.json");
  if (!exists(pkgPath)) {
    log("skip", "package.json (not found — cannot inject gluon:uninstall script)");
    return;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
  } catch {
    log("warn", "package.json — could not parse, skipping gluon:uninstall injection");
    return;
  }

  const scripts = (pkg.scripts ?? {}) as Record<string, string>;

  if (scripts["gluon:uninstall"]) {
    log("skip", "package.json gluon:uninstall script (already present)");
    return;
  }

  const pmFlag = packageManager !== "npm" ? ` --${packageManager}` : "";
  scripts["gluon:uninstall"] = `npx gluon-ai uninstall${pmFlag}`;
  pkg.scripts = scripts;

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  log("append", "package.json — added scripts.gluon:uninstall");
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
      "  Copying local file: packages into node_modules (--install-links).\n" +
        "  This lets Turbopack resolve subpath exports within the project root.\n",
    );
    reinstallLocalDepsWithLinks(root);
    console.log();
  }

  const scan = scanProject(root);
  const answers = await askQuestions(scan, opts.useDefaults ?? false);

  const appDir = scan.appRouterDir ?? "app";
  // Convert "/api/gluon-ai" (URL path) → "api/gluon-ai" (relative filesystem path)
  const routeRelPath = answers.apiBasePath.replace(/^\//, "");
  const apiBase = `${appDir}/${routeRelPath}`;

  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  Applying changes…");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  // 1. Agent DB — generate package Prisma client + push agent tables to DB
  if (answers.dbMode === "prisma") {
    applyAgentDatabase(root, answers.databaseUrlVar, scan.detectedEnvVars, answers.dbProvider);
  } else {
    // Custom adapter — generate stub file and skip Prisma setup
    const adapterOutPath = path.join(root, answers.dbAdapterPath);
    write(adapterOutPath, customAdapterStub());
    log("info", `Custom adapter stub written to ${answers.dbAdapterPath}`);
    log("info", "Skipping Prisma setup (custom adapter mode).");
  }

  // 2. agent.config.json  (auth.getUserId uses a built-in strategy string — no file needed)
  write(path.join(root, "agent.config.json"), configTemplate(answers));

  // 3. Default system prompt (markdown — referenced by agent.config.json)
  write(path.join(root, "agent/system-prompt.md"), systemPromptTemplate());

  // 3b. agent/package.json — marks agent modules as ESM so Node doesn't warn
  //     MODULE_TYPELESS_PACKAGE_JSON when dynamically importing .ts tools/context.
  //     Scoped under agent/ so the host Next.js app stays untouched.
  write(
    path.join(root, "agent/package.json"),
    `${JSON.stringify({ name: "gluon-agent", private: true, type: "module" }, null, 2)}\n`,
  );

  // 4. Web search tool (default example — uses OpenAI's built-in web search via OPENAI_API_KEY)
  write(path.join(root, "agent/tools/webSearch.ts"), webSearchTool());

  // 4b. Datetime context provider (scaffolded as a working example)
  write(path.join(root, "agent/context/datetime.ts"), datetimeContextTemplate());

  // 5. Single catch-all API route — [[...path]] handles all /api/agent/* endpoints
  write(path.join(root, apiBase, "[[...path]]", "route.ts"), ROUTE_CATCHALL);

  // 6. next.config — add serverExternalPackages
  applyNextConfig(root);

  // 7a. Inject gluon:uninstall convenience script into host package.json
  //     npm 7+ does not run a removed package's own preuninstall hook, so we
  //     register a project-level script instead.
  injectUninstallScript(root, scan.packageManager);

  // 7. instrumentation.ts (if not present)
  const instrPath = path.join(root, "instrumentation.ts");
  const instrSrcPath = path.join(root, "src", "instrumentation.ts");
  if (!exists(instrPath) && !exists(instrSrcPath)) {
    write(instrPath, instrumentationTemplate());
  } else {
    const existing = exists(instrPath) ? read(instrPath) : read(instrSrcPath);
    if (!existing.includes("gluon-ai/instrumentation")) {
      log(
        "warn",
        `instrumentation.ts already exists. Add this line to it:\n\n` +
          `     export { register } from "gluon-ai/instrumentation";\n`,
      );
    } else {
      log("skip", "instrumentation.ts (register already re-exported)");
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  const pm = scan.packageManager;
  const runCmd = pm === "npm" ? "npm run" : pm;

  console.log(`
─────────────────────────────────────────────────────────────
  ✨ Setup complete! Next steps:
─────────────────────────────────────────────────────────────

  1. Add your secrets to .env.local (or your platform env):

       # At least one AI provider key is required. Examples:
       # OPENAI_API_KEY=sk-...               (install: npm i @ai-sdk/openai)
       # ANTHROPIC_API_KEY=sk-ant-...        (install: npm i @ai-sdk/anthropic)
       # GOOGLE_GENERATIVE_AI_API_KEY=...    (install: npm i @ai-sdk/google)
       # AI_GATEWAY_API_KEY=...              (enables gateway/* model prefix — no per-provider package needed)

       ${answers.databaseUrlVar}=postgresql://...   ← agent tables DB connection
       ${answers.redisUrlVar}=redis://...

  2. The agent tables (gluon_chat, gluon_chat_job_run) are managed entirely
     by the package — your project's prisma/schema.prisma is untouched.

     If the db push above failed, run it manually:

       npx prisma db push \\
         --schema ./node_modules/gluon-ai/prisma/schema.prisma

  3. Start your dev server — the worker starts automatically via instrumentation.ts:

       ${runCmd} dev

  4. Use the components in your app:

       import { AgentProvider, AgentPanel } from "gluon-ai/react";

       // In your root layout or page:
       <AgentProvider basePath="${answers.apiBasePath}">
         <AgentPanel />
       </AgentProvider>

  5. Run \`npx gluon-ai add-tool <name>\` to scaffold new tools.

  To uninstall later, run:

       ${runCmd} gluon:uninstall
─────────────────────────────────────────────────────────────
`);
}
