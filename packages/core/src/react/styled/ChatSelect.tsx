"use client";

import React, {
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  type ComponentType,
} from "react";
import { useChatList } from "../hooks/useChatList";
import { ChevronDown } from "lucide-react";
import { ChatSelectMenu } from "./ChatSelectMenu";
import type { ChatSelectMenuProps } from "./ChatSelectMenu";
import type { ChatSelectMenuItemProps } from "./ChatSelectMenuItem";

const CSS = `
[data-gluon-chat-select] {
  position: relative;
  box-sizing: border-box;
}
[data-gluon-chat-select] .gluon-cs-trigger {
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
  box-sizing: border-box;
}
[data-gluon-chat-select] .gluon-cs-trigger:hover {
  color: #262626;
  background: rgba(0,0,0,0.05);
}
[data-gluon-chat-select][data-dark] .gluon-cs-trigger { color: #a3a3a3; }
[data-gluon-chat-select][data-dark] .gluon-cs-trigger:hover {
  color: #e5e5e5;
  background: rgba(255,255,255,0.08);
}
[data-gluon-chat-select] .gluon-cs-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-gluon-chat-select] .gluon-cs-chevron {
  flex-shrink: 0;
  color: #a3a3a3;
}
[data-gluon-chat-select][data-dark] .gluon-cs-chevron { color: #737373; }
[data-gluon-chat-select] .gluon-cs-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 6px;
  width: 256px;
  z-index: 50;
}
` as const;

export interface ChatSelectStyles {
  trigger?: CSSProperties;
}

export interface ChatSelectProps {
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Per-element style overrides. */
  styles?: ChatSelectStyles;
  /**
   * Override the menu or menu-item components. The default menu is
   * `ChatSelectMenu`; the default item is `ChatSelectMenuItem`.
   */
  components?: {
    menu?: ComponentType<ChatSelectMenuProps>;
    menuItem?: ComponentType<ChatSelectMenuItemProps>;
  };
}

/**
 * Styled chat-history selector. Renders a trigger button that opens a
 * dropdown `ChatSelectMenu`. Wires `useChatList` automatically.
 * Must be rendered inside `<AgentProvider>`.
 */
export function ChatSelect({
  darkMode = false,
  className,
  style,
  styles,
  components,
}: ChatSelectProps) {
  const chatList = useChatList();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeChat = chatList.chats?.find((c) => c.id === chatList.activeChatId);
  const Menu = components?.menu ?? ChatSelectMenu;

  return (
    <>
      <style>{CSS}</style>
      <div
        ref={ref}
        data-gluon-chat-select=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={className}
        style={style}
      >
        <button
          type="button"
          className="gluon-cs-trigger"
          style={styles?.trigger}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="gluon-cs-title">{activeChat?.title || "Chats"}</span>
          <ChevronDown width={10} height={10} className="gluon-cs-chevron" />
        </button>
        {open && (
          <div className="gluon-cs-menu">
            <Menu
              chats={chatList.chats}
              activeChatId={chatList.activeChatId}
              onSelect={(id) => { chatList.selectChat(id); setOpen(false); }}
              onDelete={chatList.deleteChat}
              darkMode={darkMode}
              components={{ item: components?.menuItem }}
            />
          </div>
        )}
      </div>
    </>
  );
}
