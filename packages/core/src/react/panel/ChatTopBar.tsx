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

const TOPBAR_CSS = `
[data-gluon-topbar] {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
  background: transparent;
  box-sizing: border-box;
  position: relative;
}
[data-gluon-topbar][data-dark] {
  border-bottom-color: rgba(255,255,255,0.08);
}
` as const;

// ── Types ─────────────────────────────────────────────────────────────────

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

  return (
    <>
      <style>{TOPBAR_CSS}</style>
      <div
        data-gluon-topbar=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={`gluon-topbar${className ? ` ${className}` : ""}`}
        style={{ ...styles?.root, ...style }}
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
