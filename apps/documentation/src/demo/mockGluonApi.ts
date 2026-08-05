/**
 * In-browser mock of the Gluon HTTP + SSE surface for the documentation demo.
 * Intercepts only `/api/gluon-demo/*` so the real network is untouched elsewhere.
 */

type DemoPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; reasoning: string }
  | {
      type: `tool-${string}`;
      toolCallId: string;
      toolName: string;
      state: string;
    };

type DemoMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: DemoPart[];
};

type DemoChat = {
  id: string;
  title: string;
  userId: string;
  activeJobRunId: string | null;
  createdAt: string;
  updatedAt: string;
};

type SseListener = { onmessage: ((ev: MessageEvent) => void) | null };

const DEMO_PREFIX = "/api/gluon-demo";
const DEMO_REPLY =
  "Hello! This is a demo response from the AI, to show what a streamed reply looks like.";
const DEMO_SUMMARY =
  "[Summarized]\n\nCapabilities overview → web search on AI releases → coding-model focus."

const threads = new Map<string, DemoMessage[]>();
const chats = new Map<string, DemoChat>();
const listeners = new Map<string, Set<SseListener>>();
const running = new Set<string>();

let installCount = 0;
let originalFetch: typeof fetch | null = null;
let OriginalEventSource: typeof EventSource | null = null;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ensureChat(chatId: string, title = "New Chat") {
  if (!chats.has(chatId)) {
    const now = new Date().toISOString();
    chats.set(chatId, {
      id: chatId,
      title,
      userId: "demo",
      activeJobRunId: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (!threads.has(chatId)) threads.set(chatId, []);
}

function emit(chatId: string, event: Record<string, unknown>) {
  const set = listeners.get(chatId);
  if (!set?.size) return;
  const data = JSON.stringify(event);
  for (const listener of set) {
    listener.onmessage?.({ data } as MessageEvent);
  }
}

async function waitForListeners(chatId: string, timeoutMs = 2500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (listeners.get(chatId)?.size) return true;
    await delay(40);
  }
  return Boolean(listeners.get(chatId)?.size);
}

function chunkText(text: string): string[] {
  const parts = text.match(/\S+\s*/g);
  return parts && parts.length > 0 ? parts : [text];
}

async function playDemoStream(chatId: string) {
  if (running.has(chatId)) return;
  running.add(chatId);

  try {
    await waitForListeners(chatId);

    const runId = `demo-run-${Date.now()}`;
    const messageId = `demo-asst-${Date.now()}`;
    let seq = 0;

    emit(chatId, { type: "run.started", chatId, runId, seq: ++seq });
    emit(chatId, {
      type: "run.phase",
      chatId,
      runId,
      seq: ++seq,
      activity: "reasoning",
    });

    // Brief reasoning content so the thought window has something to show.
    const reasoning = "Thinking through a short demo reply…";
    for (const delta of chunkText(reasoning)) {
      emit(chatId, {
        type: "message.reasoning.delta",
        chatId,
        runId,
        seq: ++seq,
        messageId,
        delta,
      });
      await delay(45);
    }

    await delay(1500);

    emit(chatId, {
      type: "run.phase",
      chatId,
      runId,
      seq: ++seq,
      activity: "streaming",
    });

    let fullText = "";
    for (const delta of chunkText(DEMO_REPLY)) {
      fullText += delta;
      emit(chatId, {
        type: "message.text.delta",
        chatId,
        runId,
        seq: ++seq,
        messageId,
        delta,
      });
      await delay(38);
    }

    // Persist so the post-completion thread refetch keeps the reply.
    const existing = threads.get(chatId) ?? [];
    threads.set(chatId, [
      ...existing.filter((m) => m.id !== messageId),
      {
        id: messageId,
        role: "assistant",
        parts: [
          { type: "reasoning", reasoning },
          { type: "text", text: fullText },
        ],
      },
    ]);

    const chat = chats.get(chatId);
    if (chat) {
      chat.updatedAt = new Date().toISOString();
      if (chat.title === "New Chat") {
        const firstUser = existing.find((m) => m.role === "user");
        const t = firstUser?.parts.find((p) => p.type === "text");
        if (t && t.type === "text" && t.text.trim()) {
          chat.title = t.text.trim().slice(0, 40);
        }
      }
    }

    emit(chatId, { type: "run.completed", chatId, runId, seq: ++seq });
  } finally {
    running.delete(chatId);
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url;
  }
}

async function handleDemoFetch(url: string, init?: RequestInit): Promise<Response> {
  const path = pathOf(url);
  const method = (init?.method ?? "GET").toUpperCase();

  if (path.endsWith("/config") && method === "GET") {
    // Match the example / default: web_search has no defineTool({ ui }), so the
    // ThoughtWindow falls back to title-casing the tool name ("Web Search").
    return json({ suggestedPrompts: [], toolUi: {} });
  }

  if (path.endsWith("/chats") && method === "GET") {
    return json({ chats: [...chats.values()] });
  }

  if (path.endsWith("/chats") && method === "DELETE") {
    const chatId = new URL(url, window.location.origin).searchParams.get("chatId");
    if (chatId) {
      chats.delete(chatId);
      threads.delete(chatId);
    }
    return json({ ok: true });
  }

  if (path.endsWith("/thread") && method === "GET") {
    const chatId = new URL(url, window.location.origin).searchParams.get("chatId");
    if (!chatId) return json({ messages: [], runId: null });
    ensureChat(chatId);
    return json({ messages: threads.get(chatId) ?? [], runId: null });
  }

  if (path.endsWith("/commands") && method === "POST") {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      type?: string;
      chatId?: string;
      message?: DemoMessage;
      clientMessageId?: string;
    };
    const chatId = body.chatId;
    if (!chatId) return json({ ok: false, code: "no_chat", message: "Missing chatId" }, 400);

    if (body.type === "send") {
      ensureChat(chatId);
      const msgs = threads.get(chatId) ?? [];
      if (body.message && !msgs.some((m) => m.id === body.message!.id)) {
        msgs.push({
          id: body.message.id,
          role: "user",
          parts: body.message.parts ?? [{ type: "text", text: "" }],
        });
        threads.set(chatId, msgs);
      }
      void playDemoStream(chatId);
      return json(
        {
          ok: true,
          chatId,
          clientMessageId: body.clientMessageId,
          runId: `ack-${Date.now()}`,
          acceptedAt: new Date().toISOString(),
        },
        202,
      );
    }

    if (body.type === "summarize") {
      ensureChat(chatId);
      await delay(1600);
      const msgs = (threads.get(chatId) ?? []).filter((m) => m.id !== "gluon-ctx-snapshot");
      msgs.push({
        id: "gluon-ctx-snapshot",
        role: "system",
        parts: [{ type: "text", text: DEMO_SUMMARY }],
      });
      threads.set(chatId, msgs);
      return json({ ok: true, summarized: true });
    }

    if (body.type === "stop") {
      emit(chatId, {
        type: "run.cancelled",
        chatId,
        runId: `stop-${Date.now()}`,
        seq: 9999,
      });
      return json({ ok: true });
    }

    return json({ ok: true });
  }

  return new Response(null, { status: 404 });
}

class DemoEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  withCredentials = true;
  readyState = DemoEventSource.OPEN;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onopen: ((ev: Event) => void) | null = null;

  private chatId: string;

  constructor(url: string | URL) {
    this.url = String(url);
    try {
      this.chatId = new URL(this.url, window.location.origin).searchParams.get("chatId") ?? "";
    } catch {
      this.chatId = "";
    }
    if (this.chatId) {
      let set = listeners.get(this.chatId);
      if (!set) {
        set = new Set();
        listeners.set(this.chatId, set);
      }
      set.add(this);
    }
    queueMicrotask(() => this.onopen?.({ type: "open" } as Event));
  }

  close() {
    this.readyState = DemoEventSource.CLOSED;
    if (!this.chatId) return;
    listeners.get(this.chatId)?.delete(this);
  }

  addEventListener() {
    /* unused by gluon openLiveEventSource */
  }

  removeEventListener() {
    /* unused */
  }

  dispatchEvent() {
    return false;
  }
}

export function installDemoGluonApi() {
  installCount += 1;
  if (installCount > 1) return;

  originalFetch = window.fetch.bind(window);
  OriginalEventSource = window.EventSource;

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (url.includes(DEMO_PREFIX)) {
      return handleDemoFetch(url, init);
    }
    return originalFetch!(input, init);
  }) as typeof fetch;

  const PatchedEventSource = function (
    url: string | URL,
    eventSourceInitDict?: EventSourceInit,
  ) {
    const urlStr = String(url);
    if (urlStr.includes(DEMO_PREFIX)) {
      return new DemoEventSource(urlStr) as unknown as EventSource;
    }
    return new OriginalEventSource!(url, eventSourceInitDict);
  } as unknown as typeof EventSource;

  Object.defineProperties(PatchedEventSource, {
    CONNECTING: { value: 0 },
    OPEN: { value: 1 },
    CLOSED: { value: 2 },
  });

  window.EventSource = PatchedEventSource;
}

export function uninstallDemoGluonApi() {
  installCount = Math.max(0, installCount - 1);
  if (installCount > 0) return;

  if (originalFetch) window.fetch = originalFetch;
  if (OriginalEventSource) window.EventSource = OriginalEventSource;
  originalFetch = null;
  OriginalEventSource = null;

  threads.clear();
  chats.clear();
  listeners.clear();
  running.clear();
}

export const DEMO_GLUON_BASE_PATH = DEMO_PREFIX;

/** Stable chat id used by the ChatMessageList conversation demo. */
export const DEMO_MSG_LIST_CHAT_ID = "docs-chat-message-list";

/** Seed an in-memory thread so ChatMessageList can hydrate without a real backend. */
export function seedDemoThread(
  chatId: string,
  messages: DemoMessage[],
  title = "Demo chat",
) {
  const now = new Date().toISOString();
  chats.set(chatId, {
    id: chatId,
    title,
    userId: "demo",
    activeJobRunId: null,
    createdAt: now,
    updatedAt: now,
  });
  threads.set(chatId, messages);
}

/** Sample thread with reasoning, a web_search tool call, and a Summarized marker. */
export const DEMO_CONVERSATION_MESSAGES: DemoMessage[] = [
  {
    id: "demo-u1",
    role: "user",
    parts: [{ type: "text", text: "What can you do?" }],
  },
  {
    id: "demo-a1",
    role: "assistant",
    parts: [
      {
        type: "reasoning",
        reasoning:
          "The user is asking for capabilities. I should keep this concrete and short: research, drafting, and tool-backed lookups — then invite a real task.",
      },
      {
        type: "text",
        text: "I can help with research, drafting, and walking through ideas in this chat. Ask a specific question and I’ll dig in.",
      },
    ],
  },
  {
    id: "demo-u2",
    role: "user",
    parts: [
      {
        type: "text",
        text: "What’s the latest on major AI model releases this week?",
      },
    ],
  },
  {
    id: "demo-a2",
    role: "assistant",
    parts: [
      {
        type: "reasoning",
        reasoning:
          "This needs up-to-date release news, not training-cutoff knowledge. I’ll run a web search for recent model launches, then synthesize the top findings into a short brief.",
      },
      {
        type: "tool-web_search",
        toolCallId: "call_web_search_1",
        toolName: "web_search",
        state: "output-available",
      },
      {
        type: "text",
        text: "Here’s a quick roundup from recent coverage:\n\n- Several labs shipped model updates focused on coding and long-context work\n- Open-weight releases continue to close the gap on mid-size benchmarks\n- Product launches are pairing new models with cheaper API tiers\n\nWant me to go deeper on any one of these?",
      },
    ],
  },
  {
    id: "demo-u3",
    role: "user",
    parts: [{ type: "text", text: "Yeah — focus on the coding models." }],
  },
  {
    id: "demo-a3",
    role: "assistant",
    parts: [
      {
        type: "reasoning",
        reasoning:
          "They want the coding-model slice only. Narrow to IDE/agent use cases, latency, and what changed vs prior versions — skip the broader market noise.",
      },
      {
        type: "text",
        text: "On the coding side, the pattern this week is clearer instruction-following for multi-file edits, stronger tool-use loops for agents, and lower latency on short completions. If you’re picking one for an IDE assistant, prioritize tool-calling reliability over raw chat scores.",
      },
    ],
  },
  {
    id: "demo-u4",
    role: "user",
    parts: [{ type: "text", text: "Perfect, summarize our chat so far." }],
  },
  {
    id: "demo-a4",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "You asked what I can do, then we looked up recent AI releases — with a web search — and zoomed in on coding-model updates.",
      },
    ],
  },
  {
    id: "gluon-ctx-snapshot",
    role: "system",
    parts: [{ type: "text", text: DEMO_SUMMARY }],
  },
];

/**
 * Pre-populates the mock chat list with several named sessions so that
 * ChatSelect / ChatSelectMenu demos show real-looking history entries.
 * Safe to call multiple times; duplicate IDs are skipped.
 */
export function seedDemoChats() {
  const now = new Date().toISOString();
  const SEED = [
    { id: "demo-c1", title: "AI model releases this week" },
    { id: "demo-c2", title: "Coding models deep dive" },
    { id: "demo-c3", title: "What can you do?" },
    { id: "demo-c4", title: "Comparing open-weight models" },
  ];
  for (const { id, title } of SEED) {
    if (!chats.has(id)) {
      chats.set(id, { id, title, userId: "demo", activeJobRunId: null, createdAt: now, updatedAt: now });
    }
    if (!threads.has(id)) threads.set(id, []);
  }
}
