"use client";

import type { ChatTransportEvent } from "../../types/LiveEvent";

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
  const url = new URL(`${base}/events`, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (opts.chatId) url.searchParams.set("chatId", opts.chatId);
  if (opts.runId) url.searchParams.set("runId", opts.runId);
  if (opts.cursor) url.searchParams.set("cursor", opts.cursor);

  let es: EventSource | null = null;
  let closed = false;

  function connect() {
    if (closed) return;
    es = new EventSource(url.toString(), { withCredentials: true });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as ChatTransportEvent;
        opts.onEvent(data);
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      if (closed) return;
      es?.close();
      opts.onError?.(new Error("SSE connection error"));
      setTimeout(connect, 3_000);
    };
  }

  connect();

  return () => {
    closed = true;
    es?.close();
  };
}
