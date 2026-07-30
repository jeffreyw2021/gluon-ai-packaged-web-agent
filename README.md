# gluon-ai

> **Beta** - personal project, rough edges expected.

Sometimes we want to build an AI-native product from scratch, but sometimes we just want an agent built into an existing product made before the AI era. The latter shouldn't be that hard. The backend structure is essentially identical and replicable across all those projects. This is why I built gluon: with a pre-packed backend that has all the logic ready, developers can take a client-side-first approach to drop an agent into their existing web app and make it work, without rebuilding the same infrastructure for the tenth time.

Built for myself. Shared in case it's useful to you.

---

## Compatibility

**Next.js only** because that's my main stack and first-class support matters more than broad compatibility right now. The package requires:

- Next.js 15+
- React 19+
- PostgreSQL _(best supported; other providers work but may have bugs, still testing)_
- Redis
- OpenAI API _(only provider supported at the moment)_

Other DB providers (MySQL, SQLite) are available through the init wizard but not battle-tested yet.

---

## Install

```bash
npm install gluon-ai@beta
# or
pnpm add gluon-ai@beta
```

---

## Init

Before running init, add your secrets to `.env` (or `.env.local`). The wizard will auto-detect existing env var names and use them as defaults. The names below are the package defaults — you can use any names you want and set them during the init prompts:

```env
OPENAI_API_KEY=sk-...
AGENT_DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
REDIS_URL=redis://localhost:6379
```

Then run the interactive setup wizard from your project root:

```bash
npx gluon-ai init
```

This will ask you a few questions (env var names, model, API path, DB provider) then scaffold everything automatically:

| Created                                   | Purpose                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `agent.config.json`                       | Central config: model, tools, prompts, auth          |
| `agent/tools/webSearch.ts`                | Example tool (web search via OpenAI)                 |
| `[app]/api/gluon-ai/[[...path]]/route.ts` | Single catch-all API route                           |
| `instrumentation.ts`                      | Starts the BullMQ worker via Next.js instrumentation |
| `.env.example` entries                    | Placeholders for your secrets                        |

It also patches `next.config` (`serverExternalPackages`) and adds a `gluon:uninstall` script to your `package.json`.

The agent database tables (`gluon_chat`, `gluon_chat_job_run`) are created automatically during init using idempotent SQL — your existing schema and tables are never touched. This is why your DB env var needs to be set before running init.

> **Skip the prompts:** `npx gluon-ai init --default` accepts all defaults instantly.

### What gets added to your project

```
agent/
  tools/
    webSearch.ts       # example tool scaffolded by init — add your own here
  auth/
    getUserId.ts       # auth adapter — return the current user's ID (added when auth is configured)
  skills/              # knowledge documents the agent reads on demand (you create these)
  blocks/              # custom React components rendered inline in chat for specific tools (you create these)

agent.config.json      # central config file — model, tools, skills, blocks, auth, prompts
instrumentation.ts     # re-exports the gluon worker registration; Next.js runs this on startup
[app]/api/gluon-ai/
  [[...path]]/
    route.ts           # single catch-all route that handles all agent API traffic
```

**`agent/tools/`** is where you define what the agent can do. Each tool is a TypeScript file that exports a `defineTool()` call with a description, input schema, and execute function. Scaffold new ones with `npx gluon-ai add-tool <name>`.

**`agent/skills/`** is for knowledge documents — Markdown files the agent can pull in on demand to handle specific tasks or domains. Scaffold new ones with `npx gluon-ai add-skill <name>`.

**`agent/blocks/`** is for custom UI. When a tool runs, you can render a React component inline in the chat stream instead of plain text output. Drop your components here and register them in `agent.config.json`.

**`agent.config.json`** is the single source of truth for everything agent-related. You point it at your tools, skills, and blocks by file path, and the package resolves them at runtime.

Then start your dev server; the background worker starts automatically:

```bash
npm run dev
```

---

## Uninstall

```bash
npm run gluon:uninstall
```

Removes all scaffolded files, strips patches from `next.config` and `instrumentation.ts`, and uninstalls the package. Prompts before doing anything.

> **Note:** The agent database tables (`gluon_chat`, `gluon_chat_job_run`) are not dropped automatically. Remove them manually if needed:
>
> ```sql
> DROP TABLE "gluon_chat_job_run", "gluon_chat";
> ```

---

## How to Use

### 1. Add the UI

Wrap your root layout with `AgentProvider`, then drop `AgentPanel` wherever you want the chat to appear:

```tsx
// app/layout.tsx
import { AgentProvider } from "gluon-ai/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AgentProvider basePath="/api/gluon-ai">{children}</AgentProvider>
      </body>
    </html>
  );
}
```

```tsx
// any page or component
import { AgentPanel } from "gluon-ai/react";

export default function Page() {
  return <AgentPanel />;
}
```

`AgentPanel` supports three display modes: `minimal` (floating dock), `fullscreen`, and `sideBySide` , switchable at runtime.

---

### 2. Configure the agent (`agent.config.json`)

```json
{
  "model": "gpt-4o",
  "systemPrompt": "You are a helpful assistant.",
  "maxOutputTokens": 16384,
  "maxRounds": 25,
  "tools": {
    "web_search": "./agent/tools/webSearch.ts"
  },
  "actionBlocks": {},
  "skills": [],
  "auth": {
    "handler": "allow"
  },
  "suggestedPrompts": ["What can you help me with?"],
  "env": {
    "openaiApiKey": "OPENAI_API_KEY",
    "databaseUrl": "AGENT_DATABASE_URL",
    "redisUrl": "REDIS_URL"
  }
}
```

Full schema: [`packages/core/agent.config.schema.json`](packages/core/agent.config.schema.json)

---

### 3. Add tools

Scaffold a new tool interactively:

```bash
npx gluon-ai add-tool my_tool
```

Or write one manually:

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
  needsApproval: false, // set true to require user confirmation before running
});
```

Register it in `agent.config.json`:

```json
{
  "tools": {
    "my_tool": "./agent/tools/myTool.ts"
  }
}
```

---

### 4. Add skills (knowledge documents)

Skills are Markdown files the agent can read on demand to get domain-specific guidance:

```bash
npx gluon-ai add-skill how-to-search
```

Registers the file and adds it to `agent.config.json`. Write your instructions inside the generated `.md` file.

---

### 5. Auth

By default, `auth.handler` is set to `"allow"` (no authentication, good for local dev). For production, swap in a handler that returns the current user's ID:

```typescript
// agent/auth/getUserId.ts
import { auth } from "@/auth"; // next-auth, clerk, whatever you use

export async function getUserId(req: Request): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
```

Then point `agent.config.json` to it:

```json
{
  "auth": {
    "getUserId": "./agent/auth/getUserId.ts"
  }
}
```

---

### 6. Custom in-stream UI (Action Blocks)

Render a React component inline in the chat when a specific tool runs:

```tsx
// agent/blocks/MyToolBlock.tsx
"use client";
import type { ActionBlockProps } from "gluon-ai";

export default function MyToolBlock({
  toolInput,
  toolOutput,
}: ActionBlockProps) {
  return <div>Result: {JSON.stringify(toolOutput)}</div>;
}
```

Register it in `agent.config.json` and pass it to `AgentProvider`:

```json
{ "actionBlocks": { "my_tool": "./agent/blocks/MyToolBlock.tsx" } }
```

```tsx
import MyToolBlock from "./agent/blocks/MyToolBlock";

<AgentProvider actionBlocks={{ my_tool: MyToolBlock }}>
```

---

## Currently Working On

- **Framework portability**: refactoring internals to better isolate Next.js-specific concerns, laying groundwork for supporting other framework-based web apps
- **UI improvements**: pre-packaging more polished, ready-to-use chat UI components to reduce the amount of styling work needed on the consumer side
- **Setup experience**: exploring a web-based setup flow to replace the CLI wizard with something more visual and intuitive
- **Stability**: fixing bugs, adding unit tests, improving edge case handling across DB providers

---

## License

MIT
