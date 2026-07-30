"use client";

import React, { type CSSProperties } from "react";
import type { AgentChat } from "../../types/AgentSessionAdapter";

export interface ChatListItemProps {
  chat: AgentChat;
  isActive: boolean;
  isBusy?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
  style?: CSSProperties;
  classNames?: {
    deleteButton?: string;
  };
  styles?: {
    deleteButton?: CSSProperties;
  };
}

/**
 * Headless chat list item. Renders a `<div data-slot="chat-item">`.
 * No styles — apply via `className` / `style`.
 *
 * Data attributes for styling:
 * - `data-active="true"` when this is the active chat
 * - `data-busy="true"` when a run is in progress for this chat
 */
export function ChatListItem({
  chat,
  isActive,
  isBusy = false,
  onSelect,
  onDelete,
  className,
  style,
  classNames = {},
  styles = {},
}: ChatListItemProps) {
  return (
    <div
      data-slot="chat-item"
      data-active={isActive ? "true" : undefined}
      data-busy={isBusy ? "true" : undefined}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      className={className}
      style={style}
      onClick={() => onSelect(chat.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(chat.id);
        }
      }}
    >
      <span data-slot="chat-title">{chat.title}</span>
      <button
        type="button"
        data-slot="delete-button"
        aria-label={`Delete "${chat.title}"`}
        className={classNames.deleteButton}
        style={styles.deleteButton}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(chat.id);
        }}
      />
    </div>
  );
}
