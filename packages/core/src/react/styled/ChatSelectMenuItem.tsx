"use client";

import React, { type CSSProperties } from "react";
import { X } from "lucide-react";

const CSS = `
[data-gluon-chat-menu-item] {
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
  box-sizing: border-box;
}
[data-gluon-chat-menu-item]:hover {
  background: rgba(0,0,0,0.04);
  color: #262626;
}
[data-gluon-chat-menu-item][data-active] {
  background: rgba(0,0,0,0.07);
  color: #171717;
}
[data-gluon-chat-menu-item][data-dark] { color: #a3a3a3; }
[data-gluon-chat-menu-item][data-dark]:hover {
  background: rgba(255,255,255,0.06);
  color: #e5e5e5;
}
[data-gluon-chat-menu-item][data-dark][data-active] {
  background: rgba(255,255,255,0.1);
  color: #f5f5f5;
}
[data-gluon-chat-menu-item] .gluon-cmi-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  line-height: 1.375;
}
[data-gluon-chat-menu-item] .gluon-cmi-delete {
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
[data-gluon-chat-menu-item]:hover .gluon-cmi-delete { opacity: 1; }
[data-gluon-chat-menu-item] .gluon-cmi-delete:hover { color: #ef4444; }
[data-gluon-chat-menu-item][data-dark] .gluon-cmi-delete { color: #737373; }
` as const;

export interface ChatSelectMenuItemProps {
  title: string;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent | React.KeyboardEvent) => void;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Styled single-row chat menu item. Renders a button with a truncated title
 * and an optional delete affordance that appears on hover.
 */
export function ChatSelectMenuItem({
  title,
  isActive,
  onClick,
  onDelete,
  darkMode = false,
  className,
  style,
}: ChatSelectMenuItemProps) {
  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        data-gluon-chat-menu-item=""
        {...(darkMode ? { "data-dark": "" } : {})}
        {...(isActive ? { "data-active": "" } : {})}
        onClick={onClick}
        className={className}
        style={style}
      >
        <span className="gluon-cmi-title">{title}</span>
        {onDelete && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Delete chat"
            className="gluon-cmi-delete"
            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.stopPropagation(); onDelete(e); }
            }}
          >
            <X width={12} height={12} />
          </span>
        )}
      </button>
    </>
  );
}
