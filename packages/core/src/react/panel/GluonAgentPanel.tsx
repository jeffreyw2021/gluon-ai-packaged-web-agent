"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { AgentProvider } from "../provider/AgentProvider";
import type { ActionBlockRegistry } from "../../tool";
import { ChatTopBar } from "./ChatTopBar";
import type { ChatTopBarProps } from "./ChatTopBar";
import { ChatMessageList } from "./ChatMessageList";
import type { ChatMessageListProps } from "./ChatMessageList";
import { ChatInputBar } from "./ChatInputBar";
import type { ChatInputBarProps } from "./ChatInputBar";

// ── Scoped CSS ─────────────────────────────────────────────────────────────

const PANEL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap');

[data-gluon-agent-panel] {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

[data-gluon-agent-panel][data-frosted] {
  backdrop-filter: blur(64px) saturate(1.5);
  -webkit-backdrop-filter: blur(64px) saturate(1.5);
}

/* Force all form elements inside the panel to inherit Urbanist */
[data-gluon-agent-panel] textarea,
[data-gluon-agent-panel] input,
[data-gluon-agent-panel] button,
[data-gluon-agent-panel] select {
  font-family: inherit;
}
` as const;

// ── Types ─────────────────────────────────────────────────────────────────

export interface GluonAgentPanelProps {
  /**
   * When `true`, applies the dark-mode color palette to the shell and all
   * Layer 2 children. Defaults to `false`.
   */
  darkMode?: boolean;
  /**
   * When `true`, uses a frosted-glass shell (blur + translucent tint).
   * Defaults to `false` (solid background).
   */
  frostedGlass?: boolean;
  /**
   * Base path for agent API routes. Forwarded to `AgentProvider`.
   * Defaults to `"/api/gluon-ai"`.
   */
  basePath?: string;
  /** Override query client if you already have one. */
  queryClient?: QueryClient;
  /** Action block components keyed by tool name. */
  actionBlocks?: ActionBlockRegistry;
  /**
   * Suggested prompts shown in the empty state.
   * When omitted, fetched automatically from `GET {basePath}/config`.
   */
  suggestedPrompts?: string[];
  /**
   * Inline style merged onto the outermost shell element.
   */
  style?: CSSProperties;
  /**
   * Additional CSS class names applied to the outermost shell element.
   */
  className?: string;
  /**
   * Optional prop overrides forwarded to `ChatTopBar`.
   * `darkMode` is always controlled by this panel and cannot be overridden.
   */
  topBar?: Omit<ChatTopBarProps, "darkMode">;
  /**
   * Optional prop overrides forwarded to `ChatMessageList`.
   * `darkMode` is always controlled by this panel and cannot be overridden.
   */
  messageList?: Omit<ChatMessageListProps, "darkMode">;
  /**
   * Optional prop overrides forwarded to `ChatInputBar`.
   * `darkMode` is always controlled by this panel and cannot be overridden.
   */
  inputBar?: Omit<ChatInputBarProps, "darkMode">;
  /**
   * Replace the entire panel body (top bar + messages + input).
   * When provided, the default Layer 2 composition is not rendered.
   * Still wrapped by `AgentProvider`.
   */
  children?: ReactNode;
}

/**
 * Layer 3 — fully composed, drop-in agent panel.
 *
 * Wraps `AgentProvider` and renders the Layer 2 stack
 * (`ChatTopBar` + `ChatMessageList` + `ChatInputBar`) inside a styled shell.
 *
 * ```tsx
 * <GluonAgentPanel basePath="/api/gluon-ai" darkMode frostedGlass />
 * ```
 */
export function GluonAgentPanel({
  darkMode = false,
  frostedGlass = false,
  basePath = "/api/gluon-ai",
  queryClient,
  actionBlocks,
  suggestedPrompts,
  style,
  className,
  topBar,
  messageList,
  inputBar,
  children,
}: GluonAgentPanelProps) {
  const background = frostedGlass
    ? (darkMode ? "rgba(10, 10, 10, 0.85)" : "rgba(255, 255, 255, 0.85)")
    : (darkMode ? "#0a0a0a" : "#ffffff");

  const panelStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    background,
    borderLeft: darkMode
      ? "1px solid rgba(255, 255, 255, 0.1)"
      : "1px solid rgba(0, 0, 0, 0.08)",
    boxSizing: "border-box",
    minWidth: 0,
    minHeight: 0,
    fontFamily: "'Urbanist', system-ui, sans-serif",
    ...style,
  };

  return (
    <AgentProvider
      basePath={basePath}
      queryClient={queryClient}
      actionBlocks={actionBlocks}
      suggestedPrompts={suggestedPrompts}
    >
      <div
        data-gluon-agent-panel=""
        {...(darkMode ? { "data-dark": "" } : {})}
        {...(frostedGlass ? { "data-frosted": "" } : {})}
        className={className}
        style={panelStyle}
      >
        <style>{PANEL_CSS}</style>
        {children ?? (
          <>
            <ChatTopBar {...topBar} darkMode={darkMode} />
            <ChatMessageList {...messageList} darkMode={darkMode} />
            <ChatInputBar {...inputBar} darkMode={darkMode} />
          </>
        )}
      </div>
    </AgentProvider>
  );
}
