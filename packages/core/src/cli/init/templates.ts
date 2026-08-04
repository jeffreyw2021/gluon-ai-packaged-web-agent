import { PROVIDERS, type Answers } from "./providers";

export function agentConfigTemplate(answers: Answers): string {
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

export function dockerfileTemplate(
  sdkPackage?: string,
  sdkVersion?: string,
): string {
  const versionedSdkPkg =
    sdkPackage && sdkVersion ? `${sdkPackage}@${sdkVersion}` : sdkPackage;
  const globalPkgs = ["gluon-ai@beta", "tsx", "prisma@6", versionedSdkPkg]
    .filter(Boolean)
    .join(" ");
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

export function dockerComposeTemplate(port: number): string {
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

export function agentPackageJsonTemplate(
  sdkPackage?: string,
  sdkVersion?: string,
): string {
  const deps: Record<string, string> = { "gluon-ai": "beta" };
  if (sdkPackage) deps[sdkPackage] = sdkVersion ?? "latest";
  return `${JSON.stringify(
    { name: "gluon-agent", private: true, type: "module", dependencies: deps },
    null,
    2,
  )}\n`;
}

export function systemPromptTemplate(): string {
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

export function datetimeContextTemplate(): string {
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

export function webSearchToolTemplate(): string {
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

export function envExampleTemplate(answers: Answers): string {
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
