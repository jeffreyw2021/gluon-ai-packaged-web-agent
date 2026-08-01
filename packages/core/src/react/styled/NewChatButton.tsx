"use client";

import React, { type CSSProperties } from "react";
import { useChatList } from "../hooks/useChatList";
import { Plus } from "lucide-react";

const CSS = `
[data-gluon-newchat-btn] {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #a3a3a3;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.15s, background-color 0.15s;
  box-sizing: border-box;
}
[data-gluon-newchat-btn]:hover {
  color: #262626;
  background: rgba(0,0,0,0.06);
}
[data-gluon-newchat-btn][data-dark] { color: #737373; }
[data-gluon-newchat-btn][data-dark]:hover {
  color: #e5e5e5;
  background: rgba(255,255,255,0.08);
}
` as const;

export interface NewChatButtonProps {
  /**
   * Called when the user clicks to start a new chat.
   * Defaults to `useChatList().newChat` when omitted.
   */
  onClick?: () => void;
  /** Icon or label rendered inside the button. Defaults to a `+` icon. */
  children?: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Apply dark palette. */
  darkMode?: boolean;
  title?: string;
}

/**
 * Styled new-chat button. Wires `useChatList().newChat` automatically;
 * pass `onClick` to override. Must be rendered inside `<AgentProvider>`.
 */
export function NewChatButton({
  onClick,
  children,
  className,
  style,
  darkMode = false,
  title = "New chat",
}: NewChatButtonProps) {
  const chatList = useChatList();
  const handleClick = onClick ?? chatList.newChat;

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        data-gluon-newchat-btn=""
        {...(darkMode ? { "data-dark": "" } : {})}
        title={title}
        aria-label={title}
        onClick={handleClick}
        className={className}
        style={style}
      >
        {children ?? <Plus width={14} height={14} />}
      </button>
    </>
  );
}
