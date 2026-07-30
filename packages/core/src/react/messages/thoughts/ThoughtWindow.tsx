"use client";

import React, { useState, useEffect, type CSSProperties } from "react";
import type { RunActivityPhase } from "../../../types/RunActivityPhase";

export interface ToolInvocationSummary {
  toolCallId: string;
  toolName: string;
  /** "call" = in-progress, "partial-call" = streaming args, "result" = completed */
  state: "call" | "partial-call" | "result";
}

export interface ThoughtWindowProps {
  activity: RunActivityPhase | null;
  reasoningText?: string;
  /**
   * Tool invocations extracted from the assistant message (excluding HITL tools).
   * Each one is rendered as a compact status row inside the thought strip.
   */
  toolInvocations?: ToolInvocationSummary[];
  className?: string;
  style?: CSSProperties;
  classNames?: {
    header?: string;
    body?: string;
    indicator?: string;
    toggle?: string;
    toolSteps?: string;
    toolStep?: string;
  };
  styles?: {
    header?: CSSProperties;
    body?: CSSProperties;
    indicator?: CSSProperties;
    toggle?: CSSProperties;
    toolSteps?: CSSProperties;
    toolStep?: CSSProperties;
  };
}

const ACTIVITY_LABELS: Partial<Record<RunActivityPhase, string>> = {
  queued: "In queue…",
  round_start: "Starting…",
  reasoning: "Thinking…",
  streaming: "Responding…",
  executing_tools: "Using tools…",
  awaiting_user: "Waiting for you…",
  saving: "Saving…",
};

/**
 * Headless thought/activity window. Renders a `<div data-slot="thought-window">`.
 * No styles — apply via `className` / `style` / `classNames` / `styles`.
 *
 * Slots:
 *   `data-slot="thought-window"`       — root
 *   `data-slot="thought-header"`       — label row (activity indicator + label + toggle)
 *   `data-slot="activity-indicator"`   — pulsing dot / icon
 *   `data-slot="toggle"`               — expand/collapse chevron (only when body has content)
 *   `data-slot="tool-steps"`           — container for per-tool rows
 *   `data-slot="tool-step"`            — one row per tool call
 *     `data-tool-name`                 — tool name string
 *     `data-state`                     — "call" | "partial-call" | "result"
 *   `data-slot="thought-body"`         — collapsible reasoning text area
 *
 * Behaviour:
 * - Auto-expands (reasoning body) when `activity` transitions from null → non-null.
 * - Tool steps are always visible when present (not gated by expanded state).
 * - `data-active="true"` while an activity is in progress.
 * - `data-expanded="true"` when reasoning body is shown.
 * - Renders `null` when there is no activity, no tool invocations, and no reasoning text.
 *
 * Placeholder guarantee:
 * - `AssistantMessage` and `MessageList` always pass `activity="queued"` when the run
 *   is live but no specific phase event has arrived yet. Custom `ThoughtWindow` overrides
 *   therefore receive a non-null `activity` immediately after the user submits — no
 *   consumer-side state checks or wrappers are needed to show an instant placeholder.
 */
export function ThoughtWindow({
  activity,
  reasoningText,
  toolInvocations,
  className,
  style,
  classNames = {},
  styles = {},
}: ThoughtWindowProps) {
  const [expanded, setExpanded] = useState(true);

  // Auto-expand reasoning when the run becomes active
  useEffect(() => {
    if (activity) setExpanded(true);
  }, [activity]);

  const label = activity ? (ACTIVITY_LABELS[activity] ?? "Working…") : null;
  const hasTools = (toolInvocations?.length ?? 0) > 0;
  const hasReasoning = !!reasoningText;
  const hasBody = hasReasoning; // tool steps are always visible; only reasoning is in the collapsible body

  if (!label && !hasTools && !hasReasoning) return null;

  return (
    <div
      data-slot="thought-window"
      data-active={label ? "true" : undefined}
      data-expanded={expanded && hasBody ? "true" : undefined}
      className={className}
      style={style}
    >
      {/* Header — activity label + optional expand toggle */}
      <div
        data-slot="thought-header"
        role={hasBody ? "button" : undefined}
        tabIndex={hasBody ? 0 : undefined}
        aria-expanded={hasBody ? expanded : undefined}
        className={classNames.header}
        style={styles.header}
        onClick={() => hasBody && setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (hasBody && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        {label && (
          <span
            data-slot="activity-indicator"
            aria-hidden
            className={classNames.indicator}
            style={styles.indicator}
          />
        )}
        <span>{label ?? (hasReasoning ? "Thought" : null)}</span>
        {hasBody && (
          <span
            data-slot="toggle"
            aria-hidden
            className={classNames.toggle}
            style={styles.toggle}
          >
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </div>

      {/* Tool steps — always visible, no collapse */}
      {hasTools && (
        <div
          data-slot="tool-steps"
          className={classNames.toolSteps}
          style={styles.toolSteps}
        >
          {toolInvocations!.map((inv) => (
            <div
              key={inv.toolCallId}
              data-slot="tool-step"
              data-tool-name={inv.toolName}
              data-state={inv.state}
              className={classNames.toolStep}
              style={styles.toolStep}
            >
              {inv.toolName}
            </div>
          ))}
        </div>
      )}

      {/* Reasoning body — collapsible */}
      {expanded && hasReasoning && (
        <div
          data-slot="thought-body"
          className={classNames.body}
          style={styles.body}
        >
          {reasoningText}
        </div>
      )}
    </div>
  );
}
