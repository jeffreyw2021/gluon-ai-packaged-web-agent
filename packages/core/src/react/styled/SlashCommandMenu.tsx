"use client";

import React, { type CSSProperties } from "react";
import type { SlashCommand } from "../input/SlashCommandMenu";
import { Layers } from "lucide-react";

// ── CSS ────────────────────────────────────────────────────────────────────

const SLASH_MENU_CSS = `
[data-gluon-slash-menu] {
  --gluon-sm-bg: rgba(255,255,255,0.92);
  --gluon-sm-border: rgba(0,0,0,0.08);
  --gluon-sm-shadow: 0 4px 24px -4px rgba(0,0,0,0.12), 0 1px 4px -1px rgba(0,0,0,0.06);
  --gluon-sm-item-hover: rgba(0,0,0,0.04);
  --gluon-sm-item-active: rgba(0,0,0,0.07);
  --gluon-sm-prefix-bg: rgba(0,0,0,0.06);
  --gluon-sm-prefix-color: #525252;
  --gluon-sm-label: #171717;
  --gluon-sm-desc: #737373;
  --gluon-sm-icon: #a3a3a3;
}
[data-gluon-slash-menu][data-dark] {
  --gluon-sm-bg: rgba(26,26,28,0.95);
  --gluon-sm-border: rgba(255,255,255,0.10);
  --gluon-sm-shadow: 0 4px 24px -4px rgba(0,0,0,0.55), 0 1px 4px -1px rgba(0,0,0,0.35);
  --gluon-sm-item-hover: rgba(255,255,255,0.06);
  --gluon-sm-item-active: rgba(255,255,255,0.10);
  --gluon-sm-prefix-bg: rgba(255,255,255,0.08);
  --gluon-sm-prefix-color: #d4d4d4;
  --gluon-sm-label: #f5f5f5;
  --gluon-sm-desc: #909090;
  --gluon-sm-icon: #737373;
}

[data-gluon-slash-menu] .gluon-sm-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.1s ease;
}
[data-gluon-slash-menu] .gluon-sm-item:hover {
  background: var(--gluon-sm-item-hover);
}
[data-gluon-slash-menu] .gluon-sm-item[data-highlighted] {
  background: var(--gluon-sm-item-active);
}

[data-gluon-slash-menu] .gluon-sm-badge {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--gluon-sm-prefix-bg);
  color: var(--gluon-sm-prefix-color);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  user-select: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

[data-gluon-slash-menu] .gluon-sm-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

[data-gluon-slash-menu] .gluon-sm-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--gluon-sm-label);
  line-height: 1.3;
}

[data-gluon-slash-menu] .gluon-sm-desc {
  font-size: 11.5px;
  color: var(--gluon-sm-desc);
  line-height: 1.3;
}

[data-gluon-slash-menu] .gluon-sm-icon {
  flex-shrink: 0;
  color: var(--gluon-sm-icon);
}
` as const;

// ── Types ──────────────────────────────────────────────────────────────────

export interface SlashCommandMenuProps {
  commands: SlashCommand[];
  highlightedIndex: number;
  onSelect: (command: SlashCommand) => void;
  darkMode?: boolean;
  style?: CSSProperties;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Styled slash-command popup (Layer 2).
 *
 * Renders a floating card with `/`-badged command rows.
 * Keyboard navigation is driven by the parent (`ChatInputBar`).
 *
 * Position the card via the `style` prop (e.g. `position: absolute`, `bottom: 100%`).
 */
export function SlashCommandMenu({
  commands,
  highlightedIndex,
  onSelect,
  darkMode = false,
  style,
  className,
}: SlashCommandMenuProps) {
  if (commands.length === 0) return null;

  const wrapperStyle: CSSProperties = {
    background: "var(--gluon-sm-bg)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid var(--gluon-sm-border)",
    borderRadius: 12,
    boxShadow: "var(--gluon-sm-shadow)",
    padding: 4,
    overflow: "hidden",
    ...style,
  };

  return (
    <>
      <style>{SLASH_MENU_CSS}</style>
      <div
        data-gluon-slash-menu=""
        {...(darkMode ? { "data-dark": "" } : {})}
        role="listbox"
        aria-label="Slash commands"
        className={`gluon-slash-menu${className ? ` ${className}` : ""}`}
        style={wrapperStyle}
      >
        {commands.map((cmd, idx) => {
          const isHighlighted = idx === highlightedIndex;
          return (
            <button
              key={cmd.id}
              type="button"
              role="option"
              aria-selected={isHighlighted}
              data-slot="slash-command-item"
              {...(isHighlighted ? { "data-highlighted": "" } : {})}
              className="gluon-sm-item"
              onClick={() => onSelect(cmd)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className="gluon-sm-badge" aria-hidden>/</span>
              <span className="gluon-sm-text">
                <span className="gluon-sm-label" data-slot="slash-command-label">
                  {cmd.label}
                </span>
                <span className="gluon-sm-desc" data-slot="slash-command-description">
                  {cmd.description}
                </span>
              </span>
              <Layers
                size={13}
                strokeWidth={1.5}
                className="gluon-sm-icon"
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </>
  );
}
