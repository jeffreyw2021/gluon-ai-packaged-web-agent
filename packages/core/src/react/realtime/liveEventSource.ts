"use client";

import type { ChatTransportEvent } from "../../types/LiveEvent";

/** Serialize a runId→lastSeq map into the `cursor` query-param format. */
function formatCursor(map: ReadonlyMap<string, number>): string {
  return [...map.entries()].map(([r, s]) => `${r}:${s}`).join(",");
}

export interface SseConnectionOptions {
  /** Base path for agent API, default "/api/gluon-ai" */
  basePath?: string;
  userId?: string;
  chatId?: string;
  runId?: string;
  cursor?: string;
  onEvent: (event: ChatTransportEvent) => void;
  onError?: (err: Error) => void;
}

export function openLiveEventSource(opts: SseConnectionOptions): () => void {
  const base = opts.basePath ?? "/api/gluon-ai";

  // Track the highest seq seen per runId so reconnects can replay missed events.
  const cursorMap = new Map<string, number>();
  if (opts.cursor) {
    // Seed from any externally-provided cursor
    for (const part of opts.cursor.split(",")) {
      const [runId, seqStr] = part.split(":");
      if (runId?.trim()) {
        const seq = Number.parseInt(seqStr ?? "", 10);
        if (Number.isFinite(seq) && seq >= 0) cursorMap.set(runId.trim(), seq);
      }
    }
  }

  let es: EventSource | null = null;
  let closed = false;

  function buildUrl(): string {
    const url = new URL(
      `${base}/events`,
      typeof window !== "undefined" ? window.location.origin : "http://localhost",
    );
    if (opts.chatId) url.searchParams.set("chatId", opts.chatId);
    if (opts.runId) url.searchParams.set("runId", opts.runId);
    const cursor = formatCursor(cursorMap);
    if (cursor) url.searchParams.set("cursor", cursor);
    return url.toString();
  }

  function connect() {
    if (closed) return;
    es = new EventSource(buildUrl(), { withCredentials: true });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as ChatTransportEvent;

        // Advance cursor so reconnects replay only what was missed
        if ("seq" in data && typeof (data as { seq?: number }).seq === "number" && "runId" in data) {
          const d = data as { runId: string; seq: number };
          const prev = cursorMap.get(d.runId) ?? -1;
          if (d.seq > prev) cursorMap.set(d.runId, d.seq);
        }

        opts.onEvent(data);
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      if (closed) return;
      es?.close();
      opts.onError?.(new Error("SSE connection error"));
      // Reconnect with cursor so server replays any events missed during the gap
      setTimeout(connect, 3_000);
    };
  }

  connect();

  return () => {
    closed = true;
    es?.close();
  };
}
