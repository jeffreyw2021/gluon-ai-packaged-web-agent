"use client";

import React, { useEffect, useRef, type CSSProperties, type ComponentType } from "react";
import type { UIMessage } from "ai";
import type { RunActivityPhase } from "../../types/RunActivityPhase";
import type { RunPhase } from "../../types/RunPhase";
import type { ActionBlockRegistry } from "../../tool";
import { ThoughtWindow } from "./thoughts/ThoughtWindow";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { isLiveRunPhase } from "../../types/RunPhase";
import type { ThoughtWindowProps } from "./thoughts/ThoughtWindow";
import type { ConfirmationBlockProps } from "./ConfirmationBlock";
import type { ActionBlockSlotProps } from "./ActionBlockSlot";
import type { UserMessageProps } from "./UserMessage";
import type { AssistantMessageProps } from "./AssistantMessage";

export interface MessageListComponentSlots {
  /** Override the user message component. */
  UserMessage?: ComponentType<UserMessageProps>;
  /** Override the assistant message component. */
  AssistantMessage?: ComponentType<AssistantMessageProps>;
  /** Override the thought/activity window. */
  ThoughtWindow?: ComponentType<ThoughtWindowProps>;
  /** Override the HITL confirmation prompt. */
  ConfirmationPrompt?: ComponentType<ConfirmationBlockProps>;
  /** Override the action block slot. */
  ActionBlockSlot?: ComponentType<ActionBlockSlotProps>;
  /**
   * Override the empty-state panel shown when there are no messages.
   * Receives suggested prompts and a select handler.
   */
  Empty?: ComponentType<MessageListEmptyProps>;
}

/**
 * Props for a custom empty-state component used in the `components.Empty` slot
 * of `MessageList`. Export this to type your own empty-state component.
 *
 * @example
 * ```tsx
 * function MyEmptyState({ suggestedPrompts, onSelect }: MessageListEmptyProps) {
 *   return (
 *     <div className="empty">
 *       {suggestedPrompts?.map((p) => (
 *         <button key={p} onClick={() => onSelect?.(p)}>{p}</button>
 *       ))}
 *     </div>
 *   );
 * }
 * <MessageList components={{ Empty: MyEmptyState }} ... />
 * ```
 */
export interface MessageListEmptyProps {
  suggestedPrompts?: string[];
  onSelect?: (prompt: string) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Controls the bottom margin applied after each message block.
 * All values are CSS length strings (e.g. `"2.5rem"`, `"40px"`).
 *
 * Defaults mirror ATS narrow-column values:
 *   - afterUser      → 2.5rem (40px)  — gap before assistant reply or pending indicator
 *   - betweenTurns   → 2rem   (32px)  — gap when assistant is followed by user
 *   - defaultGap     → 0.75rem (12px) — all other cases (last message, same-role, etc.)
 */
export interface MessageSpacing {
  /** Bottom margin after a user message (before assistant or pending). Default: `"2.5rem"` */
  afterUser?: string;
  /** Bottom margin after an assistant message when the next is a user message. Default: `"2rem"` */
  betweenTurns?: string;
  /** Bottom margin in all other cases. Default: `"0.75rem"` */
  defaultGap?: string;
}

const DEFAULT_SPACING: Required<MessageSpacing> = {
  afterUser: "2.5rem",
  betweenTurns: "2rem",
  defaultGap: "0.75rem",
};

function resolveMarginBottom(
  currentRole: string,
  nextRole: string | undefined,
  spacing: Required<MessageSpacing>,
): string {
  if (currentRole === "user") return spacing.afterUser;
  if (currentRole === "assistant" && nextRole === "user") return spacing.betweenTurns;
  return spacing.defaultGap;
}

export interface MessageListProps {
  messages: UIMessage[];
  runPhase: RunPhase;
  runActivity: RunActivityPhase | null;
  awaitingApprovalId: string | null;
  onApprove: (opts: { approvalId: string; approved: boolean; reason?: string }) => Promise<void>;
  actionBlocks?: ActionBlockRegistry;
  suggestedPrompts?: string[];
  onSuggestedPrompt?: (prompt: string) => void;
  className?: string;
  style?: CSSProperties;
  /** Override any sub-component slot. */
  components?: MessageListComponentSlots;
  /**
   * Control the bottom margin applied after each message block.
   * Omit any key to use the built-in default. Pass `false` to disable
   * automatic per-message spacing entirely (manage it yourself via CSS).
   */
  messageSpacing?: MessageSpacing | false;
}

// Default empty state — unstyled list of buttons
function DefaultEmpty({
  suggestedPrompts,
  onSelect,
  className,
  style,
}: MessageListEmptyProps) {
  if (!suggestedPrompts?.length) return null;
  return (
    <div data-slot="empty-state" className={className} style={style}>
      {suggestedPrompts.map((p) => (
        <button key={p} type="button" onClick={() => onSelect?.(p)}>
          {p}
        </button>
      ))}
    </div>
  );
}

/**
 * Headless message list. Maps over messages and renders the appropriate
 * sub-component for each. Auto-scrolls to the bottom on new activity.
 * No styles — apply via `className` / `style`.
 *
 * Override any piece via the `components` slot map.
 */
export function MessageList({
  messages,
  runPhase,
  runActivity,
  awaitingApprovalId,
  onApprove,
  actionBlocks = {},
  suggestedPrompts,
  onSuggestedPrompt,
  className,
  style,
  components = {},
  messageSpacing,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, runActivity]);

  const isEmpty = messages.length === 0 && !isLiveRunPhase(runPhase);

  const spacing: Required<MessageSpacing> | false =
    messageSpacing === false
      ? false
      : { ...DEFAULT_SPACING, ...messageSpacing };

  const UserMessageComp = components.UserMessage ?? UserMessage;
  const AssistantMessageComp = components.AssistantMessage ?? AssistantMessage;
  const ThoughtWindowComp = components.ThoughtWindow ?? ThoughtWindow;
  const EmptyComp = components.Empty ?? DefaultEmpty;

  // Build slots for AssistantMessage
  const assistantSlots = {
    ThoughtWindow: components.ThoughtWindow,
    ConfirmationPrompt: components.ConfirmationPrompt,
    ActionBlockSlot: components.ActionBlockSlot,
  };

  return (
    <div data-slot="message-list" className={className} style={style}>
      {isEmpty && (
        <EmptyComp
          suggestedPrompts={suggestedPrompts}
          onSelect={onSuggestedPrompt}
        />
      )}

      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        const nextRole = messages[i + 1]?.role;
        const mb =
          spacing !== false
            ? resolveMarginBottom(msg.role, nextRole, spacing)
            : undefined;
        const msgStyle: CSSProperties | undefined =
          mb !== undefined ? { marginBottom: mb } : undefined;

        if (msg.role === "user") {
          return (
            <UserMessageComp key={msg.id} message={msg} style={msgStyle} />
          );
        }

        return (
          <AssistantMessageComp
            key={msg.id}
            message={msg}
            isLast={isLast}
            runPhase={runPhase}
            runActivity={runActivity}
            awaitingApprovalId={awaitingApprovalId}
            onApprove={onApprove}
            actionBlocks={actionBlocks}
            components={assistantSlots}
            style={msgStyle}
          />
        );
      })}

      {/* Standalone thought window only when the last message is from the user
          (AssistantMessage already renders its own ThoughtWindow when isLast) */}
      {messages.length > 0 &&
        isLiveRunPhase(runPhase) &&
        messages[messages.length - 1]?.role !== "assistant" && (
          <ThoughtWindowComp activity={runActivity ?? "queued"} />
        )}

      <div ref={endRef} aria-hidden />
    </div>
  );
}
