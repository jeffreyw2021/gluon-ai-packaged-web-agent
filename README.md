# Gluon-ai

> **Beta** — personal project, rough edges expected.

Sometimes you want to build an AI-native product from scratch. Sometimes you just want an agent inside an existing product. The backend for that second case is mostly the same every time — chats, streaming, tools, a worker, Redis, a DB. Gluon packages that stack so you can drop an agent into a Next.js app and focus on the product side.

Built for myself. Shared in case it's useful.

---

## Compatibility

**Next.js only** for now.


| Requirement | Notes                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 15+ | App Router                                                                                                                             |
| React 19+   |                                                                                                                                        |
| PostgreSQL  | Best supported. MySQL / SQLite available via init; less battle-tested                                                                  |
| Redis       | Required for the BullMQ worker + live events                                                                                           |
| AI provider | OpenAI included; Anthropic, Google, Mistral, Groq, xAI, DeepSeek, or Vercel AI Gateway — see [AI model providers](#ai-model-providers) |


---



## Quick start

```bash
npm install gluon-ai@beta
```

> **Package manager:** npm is the supported path for host apps right now. pnpm can install the package, but init / Prisma generate / local `file:` linking (`--development`) are npm-first and often break under pnpm’s store layout. Use npm for consumer projects until that’s fixed.

Put secrets in `.env` / `.env.local` **before** init (the wizard detects existing names):

```env
OPENAI_API_KEY=sk-...

AGENT_DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
REDIS_URL=redis://localhost:6379
```

> OpenAI works out of the box. For other providers see [AI model providers](#ai-model-providers).

```bash
npx gluon-ai init          # interactive
# or
npx gluon-ai init --default   # accept all defaults (-y also works)
```

```bash
npm run dev
```

Drop in the packaged panel:

```tsx
"use client";
import { GluonAgentPanel } from "gluon-ai/react";

export default function Page() {
  return <GluonAgentPanel darkMode frostedGlass />;
}
```

That's enough for a working agent with web search, multi-chat, streaming, and the background worker.

---



## What init scaffolds


| Path                                              | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `agent.config.json`                               | Model, tools, auth, prompts, env remaps      |
| `agent/package.json`                              | `{ "type": "module" }` — silences Node ESM warnings when loading tools |
| `agent/system-prompt.md`                          | Default system prompt (edit this freely)     |
| `agent/tools/webSearch.ts`                        | Example tool (OpenAI web search)             |
| `agent/context/datetime.ts`                       | Example context provider (current date/time) |
| `[app|src/app]/api/gluon-ai/[[...path]]/route.ts` | Catch-all API route                          |
| `instrumentation.ts`                              | Starts the BullMQ worker on Next.js boot     |


Also:

- Patches `next.config` with `serverExternalPackages: ["gluon-ai"]`
- Adds `gluon:uninstall` to your `package.json` scripts
- Creates agent tables (`gluon_chat`, `gluon_chat_job_run`) with idempotent SQL — your existing Prisma schema is never modified

```
agent/
  package.json          # { "type": "module" } — required for Node dynamic imports
  system-prompt.md
  tools/
    webSearch.ts
  context/
    datetime.ts
  skills/          # you create these (npx gluon-ai add-skill)
  blocks/          # you create these (action block components)

agent.config.json
instrumentation.ts
[app]/api/gluon-ai/[[...path]]/route.ts
```

> **Local package development:** if you're linking a `file:` copy of gluon into an app and Turbopack can't resolve subpath exports, use `npx gluon-ai init --default --development` (or `npx gluon-ai install --development`). That reinstalls with `--install-links` so deps are copied into `node_modules` instead of symlinked.

---



## Frontend — four layers of UI

Everything lives under `gluon-ai/react`. Pick the layer that matches how much control you want.

### 1. Drop-in — `GluonAgentPanel` (recommended)

Provider + top bar + messages + input, with built-in styles.

```tsx
import { GluonAgentPanel } from "gluon-ai/react";

<GluonAgentPanel basePath="/api/gluon-ai" />
```

`basePath` defaults to `"/api/gluon-ai"` and can be omitted.


| Prop                                  | Description                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `basePath`                            | API route prefix (default `"/api/gluon-ai"`)                                              |
| `darkMode`                            | Dark palette for the shell and all children                                               |
| `frostedGlass`                        | Blur + translucent shell instead of a solid background                                    |
| `suggestedPrompts`                    | Empty-state chips; omit to load from `GET {basePath}/config`                              |
| `actionBlocks`                        | Map of tool name → React component for in-stream UI                                       |
| `queryClient`                         | Share an existing TanStack Query client                                                   |
| `style` / `className`                 | Applied to the outermost shell                                                            |
| `topBar` / `messageList` / `inputBar` | Prop overrides forwarded to each Layer 3 child                                            |
| `children`                            | Replace the default body while keeping `AgentProvider`                                    |




### 2. Styled atoms — Layer 2

Fine-grained, default-styled controls. Wire one atom at a time into your own layout:

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
  {/* your own layout — place atoms wherever you like */}
  <NewChatButton />
  <ModeSwitch />
  <ChatSelect />
  <EmptyView maxSuggestedPrompts={3} />
  <ChatInput renderSubmitButton={({ isActive, canSend }) => (
    <div>
      <AttachButton />
      <MicButton />
      <SendButton />
    </div>
  )} />
</AgentProvider>
```

All atoms read from `AgentProvider` — no data props required. Only pass props to override.

**Top-bar atoms**

| Export              | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `NewChatButton`     | `+` button; wires `useChatList().newChat` automatically               |
| `ModeSwitch`        | Simple / Auto / Think pill group; wires `reasoningMode` automatically |
| `ChatSelect`        | Trigger button + `ChatSelectMenu` dropdown; wires `useChatList`       |
| `ChatSelectMenu`    | Scrollable list of chat rows                                          |
| `ChatSelectMenuItem`| Single chat row with delete affordance                                |

**Message-list atoms**

| Export                  | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `EmptyView`             | "How can I help?" empty state with suggested-prompt chips from context    |
| `SuggestedPromptButton` | Single prompt chip; accepts `label` + `onClick`                           |

`EmptyView` props: `maxSuggestedPrompts` (default `3`), `suggestedPrompts` (falls back to context), `onSelect`, `darkMode`, `components.SuggestedPromptButton`.

**Input-bar atoms**

| Export                    | Description                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| `ChatInput`               | Frosted-glass container + styled textarea; pass `renderSubmitButton` for the action row |
| `AttachButton`            | Styled file-attach button with default `<Paperclip>` icon                    |
| `MicButton`               | Styled mic toggle; share a `transcriber` instance with `TranscriptionIndicator` |
| `TranscriptionIndicator`  | Pulsing dot + live transcript text; requires a shared `transcriber` prop     |
| `SendButton`              | Styled send/stop toggle; wires `adapter` automatically                       |



### 3. Compose regions — Layer 3

Same styled atoms, assembled into full-height regions. Use when you want to replace one region (e.g. a custom top bar) while keeping the others as-is:

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
</AgentProvider>
```

`ChatTopBar`: `showReasoningPills`, `showChatHistory`, `onNewChat`, `slots.newChatButton`, `style` / `className` / `styles`, `darkMode`.

`ChatMessageList`: `autoScroll`, `emptyView`, `skeleton`, `slots` (`userMessage`, `assistantMessage`, `thoughtWindow`, `textContent`), `style` / `className` / `styles`, `darkMode`.

`ChatInputBar`: `placeholder`, `disclaimer`, `attach`, `voice`, `slots.sendButton`, `style` / `className` / `styles`, `darkMode`.

### 4. Headless — full control

Behavior-only primitives. Zero built-in styles — supply your own CSS.

```tsx
import { AgentProvider } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon-ai">
  {/* anything from gluon goes here — assemble as you like; see below */}
</AgentProvider>
```

**Panel / layout**


| Export                      | Description                                                                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentPanel`                | Headless skeleton with `data-slot` regions (`agent-panel`, `sidebar`, `main`, `header`, `body`, `input`). No built-in CSS — style via CSS or `classNames` / `styles` / render props |
| `ChatList` / `ChatListItem` | Chat history list + single row                                                                                                                                                      |


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


| Export                                  | Description                                                             |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `HeadlessChatInput`                     | Composer (textarea + wiring for send/stop/attach) — no styles           |
| `HeadlessSendButton`                    | Send control (send-only, no stop) — no styles                           |
| `HeadlessAttachButton`                  | File attach control — no styles                                         |
| `StopButton`                            | Cancel-run control — no styles                                          |
| `RecordButton` / `TranscribeButton`     | Voice record / speech-to-text controls                                  |
| `RecordingIndicator` / `LiveTranscript` | Recording state + live transcript display                               |
| `AttachmentChip`                        | Chip for an attached file                                               |


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


| Field                        | What it does                                                            |
| ---------------------------- | ----------------------------------------------------------------------- |
| `model`                      | `provider/model` string — see [AI model providers](#ai-model-providers) |
| `systemPrompt`               | Inline string **or** path to a `.md` / `.txt` file                      |
| `tools`                      | Map of tool name → `defineTool` module path                             |
| `skills`                     | Markdown docs the agent can load via built-in `read_skill`              |
| `context`                    | Providers called fresh every request; injected under `## Context`       |
| `actionBlocks`               | Tool name → React component path for in-stream UI cards                 |
| `auth.handler`               | `"allow"` | `"deny"` | path to a custom handler                         |
| `hooks`                      | Path exporting optional `onRunStart` / `onRunEnd` / `onRunError`        |
| `db.provider` / `db.adapter` | Built-in Prisma provider, or a custom DB adapter path                   |
| `suggestedPrompts`           | Empty-state chips (also served from `GET …/config`)                     |
| `env.*`                      | Remap env var **names** if yours differ from the defaults               |


Full schema: `[packages/core/agent.config.schema.json](packages/core/agent.config.schema.json)`

---



## AI model providers

Set `model` in `agent.config.json` to a `provider/model` string. The prefix selects the provider; everything else is the model ID.

### OpenAI (included — no extra steps)

`@ai-sdk/openai` ships with gluon. Set the key and pick a model:

```env
OPENAI_API_KEY=sk-...
```

```json
{ "model": "openai/o4-mini" }
```

### Other providers

For any other provider, set its API key **and** install its optional SDK package. Gluon detects both at startup and registers the provider automatically — no code changes needed.

| Provider   | Model prefix | Env var                        | Install                   |
| ---------- | ------------ | ------------------------------ | ------------------------- |
| Anthropic  | `anthropic`  | `ANTHROPIC_API_KEY`            | `npm i @ai-sdk/anthropic` |
| Google     | `google`     | `GOOGLE_GENERATIVE_AI_API_KEY` | `npm i @ai-sdk/google`    |
| Mistral    | `mistral`    | `MISTRAL_API_KEY`              | `npm i @ai-sdk/mistral`   |
| Groq       | `groq`       | `GROQ_API_KEY`                 | `npm i @ai-sdk/groq`      |
| xAI        | `xai`        | `XAI_API_KEY`                  | `npm i @ai-sdk/xai`       |
| DeepSeek   | `deepseek`   | `DEEPSEEK_API_KEY`             | `npm i @ai-sdk/deepseek`  |

Example after installing and setting the key:

```json
{ "model": "anthropic/claude-sonnet-4.6" }
```

If a provider's package is missing or its key is not set, that prefix is silently skipped — no error, just unavailable.

### Via Vercel AI Gateway (optional — skips per-provider packages)

Prefix any model string with `gateway/` to route through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). One key covers every supported model — no per-provider packages needed.

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

| Tool | When it fires |
| --- | --- |
| `discover_tools` | Agent calls this automatically before using any custom tool for the first time to read descriptions and parameter signatures |
| `request_confirmation` | Called when a tool has `needsApproval: true` — pauses the run and shows a confirmation card in the UI |
| `read_skill` | Added automatically when `skills` is non-empty — lets the agent load a skill document on demand |

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

| Field | Required | Description |
| --- | --- | --- |
| `description` | Yes | Shown to the model — describe what the tool does and when to use it |
| `inputSchema` | Yes | Zod schema; the model must match it; used for TypeScript types in `execute` |
| `execute` | Yes | Called with the validated input when the agent decides to invoke the tool |
| `displayLabel` | No | Short human-readable name shown in the UI (e.g. "Web Search") |
| `needsApproval` | No | `true` / `false` or a function `(input) => boolean` — see below |
| `ui.executingLabel` | No | ThoughtWindow text while the tool is running (e.g. `"Searching…"`) |
| `ui.completedLabel` | No | ThoughtWindow text after the tool finishes (e.g. `"Search done"`) |
| `ui.icon` | No | Lucide icon name for the ThoughtWindow row (e.g. `"Globe"`, `"FileText"`) — defaults to `"Settings"` |

### Human approval

Set `needsApproval: true` (or a function that inspects the input and returns `true`) to pause the run before the tool executes. The user sees a confirmation card in the chat; if they approve the tool runs, if they reject the run stops.

```typescript
// Approve only for destructive-looking queries
needsApproval: ({ query }) => query.toLowerCase().includes("delete"),
```

The `request_confirmation` built-in tool handles the pause/resume handshake automatically — you do not need to wire anything in the UI beyond rendering `ChatMessageList` or `MessageList` (which includes `ConfirmationBlock`).

### Scaffolding with the CLI

```bash
npx gluon-ai add-tool my_tool
# → writes agent/tools/my_tool.ts and adds it to agent.config.json
```

---



## Skills

### What skills are

Skills are Markdown documents the agent **reads on demand** — they are never injected into every request's system prompt. When `skills` is non-empty, gluon adds a `read_skill` tool and instructs the agent to call it before using domain-specific tools. This keeps request context small while giving the agent access to deep documentation when it needs it.

Typical uses: step-by-step procedures, domain glossaries, API cheat-sheets, policy documents.

### Default behaviour (no skills configured)

`read_skill` is not registered and no skill content is ever sent to the model.

### Creating a skill

```bash
npx gluon-ai add-skill how-to-search
# → writes agent/skills/how-to-search.md and registers it in agent.config.json
```

Edit the generated file with whatever the agent should know. Plain Markdown — headings, code blocks, bullet lists all work:

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

| | Skills | Context providers |
| --- | --- | --- |
| When loaded | On demand by the agent (`read_skill`) | Every request, unconditionally |
| Content type | Static Markdown docs, procedures, reference | Dynamic values: current time, user state, env data |
| Token cost | Only when read | Always added to every system prompt |

Use **skills** for large reference material that is only sometimes needed. Use **context providers** for small dynamic strings that should always be present.

---



## Context providers

### What context providers do

A context provider is a plain async function that returns a string. Gluon calls every registered provider **fresh on every agent request** and appends the results to the system prompt under a `## Context` block. The agent always sees current values — no stale cache.

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

The returned string is appended verbatim under `## Context` in the system prompt. Keep it short — it costs tokens on every request.

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

Context providers are regular async functions — you can fetch from your DB, call an API, or read environment variables:

```typescript
// agent/context/userProfile.ts
import { db } from "@/lib/db";

export default async function (): Promise<string> {
  const user = await db.user.findFirst({ where: { email: process.env.DEV_USER_EMAIL } });
  return user ? `Active user: ${user.name} (${user.plan} plan)` : "No user context available.";
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

| Return value | Effect |
| ------------ | ------ |
| `string` (non-empty) | Request is allowed; the string is used as the **userId** (scopes chat history, runs, etc.) |
| `true` | Request is allowed as the anonymous user `"anon"` |
| `false` or `null` | Request is **rejected with HTTP 401** |

```typescript
// agent/auth.ts  — example using NextAuth v5
import { auth } from "@/auth";

export default async function (req: Request): Promise<string | boolean | null> {
  const session = await auth();
  return session?.user?.id ?? null;
  // → returns the user's ID when signed in, null (→ 401) when not
}
```

### What the userId controls

Once a userId is returned, Gluon:
- **Scopes all chat sessions** to that userId — users only see their own chat history.
- **Scopes all run records** to that userId — billing, rate-limiting, and logs are per-user.
- Passes the userId to **lifecycle hooks** (`onRunStart`, `onRunEnd`, `onRunError`) so you can record usage, enforce rate limits, or trigger billing per user.

### Role-based access

Return `null` (401) for any user you want to block, or segment access by returning different user IDs based on your own logic:

```typescript
// agent/auth.ts — block non-admins from the agent endpoint
import { auth } from "@/auth";

export default async function (req: Request) {
  const session = await auth();
  if (!session?.user) return null;              // not signed in → 401
  if (session.user.role !== "admin") return null; // signed in but not admin → 401
  return session.user.id;                       // admin → allow, scoped to their ID
}
```

---



## Action blocks (in-stream UI)

### What action blocks do

An action block is a React component that replaces the default tool-row in the chat stream for a specific tool. By default, tool calls show a text row in the ThoughtWindow (using `ui.executingLabel` / `ui.completedLabel`). Register an action block to render a full UI card — a map, a data table, a preview — inside the message thread instead.

### Default behaviour (no action blocks)

Tool invocations appear as collapsible rows in the ThoughtWindow. No custom UI components are loaded.

### Defining an action block

```tsx
// agent/blocks/MyToolBlock.tsx
"use client";
import type { ActionBlockProps } from "gluon-ai";

export default function MyToolBlock({ toolInput, toolOutput, state }: ActionBlockProps) {
  const isRunning = state === "call";
  if (isRunning) return <div>Running…</div>;
  return <div>Result: {JSON.stringify(toolOutput)}</div>;
}
```

```json
{ "actionBlocks": { "my_tool": "./agent/blocks/MyToolBlock.tsx" } }
```

All `ActionBlockProps` fields:

| Prop | Type | Description |
| --- | --- | --- |
| `toolInput` | `unknown` | The validated input the agent passed to the tool |
| `toolOutput` | `unknown` | The value returned by `execute` (undefined while the tool is still running) |
| `toolName` | `string` | The registered tool name (e.g. `"my_tool"`) |
| `messageId` | `string` | ID of the assistant message this block belongs to |
| `state` | `"call"` \| `"result"` \| `"partial-call"` | Lifecycle state: `"call"` while running, `"result"` after |

### Wiring the component to the client

The config path is used for server-side loading only. The client bundle can't load TypeScript paths at runtime — you must pass the imported component explicitly:

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

`usage` is summed across all tool-call rounds in the run — it reflects the total cost of the full agent loop, not just the final response step.

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
      Last run: {usage.totalTokens} tokens
      ({usage.promptTokens} in / {usage.completionTokens} out)
    </p>
  );
}
```

---



## CLI reference

```text
npx gluon-ai <command>
```


| Command            | Flags                                         | Description                                                                                  |
| ------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `init [dir]`       | `--default` / `-y`, `--development` / `--dev` | Scan project, scaffold files, generate Prisma client, create agent tables, patch next.config |
| `install [dir]`    | `--development` / `--dev`                     | Run install; `--development` uses `--install-links` for local `file:` packages               |
| `add-tool [name]`  |                                               | Scaffold `agent/tools/<name>.ts` + register in config                                        |
| `add-skill [name]` |                                               | Scaffold `agent/skills/<name>.md` + register in config                                       |
| `uninstall [dir]`  | interactive confirm                           | Remove scaffolded files, strip patches, uninstall the package                                |
| `--help` / `-h`    |                                               | Print help                                                                                   |


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


| Import                     | Use for                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `gluon-ai`                 | `defineTool`, shared types (`ActionBlockProps`, `TokenUsage`, …) |
| `gluon-ai/react`           | Provider, panels, hooks, message/input primitives                |
| `gluon-ai/routes`          | Catch-all `GET` / `POST` / `DELETE` handlers                     |
| `gluon-ai/tool`            | Tool helpers / types                                             |
| `gluon-ai/server`          | Commands, queue, Redis, DB adapter types                         |
| `gluon-ai/instrumentation` | `register()` — starts the worker                                 |
| `gluon-ai/cli`             | CLI command implementations (used by the `gluon-ai` bin)         |


API surface under the catch-all (last path segment): `events`, `thread`, `chats`, `commands`, `config`.

---



## Currently working on

- Framework portability beyond Next.js
- More polished default UI affordances
- Setup UX (possibly a visual wizard)
- Stability, tests, and multi-DB edge cases

---



## License

MIT