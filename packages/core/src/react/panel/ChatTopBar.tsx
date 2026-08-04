"use client";

import React, {
  type CSSProperties,
  type ReactNode,
} from "react";
import { NewChatButton } from "../styled/NewChatButton";
import { ModeSwitch } from "../styled/ModeSwitch";
import { ChatSelect } from "../styled/ChatSelect";
import type { ChatSelectProps } from "../styled/ChatSelect";

// ── Scoped CSS ─────────────────────────────────────────────────────────────
// (No CSS needed; all defaults are in the JS rootStyle object below.)

export interface ChatTopBarStyles {
  root?: CSSProperties;
  newChatButton?: CSSProperties;
  reasoningPills?: CSSProperties;
  historyButton?: CSSProperties;
}

export interface ChatTopBarProps {
  style?: CSSProperties;
  className?: string;
  styles?: ChatTopBarStyles;
  showReasoningPills?: boolean;
  showChatHistory?: boolean;
  onNewChat?: () => void;
  slots?: {
    newChatButton?: ReactNode;
  };
  darkMode?: boolean;
}

// ── ChatTopBar ─────────────────────────────────────────────────────────────

/**
 * Self-contained top control bar for the agent chat UI.
 * Now composed from Layer 2 styled components: `NewChatButton`, `ModeSwitch`, `ChatSelect`.
 *
 * Must be rendered inside `<AgentProvider>`. All data is sourced automatically.
 */
export function ChatTopBar({
  style,
  className,
  styles,
  showReasoningPills = true,
  showChatHistory = true,
  onNewChat,
  slots,
  darkMode = false,
}: ChatTopBarProps) {
  const chatSelectProps: ChatSelectProps = {
    darkMode,
    styles: styles?.historyButton ? { trigger: styles.historyButton } : undefined,
  };

  const rootStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 10px",
    borderBottom: darkMode
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(0,0,0,0.06)",
    flexShrink: 0,
    background: "transparent",
    boxSizing: "border-box",
    position: "relative",
    ...styles?.root,
    ...style,
  };

  return (
    <>
      <div
        data-gluon-topbar=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={`gluon-topbar${className ? ` ${className}` : ""}`}
        style={rootStyle}
      >
        {slots?.newChatButton ?? (
          <NewChatButton
            darkMode={darkMode}
            style={styles?.newChatButton}
            onClick={onNewChat}
          />
        )}

        {showReasoningPills && (
          <ModeSwitch darkMode={darkMode} style={styles?.reasoningPills} />
        )}

        {showChatHistory && (
          <div style={{ marginLeft: "auto" }}>
            <ChatSelect {...chatSelectProps} />
          </div>
        )}
      </div>
    </>
  );
}
