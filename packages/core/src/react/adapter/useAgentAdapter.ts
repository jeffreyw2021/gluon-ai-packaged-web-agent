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

        queryClient.setQueryData<{ messages: UIMessage[]; runId: string | null }>(
          threadKey ?? ["__agent_no_chat__"],
          (old) => {
            if (!old) return old;
            const current = old.messages;
            const result = applyLiveEvent(current, runStateRef.current, ev as Parameters<typeof applyLiveEvent>[2]);
            setRunState(result.runState);
            return { ...old, messages: result.messages };
          },
        );

        if (
          ev.type === "run.completed" ||
          ev.type === "run.failed" ||
          ev.type === "run.cancelled"
        ) {
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
    setRunState(INITIAL_LIVE_RUN_STATE);
    setOutboundPending(false);
    setLocallyAborted(false);
  }, [activeChatId]);

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
        if (!res.ok) {
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

  return {
    activeChatId,
    messages,
    runPhase: outboundPending && runState.phase === "idle" ? "queued" : runState.phase,
    runActivity: outboundPending && runState.phase === "idle" ? "queued" : runState.activity,
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
