"use client";

import React, {
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { useChatList } from "../hooks/useChatList";
import type { UseChatListReturn } from "../hooks/useChatList";
import type { ReasoningMode } from "../../types/ReasoningMode";
import { Plus, ChevronDown, X } from "lucide-react";

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
  --gluon-tb-icon: #a3a3a3;
}

[data-gluon-topbar] .gluon-tb-newchat {
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
}
[data-gluon-topbar] .gluon-tb-newchat:hover {
  color: #262626;
  background: rgba(0,0,0,0.06);
}

[data-gluon-topbar] .gluon-tb-pills {
  display: flex;
  align-items: center;
  height: 28px;
  border-radius: 8px;
  background: rgba(0,0,0,0.04);
  padding: 0 2px;
  gap: 1px;
}

[data-gluon-topbar] .gluon-tb-pill {
  padding: 0 8px;
  height: 100%;
  border-radius: 6px;
  font-size: 0.6875rem;
  border: none;
  cursor: pointer;
  background: transparent;
  color: #a3a3a3;
  transition: color 0.15s;
}
[data-gluon-topbar] .gluon-tb-pill:hover {
  color: #525252;
}
[data-gluon-topbar] .gluon-tb-pill-active {
  background: rgba(255,255,255,0.8);
  color: #171717;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

[data-gluon-topbar] .gluon-tb-history-wrap {
  position: relative;
  margin-left: auto;
}

[data-gluon-topbar] .gluon-tb-history-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  max-width: 110px;
  font-size: 0.6875rem;
  color: #737373;
  padding: 0 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  overflow: hidden;
  transition: color 0.15s, background-color 0.15s;
}
[data-gluon-topbar] .gluon-tb-history-btn:hover {
  color: #262626;
  background: rgba(0,0,0,0.05);
}
[data-gluon-topbar] .gluon-tb-history-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-gluon-topbar] .gluon-tb-chevron {
  flex-shrink: 0;
  color: var(--gluon-tb-icon);
}

[data-gluon-topbar] .gluon-tb-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 6px;
  width: 256px;
  background: white;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
  z-index: 50;
  overflow: hidden;
}

[data-gluon-topbar] .gluon-tb-dropdown-scroll {
  padding: 6px;
  max-height: 288px;
  overflow-y: auto;
  scrollbar-width: none;
}
[data-gluon-topbar] .gluon-tb-dropdown-scroll::-webkit-scrollbar {
  display: none;
}

[data-gluon-topbar] .gluon-tb-chat-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  text-align: left;
  font-size: 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  gap: 8px;
  color: #737373;
  transition: background-color 0.15s, color 0.15s;
}
[data-gluon-topbar] .gluon-tb-chat-item:hover {
  background: rgba(0,0,0,0.04);
  color: #262626;
}
[data-gluon-topbar] .gluon-tb-chat-item-active {
  background: rgba(0,0,0,0.07);
  color: #171717;
}

[data-gluon-topbar] .gluon-tb-chat-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  line-height: 1.375;
}

[data-gluon-topbar] .gluon-tb-delete {
  flex-shrink: 0;
  opacity: 0;
  cursor: pointer;
  color: #a3a3a3;
  background: none;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  transition: opacity 0.15s, color 0.15s;
}
[data-gluon-topbar] .gluon-tb-chat-item:hover .gluon-tb-delete {
  opacity: 1;
}
[data-gluon-topbar] .gluon-tb-delete:hover {
  color: #ef4444;
}

[data-gluon-topbar] .gluon-tb-no-chats {
  padding: 20px 12px;
  font-size: 0.75rem;
  color: #a3a3a3;
  text-align: center;
}

/* ── Dark mode ─────────────────────────────────────────────────────────── */
[data-gluon-topbar][data-dark] {
  border-bottom-color: rgba(255,255,255,0.08);
  background: transparent;
  --gluon-tb-icon: #737373;
}
[data-gluon-topbar][data-dark] .gluon-tb-newchat { color: #737373; }
[data-gluon-topbar][data-dark] .gluon-tb-newchat:hover {
  color: #e5e5e5;
  background: rgba(255,255,255,0.08);
}
[data-gluon-topbar][data-dark] .gluon-tb-pills {
  background: rgba(255,255,255,0.06);
}
[data-gluon-topbar][data-dark] .gluon-tb-pill { color: #737373; }
[data-gluon-topbar][data-dark] .gluon-tb-pill:hover { color: #d4d4d4; }
[data-gluon-topbar][data-dark] .gluon-tb-pill-active {
  background: rgba(255,255,255,0.12);
  color: #f5f5f5;
  box-shadow: 0 1px 2px rgba(0,0,0,0.35);
}
[data-gluon-topbar][data-dark] .gluon-tb-history-btn { color: #a3a3a3; }
[data-gluon-topbar][data-dark] .gluon-tb-history-btn:hover {
  color: #e5e5e5;
  background: rgba(255,255,255,0.08);
}
[data-gluon-topbar][data-dark] .gluon-tb-dropdown {
  background: #1a1a1a;
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.45), 0 8px 10px -6px rgba(0,0,0,0.4);
}
[data-gluon-topbar][data-dark] .gluon-tb-chat-item { color: #a3a3a3; }
[data-gluon-topbar][data-dark] .gluon-tb-chat-item:hover {
  background: rgba(255,255,255,0.06);
  color: #e5e5e5;
}
[data-gluon-topbar][data-dark] .gluon-tb-chat-item-active {
  background: rgba(255,255,255,0.1);
  color: #f5f5f5;
}
[data-gluon-topbar][data-dark] .gluon-tb-delete { color: #737373; }
[data-gluon-topbar][data-dark] .gluon-tb-no-chats { color: #737373; }
` as const;

// ── Types ─────────────────────────────────────────────────────────────────

const REASONING_MODES = [
  { value: "simple" as const, label: "Simple" },
  { value: "auto" as const, label: "Auto" },
  { value: "thinking" as const, label: "Think" },
] satisfies Array<{ value: ReasoningMode; label: string }>;

export interface ChatTopBarStyles {
  root?: CSSProperties;
  newChatButton?: CSSProperties;
  reasoningPills?: CSSProperties;
  historyButton?: CSSProperties;
}

export interface ChatTopBarProps {
  /**
   * Inline style merged onto the outermost element.
   * Any key here overrides the matching default style.
   */
  style?: CSSProperties;
  /**
   * Additional CSS class names applied to the outermost element.
   * Use this to target the component or override styles via CSS.
   */
  className?: string;
  /**
   * Per-slot style overrides for named internal elements.
   * Each entry is merged on top of the element's default styles.
   */
  styles?: ChatTopBarStyles;
  /**
   * Show the Simple / Auto / Think reasoning mode pills.
   * Defaults to `true`. Set to `false` to hide the pills.
   */
  showReasoningPills?: boolean;
  /**
   * Show the chat history dropdown.
   * Defaults to `true`. Set to `false` to hide it.
   */
  showChatHistory?: boolean;
  /**
   * Override the handler called when the user creates a new chat.
   * When omitted the default `useChatList().newChat` is used.
   */
  onNewChat?: () => void;
  /**
   * Optional slot overrides. Each slot replaces one hardcoded UI section.
   */
  slots?: {
    /** Replaces the default "+" new-chat button. */
    newChatButton?: ReactNode;
  };
  /**
   * When `true`, applies the dark-mode color palette.
   * Defaults to `false`.
   */
  darkMode?: boolean;
}

// ── Chat history dropdown ─────────────────────────────────────────────────

function ChatHistoryDropdown({
  open,
  chats,
  activeChatId,
  onSelect,
  onDelete,
}: {
  open: boolean;
  chats: UseChatListReturn["chats"];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="gluon-tb-dropdown">
      <div className="gluon-tb-dropdown-scroll">
        {chats?.length ? (
          chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelect(chat.id)}
              className={`gluon-tb-chat-item${chat.id === activeChatId ? " gluon-tb-chat-item-active" : ""}`}
            >
              <span className="gluon-tb-chat-title">
                {chat.title || "Untitled chat"}
              </span>
              <span
                role="button"
                tabIndex={0}
                aria-label="Delete chat"
                className="gluon-tb-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chat.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onDelete(chat.id);
                  }
                }}
              >
                <X width={12} height={12} />
              </span>
            </button>
          ))
        ) : (
          <p className="gluon-tb-no-chats">No chats yet</p>
        )}
      </div>
    </div>
  );
}

// ── ChatTopBar ─────────────────────────────────────────────────────────────

/**
 * Self-contained top control bar for the agent chat UI.
 *
 * Must be rendered inside `<AgentProvider>`. All data (chat list, reasoning
 * mode) is sourced automatically from context — no data props required.
 *
 * Pass `style` to override the outermost container's styles.
 * Pass `styles` to target named internal elements.
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
  const { adapter } = useAgentContext();
  const { reasoningMode, setReasoningMode } = adapter;
  const chatList = useChatList();

  const handleNewChat = onNewChat ?? chatList.newChat;

  const [showDropdown, setShowDropdown] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    function handler(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const activeChat = chatList.chats?.find((c) => c.id === chatList.activeChatId);

  return (
    <>
      <style>{TOPBAR_CSS}</style>
      <div
        data-gluon-topbar=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={`gluon-topbar${className ? ` ${className}` : ""}`}
        style={{ ...styles?.root, ...style }}
      >
        {/* New chat button */}
        {slots?.newChatButton ?? (
          <button
            type="button"
            title="New chat"
            onClick={handleNewChat}
            className="gluon-tb-newchat"
            style={styles?.newChatButton}
          >
            <Plus width={14} height={14} />
          </button>
        )}

        {/* Reasoning mode pills */}
        {showReasoningPills && (
          <div className="gluon-tb-pills" style={styles?.reasoningPills}>
            {REASONING_MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setReasoningMode(value)}
                className={`gluon-tb-pill${reasoningMode === value ? " gluon-tb-pill-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Chat history dropdown */}
        {showChatHistory && (
          <div className="gluon-tb-history-wrap" ref={historyRef}>
            <button
              type="button"
              onClick={() => setShowDropdown((v) => !v)}
              className="gluon-tb-history-btn"
              style={styles?.historyButton}
            >
              <span className="gluon-tb-history-title">
                {activeChat?.title || "Chats"}
              </span>
              <ChevronDown width={10} height={10} className="gluon-tb-chevron" />
            </button>
            <ChatHistoryDropdown
              open={showDropdown}
              chats={chatList.chats}
              activeChatId={chatList.activeChatId}
              onSelect={(id) => {
                chatList.selectChat(id);
                setShowDropdown(false);
              }}
              onDelete={chatList.deleteChat}
            />
          </div>
        )}
      </div>
    </>
  );
}
