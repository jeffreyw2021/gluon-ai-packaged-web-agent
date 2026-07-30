"use client";

import type { UIMessage } from "ai";
import type { LiveEvent } from "../../types/LiveEvent";
import type { RunActivityPhase } from "../../types/RunActivityPhase";
import type { RunPhase } from "../../types/RunPhase";

export interface LiveRunState {
  phase: RunPhase;
  runId: string | null;
  awaitingApprovalId: string | null;
  activity: RunActivityPhase | null;
}

export const INITIAL_LIVE_RUN_STATE: LiveRunState = {
  phase: "idle",
  runId: null,
  awaitingApprovalId: null,
  activity: null,
};

// Use a completely loose internal message representation to avoid AI SDK part type constraints
// at the delta-application layer. We cast back to UIMessage[] at the boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseMessage = { id: string; role: string; parts: any[] };

function ensureMessage(messages: UIMessage[], messageId: string): [LooseMessage[], number] {
  const loose = messages as unknown as LooseMessage[];
  const idx = loose.findIndex((m) => m.id === messageId);
  const base: LooseMessage[] =
    idx >= 0
      ? loose
      : [...loose, { id: messageId, role: "assistant", parts: [] }];
  const i = base.findIndex((m) => m.id === messageId);
  return [base, i];
}

function applyTextDelta(messages: UIMessage[], messageId: string, delta: string): UIMessage[] {
  const [base, i] = ensureMessage(messages, messageId);
  const msg = base[i];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [...(msg.parts ?? [])];
  const lastPart = parts[parts.length - 1];
  if (lastPart?.type === "text") {
    parts[parts.length - 1] = { ...lastPart, text: String(lastPart.text ?? "") + delta };
  } else {
    parts.push({ type: "text", text: delta });
  }
  const next = [...base];
  next[i] = { ...msg, parts };
  return next as unknown as UIMessage[];
}

function applyReasoningDelta(messages: UIMessage[], messageId: string, delta: string): UIMessage[] {
  const [base, i] = ensureMessage(messages, messageId);
  const msg = base[i];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [...(msg.parts ?? [])];
  const lastPart = parts[parts.length - 1];
  if (lastPart?.type === "reasoning") {
    parts[parts.length - 1] = { ...lastPart, reasoning: String(lastPart.reasoning ?? "") + delta };
  } else {
    parts.push({ type: "reasoning", reasoning: delta });
  }
  const next = [...base];
  next[i] = { ...msg, parts };
  return next as unknown as UIMessage[];
}

function mergeProjection(messages: UIMessage[], incoming: UIMessage): UIMessage[] {
  const idx = messages.findIndex((m) => m.id === incoming.id);
  if (idx < 0) return [...messages, incoming];
  const next = [...messages];
  next[idx] = incoming;
  return next;
}

export function applyLiveEvent(
  messages: UIMessage[],
  runState: LiveRunState,
  event: LiveEvent,
): { messages: UIMessage[]; runState: LiveRunState } {
  switch (event.type) {
    case "run.started":
      return {
        messages,
        runState: {
          phase: "running",
          runId: event.runId,
          awaitingApprovalId: null,
          activity: "round_start",
        },
      };
    case "run.phase":
      return {
        messages,
        runState: {
          ...runState,
          phase:
            event.activity === "awaiting_user"
              ? "awaiting_user"
              : runState.phase === "idle"
                ? "running"
                : runState.phase,
          runId: event.runId,
          // Don't let round_start overwrite executing_tools — keep the more
          // meaningful "Using tools…" label until the first text/reasoning delta.
          activity:
            event.activity === "round_start" && runState.activity === "executing_tools"
              ? "executing_tools"
              : event.activity,
        },
      };
    case "message.text.delta":
      return {
        messages: applyTextDelta(messages, event.messageId, event.delta),
        runState: { ...runState, phase: "running", runId: event.runId, activity: runState.activity ?? "streaming" },
      };
    case "message.reasoning.delta":
      return {
        messages: applyReasoningDelta(messages, event.messageId, event.delta),
        runState: { ...runState, phase: "running", runId: event.runId, activity: "reasoning" },
      };
    case "thread.projection":
      return {
        messages: mergeProjection(messages, event.message),
        runState: { ...runState, phase: "running", runId: event.runId, activity: runState.activity ?? "streaming" },
      };
    case "run.awaiting_user":
      return {
        messages,
        runState: {
          phase: "awaiting_user",
          runId: event.runId,
          awaitingApprovalId: event.approvalIds[0] ?? null,
          activity: "awaiting_user",
        },
      };
    case "run.completed":
      return {
        messages,
        runState: { phase: "completed", runId: event.runId, awaitingApprovalId: null, activity: null },
      };
    case "run.failed":
      return {
        messages,
        runState: { phase: "failed", runId: event.runId, awaitingApprovalId: null, activity: null },
      };
    case "run.cancelled":
      return {
        messages,
        runState: { phase: "cancelled", runId: event.runId, awaitingApprovalId: null, activity: null },
      };
    default:
      return { messages, runState };
  }
}
