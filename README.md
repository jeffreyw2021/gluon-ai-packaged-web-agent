# Gluon-AI

> **Beta** project, rough edges expected.

Sometimes you want to build an AI-native product from scratch. Sometimes you just want an agent inside an existing product. The backend for that second case is mostly the same every time: chats, streaming, tools, a worker, Redis, a DB. Gluon packages that stack — as a standalone Docker container — so you can drop an agent into any web app and focus on the product side.

Works with any React frontend: Next.js, Vite, Remix, SvelteKit, or anything else.

Built for my workflow. Shared in case it's useful.

---

## Compatibility


| Requirement            | Notes                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Any React 19+ frontend | Next.js, Vite, Remix, SvelteKit, or a plain React app                                                                        |
| Docker (local dev)     | For local development via `docker compose`. Not required in production — `gluon-ai start` runs as a plain Node process too   |
| PostgreSQL             | Bundled in the dev compose file. In production: any managed Postgres (RDS, Neon, Cloud SQL, etc.)                            |
| Redis                  | Bundled in the dev compose file. In production: any Redis-compatible service (Upstash, ElastiCache, etc.)                    |
| AI provider            | OpenAI, Anthropic, Google, Mistral, Groq, xAI, DeepSeek, or Vercel AI Gateway. See [AI model providers](#ai-model-providers) |


---



## Quick start



### Step 1 — Install

```bash
npm install gluon-ai@beta
```

This puts the React components (`gluon-ai/react`) into your project and makes the CLI available locally so the next step uses your installed version.

### Step 2 — Set env vars

Add these to your `.env` before running `init`:

```env
OPENAI_API_KEY=sk-...              # or whichever provider key you chose
AGENT_DATABASE_URL=postgresql://gluon:gluon@localhost:5433/gluon
REDIS_URL=redis://localhost:6379
GLUON_CORS_ORIGIN=*
```

`AGENT_DATABASE_URL` and `REDIS_URL` match the bundled docker-compose defaults — no changes needed if you use it as-is.



### Step 3 — Scaffold

```bash
npx gluon-ai init
```

Three prompts: AI provider, model, and port. Done. The wizard generates a `gluon/` folder alongside your app:

```
your-project/
  gluon/
    agent.config.json          ← model, tools, context, auth
    Dockerfile                 ← installs gluon-ai@beta; CMD gluon-ai start
    docker-compose.yml         ← gluon + postgres:17 + redis:8
    agent/
      package.json             ← { "type": "module" }
      system-prompt.md
      tools/webSearch.ts       ← uses defineTool from "gluon-ai"
      context/datetime.ts
  .env.example                 ← pre-filled defaults for compose infra
```

`npx gluon-ai init` automatically runs `docker compose -f gluon/docker-compose.yml up -d --build` at the end. If it fails (Docker not running, missing env vars), re-run manually once everything is ready:

```bash
docker compose -f gluon/docker-compose.yml up -d --build
```

The container applies the DB schema automatically and starts the BullMQ worker. Health check:

```bash
curl http://localhost:3001/config
```



### Step 4 — Add to your frontend

`gluon-ai` is already installed from Step 1:

```tsx
import { GluonAgentPanel } from "gluon-ai/react";

// Direct (simplest — requires GLUON_CORS_ORIGIN=* in .env):
<GluonAgentPanel basePath="http://localhost:3001" />

// Or proxy through your own server (no CORS needed — see below):
<GluonAgentPanel basePath="/api/gluon" />
```

That's enough for a working agent with web search, multi-chat, streaming, and the background worker.

---



## Deployment modes

Docker is not required to run Gluon. `gluon-ai start` is a plain Node.js process — the Dockerfile that `init` generates is one convenient packaging option, not a prerequisite.

### Mode A — Same server, no Docker (EC2, bare VM, any VPS)

Run Gluon as a sibling process on the same machine as your app:

```bash
npm install -g gluon-ai@beta tsx
pm2 start "gluon-ai start" --name gluon
```

Set env vars on the server:

```env
AGENT_DATABASE_URL=postgresql://...    # RDS, Cloud SQL, or same DB the app uses
REDIS_URL=redis://...                  # ElastiCache, Upstash, or existing Redis
OPENAI_API_KEY=...
PORT=3001
GLUON_CORS_ORIGIN=https://myapp.com
```

In tools, call the host app at `http://localhost:3000` — zero network overhead.

### Mode B — Docker Compose sidecar (host app already uses Docker)

Add Gluon as one more service to your existing `docker-compose.yml`:

```yaml
services:
  myapp:
    build: .
    ports: ["3000:3000"]

  gluon:
    build: ./gluon
    expose: ["3001"] # internal only — not exposed to the internet
    environment:
      AGENT_DATABASE_URL: postgresql://user:pass@postgres:5432/mydb # SAME DB
      REDIS_URL: redis://redis:6379 # SAME Redis
      GLUON_CORS_ORIGIN: http://localhost:3000
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
```

Tools call the host app at `http://myapp:3000` (Docker service name), ~0.5 ms.

### Mode C — Standalone container (serverless host app)

If the host backend is on Vercel, AWS Lambda, or another serverless platform, deploy Gluon as a separate container service (Cloud Run, Railway, Fly.io, ECS Fargate):

```bash
docker build -f gluon/Dockerfile gluon/ -t my-app-gluon:latest
# Deploy to Cloud Run / Railway / Fly.io / ECS Fargate

# Proxy through your Next.js Route Handler (already created by init).
# Set GLUON_UPSTREAM_URL to the container's internal or public URL:
# GLUON_UPSTREAM_URL=https://my-app-gluon.railway.app
```



### Platform decision guide


| Host app deployment       | Gluon deployment                                | Latency to host app        |
| ------------------------- | ----------------------------------------------- | -------------------------- |
| Bare VM / EC2 (no Docker) | `pm2 start "gluon-ai start"` on same server     | ~0 ms (localhost)          |
| Docker Compose            | Add `gluon` service to existing compose         | ~0.5 ms (Docker network)   |
| Kubernetes                | Sidecar container in same pod                   | ~0 ms (loopback)           |
| ECS / Cloud Run           | Second container in same task / same region     | ~0.5–2 ms                  |
| Vercel / serverless       | Separate container on Railway / Fly / Cloud Run | ~5–30 ms (cross-service)   |
| Railway / Render / Fly    | Additional service in same project              | ~1–2 ms (internal network) |


---



## Tool data access patterns

Tools run inside the Gluon container, not inside your host app. Two patterns cover virtually all data access needs, both with negligible latency in sidecar mode.

### Pattern 1: Shared database URL (recommended for read-heavy tools)

Point `AGENT_DATABASE_URL` at the same database your host app uses. Tools connect directly with their preferred client:

```typescript
// gluon/agent/tools/readUser.ts
import { defineTool } from "gluon-ai";
import { z } from "zod";
import postgres from "postgres"; // install in gluon/agent/package.json

const sql = postgres(process.env.AGENT_DATABASE_URL!);

export default defineTool({
  description: "Look up a user by email",
  inputSchema: z.object({ email: z.string() }),
  execute: async ({ email }) => {
    return sql`SELECT id, name FROM users WHERE email = ${email}`;
  },
});
```

In sidecar mode, latency is identical to the host app querying the same DB. Any DB client works: Drizzle, Prisma (with host schema), Kysely, raw `pg`.

### Pattern 2: HTTP to host app's internal API (recommended for write operations or business logic)

Call an internal endpoint on the host app. In sidecar mode, this is `http://myapp:3000` — a Docker network call, ~0.5 ms:

```typescript
// gluon/agent/tools/createPost.ts
export default defineTool({
  description: "Create a blog post on behalf of the user",
  inputSchema: z.object({ title: z.string(), body: z.string() }),
  execute: async ({ title, body }, { userId }) => {
    const res = await fetch("http://myapp:3000/api/internal/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": process.env.INTERNAL_TOKEN!,
      },
      body: JSON.stringify({ title, body, userId }),
    });
    return res.json();
  },
});
```

Expose `/api/internal/*` routes protected by a shared secret — only reachable within the Docker network, not from the internet.

### Latency comparison


| Access pattern       | Sidecar container    | Standalone container |
| -------------------- | -------------------- | -------------------- |
| DB query in tool     | ~0.5 ms (Docker net) | ~5–50 ms (real net)  |
| Host app API in tool | ~0.5 ms (Docker net) | ~5–50 ms (real net)  |
| LLM API call         | same                 | same                 |


For most agent use cases, LLM calls dominate at 500–2000 ms. The ~0.5 ms Docker network overhead is irrelevant.

---



## Same-origin proxy (recommended for production)

Point the frontend at `/api/gluon` instead of the container directly — this avoids exposing the container port to the internet and eliminates CORS configuration.

**Next.js** — `npx gluon-ai init` creates a streaming catch-all Route Handler automatically:

```
src/app/api/gluon/[[...path]]/route.ts   ← generated by init
```

It pipes `upstream.body` directly as a `ReadableStream`, so SSE text deltas stream to the browser in real time without buffering. No changes to `next.config.ts` needed.

**Vite** (`vite.config.ts`):

```typescript
server: {
  proxy: { "/api/gluon": { target: "http://localhost:3001", changeOrigin: true } }
}
```

Then use `basePath="/api/gluon"` instead of the full URL:

```tsx
<GluonAgentPanel basePath="/api/gluon" />
```

`npx gluon-ai init` handles the Next.js case automatically.

---



## Frontend: four layers of UI

Everything lives under `gluon-ai/react`. Pick the layer that matches how much control you want.

### 1. Drop-in: `GluonAgentPanel` (recommended)

Provider + top bar + messages + input, with built-in styles.

```tsx
import { GluonAgentPanel } from "gluon-ai/react";

<GluonAgentPanel basePath="/api/gluon-ai" />;
```

`basePath` defaults to `"/api/gluon-ai"` and can be omitted.


| Prop                                  | Description                                                  |
| ------------------------------------- | ------------------------------------------------------------ |
| `basePath`                            | API route prefix (default `"/api/gluon-ai"`)                 |
| `darkMode`                            | Dark palette for the shell and all children                  |
| `frostedGlass`                        | Blur + translucent shell instead of a solid background       |
| `suggestedPrompts`                    | Empty-state chips; omit to load from `GET {basePath}/config` |
| `actionBlocks`                        | Map of tool name → React component for in-stream UI          |
| `queryClient`                         | Share an existing TanStack Query client                      |
| `style` / `className`                 | Applied to the outermost shell                               |
| `topBar` / `messageList` / `inputBar` | Prop overrides forwarded to each Layer 3 child               |
| `children`                            | Replace the default body while keeping `AgentProvider`       |




### 2. Styled atomic components (Layer 2)

Fine-grained, default-styled controls. Wire one component at a time into your own layout:

```tsx
import {
  AgentProvider,
  NewChatButton,
  ModeSwitch,
  ChatSelect,
  EmptyView,
  SendButton,
  AttachButton,
  ChatInput,
  MicButton,
} from "gluon-ai/react";

<AgentProvider basePath="/api/gluon-ai">
  {/* your own layout; place components wherever you like */}
  <NewChatButton />
  <ModeSwitch />
  <ChatSelect />
  <EmptyView maxSuggestedPrompts={3} />
  <ChatInput
    renderSubmitButton={({ isActive, canSend }) => (
      <div>
        <AttachButton />
        <MicButton />
        <SendButton />
      </div>
    )}
  />
</AgentProvider>;
```

All of these components read from `AgentProvider`; no data props required. Only pass props to override.

**Top-bar components**


| Export               | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `NewChatButton`      | `+` button; wires `useChatList().newChat` automatically               |
| `ModeSwitch`         | Simple / Auto / Think pill group; wires `reasoningMode` automatically |
| `ChatSelect`         | Trigger button + `ChatSelectMenu` dropdown; wires `useChatList`       |
| `ChatSelectMenu`     | Scrollable list of chat rows                                          |
| `ChatSelectMenuItem` | Single chat row with delete affordance                                |


**Message-list components**


| Export                  | Description                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| `EmptyView`             | "How can I help?" empty state with suggested-prompt chips from context |
| `SuggestedPromptButton` | Single prompt chip; accepts `label` + `onClick`                        |


`EmptyView` props: `maxSuggestedPrompts` (default `3`), `suggestedPrompts` (falls back to context), `onSelect`, `darkMode`, `components.SuggestedPromptButton`.

**Input-bar components**


| Export                   | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `ChatInput`              | Frosted-glass container + styled textarea; pass `renderSubmitButton` for the action row |
| `AttachButton`           | Styled file-attach button with default `<Paperclip>` icon                               |
| `MicButton`              | Styled mic toggle; share a `transcriber` instance with `TranscriptionIndicator`         |
| `TranscriptionIndicator` | Pulsing dot + live transcript text; requires a shared `transcriber` prop                |
| `SendButton`             | Styled send/stop toggle; wires `adapter` automatically                                  |




### 3. Compose regions (Layer 3)

Same styled atomic components, assembled into full-height regions. Use when you want to replace one region (e.g. a custom top bar) while keeping the others as-is:

```tsx
import {
  AgentProvider,
  ChatTopBar,
  ChatMessageList,
  ChatInputBar,
} from "gluon-ai/react";

<AgentProvider basePath="/api/gluon-ai">
  <ChatTopBar />
  <ChatMessageList />
  <ChatInputBar />
</AgentProvider>;
```

`ChatTopBar`: `showReasoningPills`, `showChatHistory`, `onNewChat`, `slots.newChatButton`, `style` / `className` / `styles`, `darkMode`.

`ChatMessageList`: `autoScroll`, `emptyView`, `skeleton`, `slots` (`userMessage`, `assistantMessage`, `thoughtWindow`, `textContent`), `style` / `className` / `styles`, `darkMode`.

`ChatInputBar`: `placeholder`, `disclaimer`, `attach`, `voice`, `slots.sendButton`, `style` / `className` / `styles`, `darkMode`.

### 4. Headless: full control

Behavior-only primitives. Zero built-in styles; supply your own CSS.

```tsx
import { AgentProvider } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon-ai">
  {/* anything from gluon goes here; assemble as you like (see below) */}
</AgentProvider>;
```

**Panel / layout**


| Export                      | Description                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentPanel`                | Headless skeleton with `data-slot` regions (`agent-panel`, `sidebar`, `main`, `header`, `body`, `input`). No built-in CSS; style via CSS or `classNames` / `styles` / render props |
| `ChatList` / `ChatListItem` | Chat history list + single row                                                                                                                                                     |


**Messages**


| Export              | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `MessageList`       | Scrollable message thread (user + assistant turns)     |
| `UserMessage`       | User bubble                                            |
| `AssistantMessage`  | Assistant bubble (text, tools, slots)                  |
| `ThoughtWindow`     | Reasoning / tool-progress panel                        |
| `ConfirmationBlock` | Approval UI when a tool needs confirmation             |
| `ActionBlockSlot`   | Renders a registered action-block component for a tool |


**Input (headless)**


| Export                                  | Description                                                  |
| --------------------------------------- | ------------------------------------------------------------ |
| `HeadlessChatInput`                     | Composer (textarea + wiring for send/stop/attach); no styles |
| `HeadlessSendButton`                    | Send control (send-only, no stop); no styles                 |
| `HeadlessAttachButton`                  | File attach control; no styles                               |
| `StopButton`                            | Cancel-run control; no styles                                |
| `RecordButton` / `TranscribeButton`     | Voice record / speech-to-text controls                       |
| `RecordingIndicator` / `LiveTranscript` | Recording state + live transcript display                    |
| `AttachmentChip`                        | Chip for an attached file                                    |


**Hooks** (use inside `AgentProvider`)


| Export                                     | Description                                                         |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `useAgentContext`                          | `adapter`, `basePath`, `actionBlocks`, `suggestedPrompts`, `toolUi` |
| `useAgentAdapter`                          | Session/run adapter (messages, send, stop, live events)             |
| `useChatInput`                             | Controlled composer state                                           |
| `useChatList`                              | List / create / switch chats                                        |
| `useAttachments`                           | File attachment state for the composer                              |
| `useReasoningMode`                         | Simple / Auto / Think mode                                          |
| `useRecorder` / `useSpeechTranscriber`     | Mic recording + transcription                                       |
| `useFileExtraction` / `useComposerActions` | File text extraction + composer action helpers                      |


---



## Configure the agent (`agent.config.json`)

```json
{
  "model": "openai/o4-mini",
  "systemPrompt": "./agent/system-prompt.md",
  "maxOutputTokens": 16384,
  "maxRounds": 25,
  "tools": {
    "web_search": "./agent/tools/webSearch.ts"
  },
  "actionBlocks": {},
  "skills": [],
  "context": ["./agent/context/datetime.ts"],
  "auth": {
    "handler": "allow"
  },
  "sendReasoning": false,
  "suggestedPrompts": [
    "What's happening in the news today?",
    "Search for the latest on AI models"
  ],
  "env": {
    "openaiApiKey": "OPENAI_API_KEY",
    "databaseUrl": "AGENT_DATABASE_URL",
    "redisUrl": "REDIS_URL"
  }
}
```


| Field                        | What it does                                                           |
| ---------------------------- | ---------------------------------------------------------------------- |
| `model`                      | `provider/model` string. See [AI model providers](#ai-model-providers) |
| `systemPrompt`               | Inline string **or** path to a `.md` / `.txt` file                     |
| `tools`                      | Map of tool name → `defineTool` module path                            |
| `skills`                     | Markdown docs the agent can load via built-in `read_skill`             |
| `context`                    | Providers called fresh every request; injected under `## Context`      |
| `actionBlocks`               | Tool name → React component path for in-stream UI cards                |
| `auth.handler`               | `"allow"`                                                              |
| `hooks`                      | Path exporting optional `onRunStart` / `onRunEnd` / `onRunError`       |
| `db.provider` / `db.adapter` | Built-in Prisma provider, or a custom DB adapter path                  |
| `suggestedPrompts`           | Empty-state chips (also served from `GET …/config`)                    |
| `env.*`                      | Remap env var **names** if yours differ from the defaults              |


Full schema: `[packages/core/agent.config.schema.json](packages/core/agent.config.schema.json)`

---



## AI model providers

Set `model` in `agent.config.json` to a `provider/model` string. The prefix selects the provider; everything else is the model ID.

For each provider, set its API key **and** install its optional SDK package. Gluon detects both at startup and registers the provider automatically. No code changes needed.


| Provider  | Model prefix | Env var                        | Install                   |
| --------- | ------------ | ------------------------------ | ------------------------- |
| OpenAI    | `openai`     | `OPENAI_API_KEY`               | `npm i @ai-sdk/openai`    |
| Anthropic | `anthropic`  | `ANTHROPIC_API_KEY`            | `npm i @ai-sdk/anthropic` |
| Google    | `google`     | `GOOGLE_GENERATIVE_AI_API_KEY` | `npm i @ai-sdk/google`    |
| Mistral   | `mistral`    | `MISTRAL_API_KEY`              | `npm i @ai-sdk/mistral`   |
| Groq      | `groq`       | `GROQ_API_KEY`                 | `npm i @ai-sdk/groq`      |
| xAI       | `xai`        | `XAI_API_KEY`                  | `npm i @ai-sdk/xai`       |
| DeepSeek  | `deepseek`   | `DEEPSEEK_API_KEY`             | `npm i @ai-sdk/deepseek`  |


All provider packages are optional. If a provider's package is missing or its key is not set, that prefix is silently skipped (no error, just unavailable).

Example:

```env
OPENAI_API_KEY=sk-...
```

```json
{ "model": "openai/o4-mini" }
```

```env
ANTHROPIC_API_KEY=sk-ant-...
```

```json
{ "model": "anthropic/claude-sonnet-4.6" }
```



### Via Vercel AI Gateway (optional; skips per-provider packages)

Prefix any model string with `gateway/` to route through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). One key covers every supported model; no per-provider packages needed.

```env
AI_GATEWAY_API_KEY=your_gateway_key
```

```json
{ "model": "gateway/anthropic/claude-sonnet-4.6" }
{ "model": "gateway/google/gemini-2.0-flash" }
```



### Custom env var names

If your key is stored under a different name, remap it:

```json
{
  "model": "anthropic/claude-sonnet-4.6",
  "env": { "anthropicApiKey": "MY_CLAUDE_KEY" }
}
```

---



## Tools



### Default behaviour (no tools configured)

Three built-in tools are always available, regardless of what you configure:


| Tool                   | When it fires                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `discover_tools`       | Agent calls this automatically before using any custom tool for the first time to read descriptions and parameter signatures |
| `request_confirmation` | Called when a tool has `needsApproval: true`; pauses the run and shows a confirmation card in the UI                         |
| `read_skill`           | Added automatically when `skills` is non-empty; lets the agent load a skill document on demand                               |




### Defining a tool

```typescript
// agent/tools/myTool.ts
import { defineTool } from "gluon-ai";
import { z } from "zod";

export default defineTool({
  description: "Does something useful.",
  displayLabel: "My Tool",
  inputSchema: z.object({
    query: z.string().describe("The input query"),
  }),
  execute: async ({ query }) => {
    return { result: `Processed: ${query}` };
  },
  needsApproval: false,
  ui: {
    executingLabel: "Working…",
    completedLabel: "Done",
    icon: "Globe",
  },
});
```

```json
{ "tools": { "my_tool": "./agent/tools/myTool.ts" } }
```

All `defineTool` fields:


| Field               | Required | Description                                                                                         |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `description`       | Yes      | Shown to the model; describe what the tool does and when to use it                                  |
| `inputSchema`       | Yes      | Zod schema; the model must match it; used for TypeScript types in `execute`                         |
| `execute`           | Yes      | Called with the validated input when the agent decides to invoke the tool                           |
| `displayLabel`      | No       | Short human-readable name shown in the UI (e.g. "Web Search")                                       |
| `needsApproval`     | No       | `true` / `false` or a function `(input) => boolean`. See below                                      |
| `ui.executingLabel` | No       | ThoughtWindow text while the tool is running (e.g. `"Searching…"`)                                  |
| `ui.completedLabel` | No       | ThoughtWindow text after the tool finishes (e.g. `"Search done"`)                                   |
| `ui.icon`           | No       | Lucide icon name for the ThoughtWindow row (e.g. `"Globe"`, `"FileText"`); defaults to `"Settings"` |




### Human approval

Set `needsApproval: true` (or a function that inspects the input and returns `true`) to pause the run before the tool executes. The user sees a confirmation card in the chat; if they approve the tool runs, if they reject the run stops.

```typescript
// Approve only for destructive-looking queries
needsApproval: ({ query }) => query.toLowerCase().includes("delete"),
```

The `request_confirmation` built-in tool handles the pause/resume handshake automatically. You do not need to wire anything in the UI beyond rendering `ChatMessageList` or `MessageList` (which includes `ConfirmationBlock`).

### Scaffolding with the CLI

```bash
npx gluon-ai add-tool my_tool
# → writes agent/tools/my_tool.ts and adds it to agent.config.json
```

---



## Skills



### What skills are

Skills are Markdown documents the agent **reads on demand**. They are never injected into every request's system prompt. When `skills` is non-empty, gluon adds a `read_skill` tool and instructs the agent to call it before using domain-specific tools. This keeps request context small while giving the agent access to deep documentation when it needs it.

Typical uses: step-by-step procedures, domain glossaries, API cheat-sheets, policy documents.

### Default behaviour (no skills configured)

`read_skill` is not registered and no skill content is ever sent to the model.

### Creating a skill

```bash
npx gluon-ai add-skill how-to-search
# → writes agent/skills/how-to-search.md and registers it in agent.config.json
```

Edit the generated file with whatever the agent should know. Plain Markdown works: headings, code blocks, bullet lists:

```markdown
<!-- agent/skills/how-to-search.md -->

# How to search the web

Use the `web_search` tool with a concise query. Prefer recent date qualifiers
when the topic is time-sensitive. Always cite the source URL in your response.

## When NOT to search

- The answer is in your training data and does not change (e.g. language syntax).
- The user has already provided the source material inline.
```

```json
{ "skills": ["./agent/skills/how-to-search.md"] }
```

At runtime the agent receives an index of available skills and their numbers. It calls `read_skill(index)` to fetch a document when it decides it's relevant.

### Skills vs context providers


|              | Skills                                      | Context providers                                  |
| ------------ | ------------------------------------------- | -------------------------------------------------- |
| When loaded  | On demand by the agent (`read_skill`)       | Every request, unconditionally                     |
| Content type | Static Markdown docs, procedures, reference | Dynamic values: current time, user state, env data |
| Token cost   | Only when read                              | Always added to every system prompt                |


Use **skills** for large reference material that is only sometimes needed. Use **context providers** for small dynamic strings that should always be present.

---



## Context providers



### What context providers do

A context provider is a plain async function that returns a string. Gluon calls every registered provider **fresh on every agent request** and appends the results to the system prompt under a `## Context` block. The agent always sees current values (no stale cache).

### Default behaviour

`init` scaffolds `agent/context/datetime.ts` which returns the current date and time. This keeps the agent temporally grounded without hardcoding anything in the system prompt.

### Defining a context provider

```typescript
// agent/context/datetime.ts
export default async function (): Promise<string> {
  return `Current date and time: ${new Date().toLocaleString()}`;
}
```

```json
{ "context": ["./agent/context/datetime.ts"] }
```

The returned string is appended verbatim under `## Context` in the system prompt. Keep it short; it costs tokens on every request.

### Multiple providers

List any number of files; each one contributes a line to the `## Context` block:

```json
{
  "context": [
    "./agent/context/datetime.ts",
    "./agent/context/userProfile.ts",
    "./agent/context/featureFlags.ts"
  ]
}
```



### Accessing external data

Context providers are regular async functions. You can fetch from your DB, call an API, or read environment variables:

```typescript
// agent/context/userProfile.ts
import { db } from "@/lib/db";

export default async function (): Promise<string> {
  const user = await db.user.findFirst({
    where: { email: process.env.DEV_USER_EMAIL },
  });
  return user
    ? `Active user: ${user.name} (${user.plan} plan)`
    : "No user context available.";
}
```

> **Note:** Context providers receive no request arguments and have no access to the calling user's session. For per-user dynamic context, use hooks or access user information through environment variables or a shared server-side session store. If you need the userId at request time, use tool handlers and pass context via closures instead.

---



## Auth



### Default behaviour (no config needed)

Out of the box, all requests are **allowed without a check** and attributed to the user ID `"anon"`. Every chat session, message, and run is stored under that single identity. This is fine for local development, internal tools, or single-user demos.

### Adding an auth gate

Wire in your own auth logic by creating a handler module and pointing `agent.config.json` at it:

```json
{ "auth": { "handler": "./agent/auth.ts" } }
```

The handler is a TypeScript file that **default-exports** an async function receiving the raw `Request`. Return a value to tell Gluon what to do:


| Return value         | Effect                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `string` (non-empty) | Request is allowed; the string is used as the **userId** (scopes chat history, runs, etc.) |
| `true`               | Request is allowed as the anonymous user `"anon"`                                          |
| `false` or `null`    | Request is **rejected with HTTP 401**                                                      |


```typescript
// agent/auth.ts  (example using NextAuth v5)
import { auth } from "@/auth";

export default async function (req: Request): Promise<string | boolean | null> {
  const session = await auth();
  return session?.user?.id ?? null;
  // → returns the user's ID when signed in, null (→ 401) when not
}
```



### What the userId controls

Once a userId is returned, Gluon:

- **Scopes all chat sessions** to that userId. Users only see their own chat history.
- **Scopes all run records** to that userId. Billing, rate-limiting, and logs are per-user.
- Passes the userId to **lifecycle hooks** (`onRunStart`, `onRunEnd`, `onRunError`) so you can record usage, enforce rate limits, or trigger billing per user.



### Role-based access

Return `null` (401) for any user you want to block, or segment access by returning different user IDs based on your own logic:

```typescript
// agent/auth.ts (block non-admins from the agent endpoint)
import { auth } from "@/auth";

export default async function (req: Request) {
  const session = await auth();
  if (!session?.user) return null; // not signed in → 401
  if (session.user.role !== "admin") return null; // signed in but not admin → 401
  return session.user.id; // admin → allow, scoped to their ID
}
```

---



## Action blocks (in-stream UI)



### What action blocks do

An action block is a React component that replaces the default tool-row in the chat stream for a specific tool. By default, tool calls show a text row in the ThoughtWindow (using `ui.executingLabel` / `ui.completedLabel`). Register an action block to render a full UI card (a map, a data table, a preview) inside the message thread instead.

### Default behaviour (no action blocks)

Tool invocations appear as collapsible rows in the ThoughtWindow. No custom UI components are loaded.

### Defining an action block

```tsx
// agent/blocks/MyToolBlock.tsx
"use client";
import type { ActionBlockProps } from "gluon-ai";

export default function MyToolBlock({
  toolInput,
  toolOutput,
  state,
}: ActionBlockProps) {
  const isRunning = state === "call";
  if (isRunning) return <div>Running…</div>;
  return <div>Result: {JSON.stringify(toolOutput)}</div>;
}
```

```json
{ "actionBlocks": { "my_tool": "./agent/blocks/MyToolBlock.tsx" } }
```

All `ActionBlockProps` fields:


| Prop         | Type      | Description                                                                 |
| ------------ | --------- | --------------------------------------------------------------------------- |
| `toolInput`  | `unknown` | The validated input the agent passed to the tool                            |
| `toolOutput` | `unknown` | The value returned by `execute` (undefined while the tool is still running) |
| `toolName`   | `string`  | The registered tool name (e.g. `"my_tool"`)                                 |
| `messageId`  | `string`  | ID of the assistant message this block belongs to                           |
| `state`      | `"call"`  | `"result"`                                                                  |




### Wiring the component to the client

The config path is used for server-side loading only. The client bundle can't load TypeScript paths at runtime, so you must pass the imported component explicitly:

```tsx
import MyToolBlock from "@/agent/blocks/MyToolBlock";

// Drop-in panel:
<GluonAgentPanel actionBlocks={{ my_tool: MyToolBlock }} />

// Or via AgentProvider directly:
<AgentProvider actionBlocks={{ my_tool: MyToolBlock }}>…</AgentProvider>
```

---



## Token usage & lifecycle hooks



### Default behaviour

Token counts are tracked automatically on every run. No config needed to access them.

### Server-side hooks

Register a hooks file to run code at key points in the agent lifecycle. All hooks receive `userId` from your auth handler.

```json
{ "hooks": "./agent/hooks.ts" }
```

```typescript
// agent/hooks.ts
import type { TokenUsage } from "gluon-ai";

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
}
```

`usage` is summed across all tool-call rounds in the run. It reflects the total cost of the full agent loop, not just the final response step.

### Client-side token display

`adapter.lastRunUsage` holds the counts from the most recent completed run. Access it anywhere inside `AgentProvider`:

```tsx
"use client";
import { useAgentContext } from "gluon-ai/react";

export function TokenCounter() {
  const { adapter } = useAgentContext();
  const usage = adapter.lastRunUsage;
  if (!usage) return null;
  return (
    <p>
      Last run: {usage.totalTokens} tokens ({usage.promptTokens} in /{" "}
      {usage.completionTokens} out)
    </p>
  );
}
```

---



## CLI reference

```text
npx gluon-ai <command>
```


| Command            | Flags                                         | Description                                                                                 |
| ------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `start`            |                                               | Boot the Hono server + BullMQ worker. Used as CMD in the Dockerfile; also works with pm2    |
| `init [dir]`       | `--default` / `-y`, `--development` / `--dev` | Scaffold `gluon/` folder with Dockerfile, docker-compose.yml, agent.config.json, and agent/ |
| `install [dir]`    | `--development` / `--dev`                     | Run install; `--development` uses `--install-links` for local `file:` packages              |
| `add-tool [name]`  |                                               | Scaffold `agent/tools/<name>.ts` + register in config                                       |
| `add-skill [name]` |                                               | Scaffold `agent/skills/<name>.md` + register in config                                      |
| `uninstall [dir]`  | interactive confirm                           | Remove scaffolded files and uninstall the package                                           |
| `--help` / `-h`    |                                               | Print help                                                                                  |


Uninstall does **not** drop DB tables. Remove them yourself if needed:

```sql
DROP TABLE "gluon_chat_job_run", "gluon_chat";
```

Convenience script after init:

```bash
npm run gluon:uninstall
```

---



## Package exports


| Import                     | Use for                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| `gluon-ai`                 | `defineTool`, shared types (`ActionBlockProps`, `TokenUsage`, …)             |
| `gluon-ai/react`           | Provider, panels, hooks, message/input primitives                            |
| `gluon-ai/app`             | Hono server entry — used internally by `gluon-ai start`                      |
| `gluon-ai/routes`          | Catch-all `GET` / `POST` / `DELETE` handlers (for custom server integration) |
| `gluon-ai/tool`            | Tool helpers / types                                                         |
| `gluon-ai/server`          | Commands, queue, Redis, DB adapter types                                     |
| `gluon-ai/instrumentation` | `register()` starts the worker (Next.js embedded mode — still supported)     |
| `gluon-ai/cli`             | CLI command implementations (used by the `gluon-ai` bin)                     |


API surface under the catch-all (last path segment): `events`, `thread`, `chats`, `commands`, `config`.

---



## Currently working on

- `gluon-ai dev` watch command (restart container on agent/ file changes)
- `gluon-ai logs` convenience wrapper for `docker compose logs -f gluon`
- GHCR base image (`ghcr.io/gluon-ai/server:beta`) so compose can use `image:` instead of `build:` — eliminates the npm install build time entirely
- More polished default UI affordances
- Stability, tests, and multi-DB edge cases

---



## License

MIT