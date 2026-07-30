"use client";

import React, { type CSSProperties, type ComponentType, type ReactNode } from "react";
import type { UIMessage } from "ai";
import type { RunActivityPhase } from "../../types/RunActivityPhase";
import type { RunPhase } from "../../types/RunPhase";
import type { ActionBlockRegistry } from "../../tool";
import type { ThoughtWindowProps, ToolInvocationSummary } from "./thoughts/ThoughtWindow";
import type { ConfirmationBlockProps } from "./ConfirmationBlock";
import type { ActionBlockSlotProps } from "./ActionBlockSlot";
import { ThoughtWindow } from "./thoughts/ThoughtWindow";
import { ConfirmationBlock } from "./ConfirmationBlock";
import { ActionBlockSlot } from "./ActionBlockSlot";
import { isLiveRunPhase } from "../../types/RunPhase";

export type { ActionBlockSlotProps, ToolInvocationSummary };

export interface AssistantMessageSlots {
  ThoughtWindow?: ComponentType<ThoughtWindowProps>;
  ConfirmationPrompt?: ComponentType<ConfirmationBlockProps>;
  ActionBlockSlot?: ComponentType<ActionBlockSlotProps>;
  /** Render the plain text content. Receives the text string. */
  TextContent?: ComponentType<{ text: string; className?: string; style?: CSSProperties }>;
}

export interface AssistantMessageProps {
  message: UIMessage;
  isLast: boolean;
  runPhase: RunPhase;
  runActivity: RunActivityPhase | null;
  awaitingApprovalId: string | null;
  onApprove: (opts: { approvalId: string; approved: boolean; reason?: string }) => Promise<void>;
  actionBlocks?: ActionBlockRegistry;
  className?: string;
  style?: CSSProperties;
  /** Override sub-components for any slot. */
  components?: AssistantMessageSlots;
  /** Fully custom children — bypasses default slot rendering when provided. */
  children?: (props: {
    text: string;
    reasoning: string;
    toolInvocations: ToolInvocationSummary[];
    isStreaming: boolean;
    message: UIMessage;
  }) => ReactNode;
}

// ─── Part extractors ─────────────────────────────────────────────────────────

function getTextContent(msg: UIMessage): string {
  return (msg.parts ?? [])
    .filter((p) => p.type === "text" && "text" in p)
    .map((p) => ("text" in p ? String(p.text) : ""))
    .join("");
}

function getReasoningContent(msg: UIMessage): string {
  return (msg.parts ?? [])
    .filter((p) => p.type === "reasoning")
    .map((p) => {
      // AI SDK persists reasoning as `.text`; live deltas arrive as `.reasoning`
      const r = p as { text?: unknown; reasoning?: unknown };
      return String(r.text ?? r.reasoning ?? "");
    })
    .filter(Boolean)
    .join("\n");
}

/** Tool names that render in their own dedicated surface (ConfirmationBlock etc.)
 *  and should NOT appear as rows in the ThoughtWindow strip. */
const HIDDEN_IN_THOUGHT_STRIP = new Set(["request_confirmation"]);

/** Returns tool summaries for the ThoughtWindow strip.
 *  In AI SDK v6, tool parts have type "tool-<toolName>" (e.g. "tool-web_search"). */
function getToolInvocations(msg: UIMessage): ToolInvocationSummary[] {
  return (msg.parts ?? [])
    .filter((p) => typeof p.type === "string" && p.type.startsWith("tool-"))
    .map((p) => {
      const tp = p as { type: string; toolCallId?: string; toolName?: string; state?: string };
      const toolName = tp.toolName ?? tp.type.slice("tool-".length);
      return {
        toolCallId: tp.toolCallId ?? toolName,
        toolName,
        state: (tp.state as ToolInvocationSummary["state"]) ?? "call",
      };
    })
    .filter((inv) => !HIDDEN_IN_THOUGHT_STRIP.has(inv.toolName));
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Headless assistant message. Renders a `<div>` with `data-role="assistant"`.
 * No styles. Composes ThoughtWindow, ConfirmationBlock, and ActionBlockSlot by
 * default; override each via the `components` prop or replace everything with
 * a children render prop.
 */
export function AssistantMessage({
  message,
  isLast,
  runPhase,
  runActivity,
  awaitingApprovalId,
  onApprove,
  actionBlocks = {},
  className,
  style,
  components = {},
  children,
}: AssistantMessageProps) {
  const text = getTextContent(message);
  const reasoning = getReasoningContent(message);
  const toolInvocations = getToolInvocations(message);
  const isStreaming = isLast && isLiveRunPhase(runPhase);

  const ThoughtWindowComp = components.ThoughtWindow ?? ThoughtWindow;
  const ConfirmationComp = components.ConfirmationPrompt ?? ConfirmationBlock;
  const ActionSlot = components.ActionBlockSlot ?? ActionBlockSlot;
  const TextContent = components.TextContent;

  return (
    <div data-role="assistant" className={className} style={style}>
      {children ? (
        children({ text, reasoning, toolInvocations, isStreaming, message })
      ) : (
        <>
          <ThoughtWindowComp
            activity={isStreaming ? runActivity : null}
            reasoningText={reasoning || undefined}
            toolInvocations={toolInvocations.length > 0 ? toolInvocations : undefined}
          />
          <ConfirmationComp
            message={message}
            awaitingApprovalId={awaitingApprovalId}
            onApprove={onApprove}
          />
          <ActionSlot message={message} registry={actionBlocks} />
          {text && (
            TextContent
              ? <TextContent text={text} />
              : <span>{text}</span>
          )}
        </>
      )}
    </div>
  );
}
