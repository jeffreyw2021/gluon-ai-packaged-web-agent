"use client";

import { generateId, type UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentChat, AgentSessionAdapter, SendOpts } from "../../types/AgentSessionAdapter";
import type { ReasoningMode } from "../../types/ReasoningMode";
import type { ChatTransportEvent } from "../../types/LiveEvent";
import { isLiveRunPhase } from "../../types/RunPhase";
import {
  applyLiveEvent,
  INITIAL_LIVE_RUN_STATE,
  type LiveRunState,
} from "../realtime/applyLiveEvent";
import { openLiveEventSource } from "../realtime/liveEventSource";

const EMPTY_MESSAGES: UIMessage[] = [];
const EMPTY_CHATS: AgentChat[] = [];

export interface UseAgentAdapterOptions {
  /** Base URL path for the agent API routes. Default: "/api/gluon-ai" */
  basePath?: string;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  bumpSession: () => void;
}

export function useAgentAdapter(opts: UseAgentAdapterOptions): AgentSessionAdapter {
  const { basePath = "/api/gluon-ai", activeChatId, setActiveChatId, bumpSession } = opts;
  const queryClient = useQueryClient();

  const [runState, setRunState] = useState<LiveRunState>(INITIAL_LIVE_RUN_STATE);
  const [outboundPending, setOutboundPending] = useState(false);
  const [locallyAborted, setLocallyAborted] = useState(false);
  const [inputText, setInputText] = useState("");
  const [reasoningMode, setReasoningMode] = useState<ReasoningMode>("auto");
  const runStateRef = useRef<LiveRunState>(INITIAL_LIVE_RUN_STATE);
  runStateRef.current = runState;
  // Tracks when activeChatId was changed by sendUserMessage itself so the
  // chat-change reset effect does not wipe outboundPending that was just set.
  const pendingNewChatRef = useRef(false);
  // Tracks the assistant-message count at the time outboundPending was set.
  // When a new assistant message appears while pending, the run has completed
  // even if run.completed was missed by SSE.
  const prevAssistantCountRef = useRef(0);
  // Timer handle for a fallback thread-refetch when SSE misses run.completed.
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatListKey = ["agent-chats"] as const;
  const threadKey = activeChatId ? ["agent-thread", activeChatId] : null;

  // --- Chat list ---
  const { data: chats } = useQuery<AgentChat[]>({
    queryKey: chatListKey,
    queryFn: async () => {
      const res = await fetch(`${basePath}/chats`);
      if (!res.ok) return EMPTY_CHATS;
      const data = (await res.json()) as { chats: AgentChat[] };
      return data.chats ?? EMPTY_CHATS;
    },
    staleTime: 30_000,
  });

  // --- Thread hydrate ---
  const { data: hydrated, isLoading: isChatLoading } = useQuery({
    queryKey: threadKey ?? ["__agent_no_chat__"],
    queryFn: async () => {
      if (!activeChatId) return { messages: EMPTY_MESSAGES, runId: null };
      const res = await fetch(`${basePath}/thread?chatId=${activeChatId}`);
      if (!res.ok) return { messages: EMPTY_MESSAGES, runId: null };
      const data = (await res.json()) as { messages: UIMessage[]; runId?: string | null };
      return { messages: data.messages ?? EMPTY_MESSAGES, runId: data.runId ?? null };
    },
    enabled: !!activeChatId,
    staleTime: 5_000,
  });

  const messages = hydrated?.messages ?? EMPTY_MESSAGES;

  // Count assistant messages to detect run completion when SSE misses run.completed.
  const assistantCount = useMemo(
    () => messages.filter((m) => m.role === "assistant").length,
    [messages],
  );

  // --- SSE ---
  useEffect(() => {
    if (!activeChatId) return;
    const close = openLiveEventSource({
      basePath,
      chatId: activeChatId,
      onEvent: (ev: ChatTransportEvent) => {
        // chat list events
        if (ev.type === "chat.created" || ev.type === "chat.updated") {
          queryClient.setQueryData<AgentChat[]>(chatListKey, (old) => {
            const list = Array.isArray(old) ? old : [];
            const idx = list.findIndex((c) => c.id === ev.chat.id);
            if (idx >= 0) {
              const next = [...list];
              next[idx] = ev.chat;
              return next;
            }
            return [ev.chat, ...list];
          });
          return;
        }
        if (ev.type === "chat.deleted") {
          queryClient.setQueryData<AgentChat[]>(chatListKey, (old) =>
            (Array.isArray(old) ? old : []).filter((c) => c.id !== ev.chatId),
          );
          return;
        }

        // run events: apply to current messages in cache
        if (!("chatId" in ev) || ev.chatId !== activeChatId) return;
        if (process.env.NODE_ENV === "development") {
          console.debug("[gluon:sse]", ev.type, "runId" in ev ? (ev as { runId: string }).runId?.slice(-6) : "");
        }

        // Fix C: reconstruct partial assistant message from in-flight snapshot on first connect
        if (ev.type === "streaming.snapshot") {
          const { snapshot, runId } = ev;
          const parts: Array<{ type: string; [k: string]: unknown }> = [];
          if (snapshot.reasoningText) parts.push({ type: "reasoning", reasoning: snapshot.reasoningText });
          if (snapshot.text) parts.push({ type: "text", text: snapshot.text });
          if (parts.length === 0) return;
          queryClient.setQueryData<{ messages: UIMessage[]; runId: string | null }>(
            threadKey ?? ["__agent_no_chat__"],
            (old) => {
              const base = old ?? { messages: EMPTY_MESSAGES, runId: null };
              const existing = base.messages.find((m) => m.id === snapshot.messageId);
              const snapshotMsg = {
                id: snapshot.messageId,
                role: "assistant" as const,
                parts: parts as UIMessage["parts"],
              } as UIMessage;
              const messages = existing
                ? base.messages.map((m) => (m.id === snapshot.messageId ? snapshotMsg : m))
                : [...base.messages, snapshotMsg];
              return { messages, runId };
            },
          );
          setRunState((prev) => ({
            ...prev,
            phase: "running",
            runId,
            activity: prev.activity ?? "streaming",
          }));
          return;
        }

        queryClient.setQueryData<{ messages: UIMessage[]; runId: string | null }>(
          threadKey ?? ["__agent_no_chat__"],
          (old) => {
            // Fix B: initialize from empty state instead of silently dropping the event
            const base = old ?? { messages: EMPTY_MESSAGES, runId: null };
            const result = applyLiveEvent(base.messages, runStateRef.current, ev as Parameters<typeof applyLiveEvent>[2]);
            setRunState(result.runState);
            return { ...base, messages: result.messages };
          },
        );

        if (
          ev.type === "run.completed" ||
          ev.type === "run.failed" ||
          ev.type === "run.cancelled"
        ) {
          // Cancel the fallback timer — SSE delivered the terminal event normally.
          if (fallbackTimerRef.current !== null) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          setOutboundPending(false);
          setLocallyAborted(false);
          // refetch thread after terminal event
          void queryClient.invalidateQueries({ queryKey: threadKey ?? [] });
        }
      },
    });
    return close;
  }, [activeChatId, basePath]);

  // Reset run state when chat changes
  useEffect(() => {
    if (pendingNewChatRef.current) {
      // activeChatId was just set by sendUserMessage — don't wipe outboundPending
      pendingNewChatRef.current = false;
      return;
    }
    setRunState(INITIAL_LIVE_RUN_STATE);
    setOutboundPending(false);
    setLocallyAborted(false);
    prevAssistantCountRef.current = 0;
  }, [activeChatId]);

  // Fallback completion detector: when a new assistant message appears in the
  // cache while we are still pending (i.e. SSE missed run.completed), treat it
  // as a terminal event and clear the pending state.
  useEffect(() => {
    if (!outboundPending) {
      prevAssistantCountRef.current = assistantCount;
      return;
    }
    if (assistantCount > prevAssistantCountRef.current) {
      prevAssistantCountRef.current = assistantCount;
      setOutboundPending(false);
    }
  }, [assistantCount, outboundPending]);

  const sendUserMessage = useCallback(
    async (text: string, sendOpts?: SendOpts): Promise<void> => {
      const chatId = activeChatId ?? generateId();
      const messageId = sendOpts?.messageId ?? generateId();
      const msg = {
        id: messageId,
        role: "user" as const,
        parts: [{ type: "text" as const, text }],
      } as unknown as UIMessage;

      // Resolve sendReasoning from mode
      const effectiveMode = sendOpts?.reasoningMode ?? reasoningMode;
      const sendReasoning =
        effectiveMode === "thinking" ? true : effectiveMode === "simple" ? false : undefined;

      // Set pending BEFORE the cache write so that the re-render triggered by
      // TanStack Query's useSyncExternalStore subscription already sees
      // outboundPending=true → runPhase="queued", preventing the one-frame
      // flash where the user message is visible but ThoughtWindow is not.
      setOutboundPending(true);
      if (chatId !== activeChatId) {
        pendingNewChatRef.current = true;
        setActiveChatId(chatId);
        // optimistic insert chat row
        queryClient.setQueryData<AgentChat[]>(chatListKey, (old) => {
          const now = new Date().toISOString();
          const placeholder: AgentChat = {
            id: chatId,
            title: "New Chat",
            userId: "",
            activeJobRunId: null,
            createdAt: now,
            updatedAt: now,
          };
          return [placeholder, ...(Array.isArray(old) ? old : [])];
        });
      }

      // optimistic message update — after pending flag so ThoughtWindow is
      // already "live" when this message lands in the query cache
      queryClient.setQueryData<{ messages: UIMessage[]; runId: string | null }>(
        ["agent-thread", chatId],
        (old) => {
          const base = old?.messages ?? EMPTY_MESSAGES;
          return { messages: [...base, msg], runId: old?.runId ?? null };
        },
      );

      try {
        const res = await fetch(`${basePath}/commands`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "send",
            chatId,
            clientMessageId: messageId,
            message: msg,
            ...(sendReasoning !== undefined ? { sendReasoning } : {}),
          }),
        });
        if (res.ok) {
          // Schedule a fallback thread-refetch in case SSE misses run.completed
          // (e.g. the run completes before the user-scope SSE subscription is open).
          if (fallbackTimerRef.current !== null) clearTimeout(fallbackTimerRef.current);
          const capturedChatId = chatId;
          fallbackTimerRef.current = setTimeout(() => {
            fallbackTimerRef.current = null;
            void queryClient.invalidateQueries({ queryKey: ["agent-thread", capturedChatId] });
          }, 3_000);
        } else {
          console.error("[useAgentAdapter] send failed", res.status);
          setOutboundPending(false);
        }
      } catch (err) {
        console.error("[useAgentAdapter] send error", err);
        setOutboundPending(false);
      }
    },
    [activeChatId, basePath, queryClient, reasoningMode, setActiveChatId],
  );

  const stopGeneration = useCallback(async (): Promise<void> => {
    if (!activeChatId) return;
    setLocallyAborted(true);
    try {
      await fetch(`${basePath}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "stop", chatId: activeChatId }),
      });
    } catch (err) {
      console.error("[useAgentAdapter] stop error", err);
    }
  }, [activeChatId, basePath]);

  const submitToolApproval = useCallback(
    async (opts2: { approvalId: string; approved: boolean; reason?: string }): Promise<void> => {
      if (!activeChatId || !runState.runId) return;
      await fetch(`${basePath}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "toolApproval",
          chatId: activeChatId,
          runId: runState.runId,
          ...opts2,
        }),
      });
    },
    [activeChatId, basePath, runState.runId],
  );

  const submitClientToolOutput = useCallback(
    async (toolCallId: string, output: unknown): Promise<void> => {
      if (!activeChatId || !runState.runId) return;
      await fetch(`${basePath}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "clientToolOutput",
          chatId: activeChatId,
          runId: runState.runId,
          toolCallId,
          output,
        }),
      });
    },
    [activeChatId, basePath, runState.runId],
  );

  const newChat = useCallback(() => {
    setActiveChatId(null);
    bumpSession();
    setRunState(INITIAL_LIVE_RUN_STATE);
  }, [setActiveChatId, bumpSession]);

  const deleteChat = useCallback(
    async (chatId: string) => {
      queryClient.setQueryData<AgentChat[]>(chatListKey, (old) =>
        (Array.isArray(old) ? old : []).filter((c) => c.id !== chatId),
      );
      if (activeChatId === chatId) {
        setActiveChatId(null);
        bumpSession();
      }
      await fetch(`${basePath}/chats?chatId=${chatId}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: chatListKey });
    },
    [activeChatId, basePath, bumpSession, queryClient, setActiveChatId],
  );

  const busyChatIds = useMemo<ReadonlySet<string>>(() => {
    const s = new Set<string>();
    if (activeChatId && (outboundPending || isLiveRunPhase(runState.phase))) {
      s.add(activeChatId);
    }
    return s;
  }, [activeChatId, outboundPending, runState.phase]);

  const isGenerating = isLiveRunPhase(runState.phase) || outboundPending;
  const isStreaming = runState.activity === "streaming" || runState.activity === "reasoning";
  const isSubmitting = outboundPending;

  // Show optimistic "queued" state whenever we're pending and no live run is active.
  // The original `runState.phase === "idle"` check was too narrow: after the first run
  // completes, phase is "completed" (not "idle"), so the second message's outboundPending
  // would produce phase="completed" and activity=null — hiding the ThoughtWindow entirely.
  const showPendingAsQueued = outboundPending && !isLiveRunPhase(runState.phase);

  return {
    activeChatId,
    messages,
    runPhase: showPendingAsQueued ? "queued" : runState.phase,
    runActivity: showPendingAsQueued ? "queued" : runState.activity,
    awaitingApprovalId: runState.awaitingApprovalId,
    lastRunUsage: runState.lastRunUsage,
    isChatLoading,
    isActiveChatLatched: outboundPending,
    isLocallyAborted: locallyAborted,
    isGenerating,
    isStreaming,
    isSubmitting,
    reasoningMode,
    setReasoningMode,
    sendUserMessage,
    stopGeneration,
    submitToolApproval,
    submitClientToolOutput,
    chats,
    busyChatIds,
    unseenCompletedChatIds: new Set<string>(),
    composer: { inputText, setInputText },
    selectChat: setActiveChatId,
    newChat,
    deleteChat,
  };
}
