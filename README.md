# Gluon-ai

> **Beta** — personal project, rough edges expected.

Sometimes you want to build an AI-native product from scratch. Sometimes you just want an agent inside an existing product. The backend for that second case is mostly the same every time — chats, streaming, tools, a worker, Redis, a DB. Gluon packages that stack so you can drop an agent into a Next.js app and focus on the product side.

Built for myself. Shared in case it's useful.

---

## Compatibility

**Next.js only** for now.

| Requirement | Notes |
| ----------- | ----- |
| Next.js 15+ | App Router |
| React 19+ | |
| PostgreSQL | Best supported. MySQL / SQLite available via init; less battle-tested |
| Redis | Required for the BullMQ worker + live events |
| OpenAI API | Only provider supported right now |

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

| Path | Purpose |
| ---- | ------- |
| `agent.config.json` | Model, tools, auth, prompts, env remaps |
| `agent/system-prompt.md` | Default system prompt (edit this freely) |
| `agent/tools/webSearch.ts` | Example tool (OpenAI web search) |
| `agent/context/datetime.ts` | Example context provider (current date/time) |
| `[app\|src/app]/api/gluon-ai/[[...path]]/route.ts` | Catch-all API route |
| `instrumentation.ts` | Starts the BullMQ worker on Next.js boot |

Also:

- Patches `next.config` with `serverExternalPackages: ["gluon-ai"]`
- Adds `gluon:uninstall` to your `package.json` scripts
- Creates agent tables (`gluon_chat`, `gluon_chat_job_run`) with idempotent SQL — your existing Prisma schema is never modified

```
agent/
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

## Frontend — three ways to use the UI

Everything lives under `gluon-ai/react`. Pick the layer that matches how much control you want.

### 1. Drop-in — `GluonAgentPanel` (recommended)

Provider + top bar + messages + input, with built-in styles.

```tsx
import { GluonAgentPanel } from "gluon-ai/react";

<GluonAgentPanel basePath="/api/gluon-ai" />
```

`basePath` defaults to `"/api/gluon-ai"` and can be omitted.

| Prop | Description |
| ---- | ----------- |
| `basePath` | API route prefix (default `"/api/gluon-ai"`) |
| `darkMode` | Dark palette for the shell and Layer 2 children |
| `frostedGlass` | Blur + translucent shell instead of a solid background |
| `suggestedPrompts` | Empty-state chips; omit to load from `GET {basePath}/config` |
| `actionBlocks` | Map of tool name → React component for in-stream UI |
| `queryClient` | Share an existing TanStack Query client |
| `style` / `className` | Applied to the outermost shell |
| `topBar` / `messageList` / `inputBar` | Prop overrides forwarded to each Layer 2 child (`darkMode` stays controlled by the panel) |
| `children` | Replace the default body while keeping `AgentProvider` |

### 2. Compose — Layer 2 pieces

Same styled pieces, assembled yourself inside `AgentProvider`:

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

Each Layer 2 component reads from context — no data props required. Lay them out however you want (flex column, sidebar, etc.).

**`AgentProvider`:** `basePath`, `actionBlocks`, `suggestedPrompts`, `queryClient`.

**`ChatTopBar`:** `showReasoningPills`, `showChatHistory`, `onNewChat`, `slots.newChatButton`, `style` / `className` / `styles`, `darkMode`.

**`ChatMessageList`:** `autoScroll`, `emptyView`, `skeleton`, `slots` (`userMessage`, `assistantMessage`, `thoughtWindow`, `textContent`), `style` / `className` / `styles`, `darkMode`.

**`ChatInputBar`:** `placeholder`, `disclaimer`, `attach`, `voice`, `slots.sendButton`, `style` / `className` / `styles`, `darkMode`.

### 3. Headless — `AgentPanel`

Structural slots only (`data-slot` attributes), no built-in CSS. Full control over look and feel:

```tsx
import { AgentProvider, AgentPanel } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon-ai">
  <AgentPanel />
</AgentProvider>
```

Style via your own CSS targeting `[data-slot="…"]` (`agent-panel`, `sidebar`, `main`, `header`, `body`, `input`).

| Prop | Description |
| ---- | ----------- |
| `showSidebar` | Show/hide the sidebar slot (default `true`) |
| `renderSidebar` / `renderHeader` | Custom render functions for those slots |
| `messageComponents` | Override message list sub-components |
| `suggestedPrompts` | Empty-state chips |
| `attachments` | Pass `useAttachments()` to enable file attach + clear-on-send |
| `className` / `style` | Root element |
| `classNames` / `styles` | Per-slot class and style maps |
### Other exports

Hooks (`useAgentContext`, `useAgentAdapter`, `useChatInput`, `useChatList`, `useAttachments`, …), message primitives (`MessageList`, `UserMessage`, `AssistantMessage`, `ThoughtWindow`, …), and headless buttons (`SendButton`, `StopButton`, `AttachButton`, …) are all available from `gluon-ai/react` when you want a fully custom shell.

---

## Configure the agent (`agent.config.json`)

```json
{
  "model": "gpt-4o",
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

| Field | What it does |
| ----- | ------------ |
| `systemPrompt` | Inline string **or** path to a `.md` / `.txt` file |
| `tools` | Map of tool name → `defineTool` module path |
| `skills` | Markdown docs the agent can load via built-in `read_skill` |
| `context` | Providers called fresh every request; injected under `## Context` |
| `actionBlocks` | Tool name → React component path for in-stream UI cards |
| `auth.handler` | `"allow"` \| `"deny"` \| path to a custom handler |
| `hooks` | Path exporting optional `onRunStart` / `onRunEnd` / `onRunError` |
| `db.provider` / `db.adapter` | Built-in Prisma provider, or a custom DB adapter path |
| `suggestedPrompts` | Empty-state chips (also served from `GET …/config`) |
| `env.*` | Remap env var **names** if yours differ from the defaults |

Full schema: [`packages/core/agent.config.schema.json`](packages/core/agent.config.schema.json)

---

## Tools

```bash
npx gluon-ai add-tool my_tool
```

Or write one by hand:

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
  needsApproval: false, // true → user must confirm before execute
  ui: {
    executingLabel: "Working…",
    completedLabel: "Done",
  },
});
```

Register in config:

```json
{ "tools": { "my_tool": "./agent/tools/myTool.ts" } }
```

Built-in tools (not listed in config): `discover_tools`, `request_confirmation`, and `read_skill` when skills are configured.

---

## Skills

Markdown knowledge the agent pulls in on demand:

```bash
npx gluon-ai add-skill how-to-search
```

Writes `agent/skills/how-to-search.md` and appends it to `skills` in `agent.config.json`.

---

## Context providers

Dynamic strings injected into the system prompt on every request (date/time, user state, env, …):

```typescript
// agent/context/datetime.ts
export default async function (): Promise<string> {
  return `Current date and time: ${new Date().toLocaleString()}`;
}
```

```json
{ "context": ["./agent/context/datetime.ts"] }
```

---

## Auth

Default is `"allow"` (every request is user `"anon"` — fine for local / single-user).

For production, point `auth.handler` at a module that **default-exports** an async function:

```typescript
// agent/auth.ts
import { auth } from "@/auth";

export default async function (req: Request): Promise<string | boolean | null> {
  const session = await auth();
  return session?.user?.id ?? null; // string → allow as that userId; null → 401
}
```

```json
{ "auth": { "handler": "./agent/auth.ts" } }
```

Return values: `string` (userId), `true` (`"anon"`), `false` / `null` (401).

---

## Action blocks (in-stream UI)

```tsx
// agent/blocks/MyToolBlock.tsx
"use client";
import type { ActionBlockProps } from "gluon-ai";

export default function MyToolBlock({ toolInput, toolOutput }: ActionBlockProps) {
  return <div>Result: {JSON.stringify(toolOutput)}</div>;
}
```

```json
{ "actionBlocks": { "my_tool": "./agent/blocks/MyToolBlock.tsx" } }
```

Pass the component into the provider / panel (client bundle can't load the path alone):

```tsx
import MyToolBlock from "@/agent/blocks/MyToolBlock";

<GluonAgentPanel actionBlocks={{ my_tool: MyToolBlock }} />
// or
<AgentProvider actionBlocks={{ my_tool: MyToolBlock }}>…</AgentProvider>
```

---

## Token usage

**Server** — register hooks in config (`"hooks": "./agent/hooks.ts"`):

```typescript
// agent/hooks.ts
import type { TokenUsage } from "gluon-ai";

export async function onRunEnd(ctx: {
  userId: string;
  chatId: string;
  finishReason: string;
  usage: TokenUsage; // { promptTokens, completionTokens, totalTokens }
}): Promise<void> {
  // persist, bill, analytics, …
}
```

Tokens are summed across all tool rounds in the run.

**Client** — `adapter.lastRunUsage` via `useAgentContext()`:

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

| Command | Flags | Description |
| ------- | ----- | ----------- |
| `init [dir]` | `--default` / `-y`, `--development` / `--dev` | Scan project, scaffold files, generate Prisma client, create agent tables, patch next.config |
| `install [dir]` | `--development` / `--dev` | Run install; `--development` uses `--install-links` for local `file:` packages |
| `add-tool [name]` | | Scaffold `agent/tools/<name>.ts` + register in config |
| `add-skill [name]` | | Scaffold `agent/skills/<name>.md` + register in config |
| `uninstall [dir]` | interactive confirm | Remove scaffolded files, strip patches, uninstall the package |
| `--help` / `-h` | | Print help |

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

| Import | Use for |
| ------ | ------- |
| `gluon-ai` | `defineTool`, shared types (`ActionBlockProps`, `TokenUsage`, …) |
| `gluon-ai/react` | Provider, panels, hooks, message/input primitives |
| `gluon-ai/routes` | Catch-all `GET` / `POST` / `DELETE` handlers |
| `gluon-ai/tool` | Tool helpers / types |
| `gluon-ai/server` | Commands, queue, Redis, DB adapter types |
| `gluon-ai/instrumentation` | `register()` — starts the worker |
| `gluon-ai/cli` | CLI command implementations (used by the `gluon-ai` bin) |

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
