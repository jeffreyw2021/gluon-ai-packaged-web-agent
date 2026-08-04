"use client";

import React, { type CSSProperties, type ComponentType } from "react";
import { ChatSelectMenuItem } from "./ChatSelectMenuItem";
import type { ChatSelectMenuItemProps } from "./ChatSelectMenuItem";
import type { AgentChat } from "../../types/AgentSessionAdapter";

const CSS = `
[data-gluon-chat-menu] {
  background: white;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
  overflow: hidden;
  box-sizing: border-box;
}
[data-gluon-chat-menu][data-dark] {
  background: #1a1a1a;
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.45), 0 8px 10px -6px rgba(0,0,0,0.4);
}
[data-gluon-chat-menu] .gluon-cm-scroll {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  max-height: 288px;
  overflow-y: auto;
  scrollbar-width: none;
}
[data-gluon-chat-menu] .gluon-cm-scroll::-webkit-scrollbar { display: none; }
[data-gluon-chat-menu] .gluon-cm-empty {
  padding: 20px 12px;
  font-size: 12px;
  color: #a3a3a3;
  text-align: center;
  margin: 0;
}
[data-gluon-chat-menu][data-dark] .gluon-cm-empty { color: #737373; }
` as const;

export interface ChatSelectMenuProps {
  chats: AgentChat[] | undefined;
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Override the item component rendered for each chat row. */
  components?: {
    item?: ComponentType<ChatSelectMenuItemProps>;
  };
}

/**
 * Styled scrollable menu of chat history items. Compose with `ChatSelect`
 * or render standalone (must supply `chats`, `activeChatId`, etc. yourself).
 */
export function ChatSelectMenu({
  chats,
  activeChatId,
  onSelect,
  onDelete,
  darkMode = false,
  className,
  style,
  components,
}: ChatSelectMenuProps) {
  const Item = components?.item ?? ChatSelectMenuItem;

  return (
    <>
      <style>{CSS}</style>
      <div
        data-gluon-chat-menu=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={className}
        style={style}
      >
        <div className="gluon-cm-scroll">
          {chats?.length ? (
            chats.map((chat) => (
              <Item
                key={chat.id}
                title={chat.title || "Untitled chat"}
                isActive={chat.id === activeChatId}
                onClick={() => onSelect(chat.id)}
                onDelete={(e) => { void e; onDelete(chat.id); }}
                darkMode={darkMode}
              />
            ))
          ) : (
            <p className="gluon-cm-empty">No chats yet</p>
          )}
        </div>
      </div>
    </>
  );
}
