"use client";

import React, { type CSSProperties } from "react";
import type { AgentChat } from "../../types/AgentSessionAdapter";
import { ChatListItem, type ChatListItemProps } from "./ChatListItem";

export interface ChatListProps {
  chats?: AgentChat[];
  activeChatId: string | null;
  busyChatIds?: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  /** Override the item component. */
  renderItem?: (props: ChatListItemProps) => React.ReactNode;
  /** Override the "new chat" trigger. */
  renderNewButton?: () => React.ReactNode;
  /** Override the empty state. */
  renderEmpty?: () => React.ReactNode;
  className?: string;
  style?: CSSProperties;
  classNames?: {
    newButton?: string;
    list?: string;
    item?: string;
    empty?: string;
  };
  styles?: {
    newButton?: CSSProperties;
    list?: CSSProperties;
    item?: CSSProperties;
    empty?: CSSProperties;
  };
}

/**
 * Headless chat list. Renders a `<div data-slot="chat-list">` containing a
 * "new chat" button and a list of `ChatListItem`s. Zero styles.
 *
 * Override the item via `renderItem`, the new-chat button via `renderNewButton`,
 * or the empty state via `renderEmpty`.
 */
export function ChatList({
  chats,
  activeChatId,
  busyChatIds = new Set(),
  onSelect,
  onNew,
  onDelete,
  renderItem,
  renderNewButton,
  renderEmpty,
  className,
  style,
  classNames = {},
  styles = {},
}: ChatListProps) {
  const items = chats ?? [];

  return (
    <div data-slot="chat-list" className={className} style={style}>
      {renderNewButton ? (
        renderNewButton()
      ) : (
        <button
          type="button"
          data-slot="new-chat-button"
          aria-label="New chat"
          className={classNames.newButton}
          style={styles.newButton}
          onClick={onNew}
        >
          New chat
        </button>
      )}

      <div data-slot="chat-items" className={classNames.list} style={styles.list}>
        {items.length === 0 ? (
          renderEmpty ? (
            renderEmpty()
          ) : (
            <div
              data-slot="chat-list-empty"
              className={classNames.empty}
              style={styles.empty}
            />
          )
        ) : (
          items.map((chat) => {
            const itemProps: ChatListItemProps = {
              chat,
              isActive: activeChatId === chat.id,
              isBusy: busyChatIds.has(chat.id),
              onSelect,
              onDelete,
              className: classNames.item,
              style: styles.item,
            };
            return renderItem ? (
              <React.Fragment key={chat.id}>{renderItem(itemProps)}</React.Fragment>
            ) : (
              <ChatListItem key={chat.id} {...itemProps} />
            );
          })
        )}
      </div>
    </div>
  );
}
