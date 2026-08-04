"use client";

import React, { type CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────────────────

export interface SlashCommand {
  /** Unique stable identifier (e.g. "summarize"). */
  id: string;
  /** Short human-readable label shown in the menu (e.g. "Summarize"). */
  label: string;
  /** One-line description of what the command does. */
  description: string;
}

export interface SlashCommandMenuProps {
  /** Commands to display. Empty array hides the component. */
  commands: SlashCommand[];
  /** Zero-based index of the currently highlighted item. */
  highlightedIndex: number;
  /** Called when the user clicks or keyboard-confirms a command. */
  onSelect: (command: SlashCommand) => void;
  className?: string;
  style?: CSSProperties;
  /** Per-item class name override. */
  itemClassName?: string;
  /** Applied to a highlighted item in addition to `itemClassName`. */
  itemHighlightedClassName?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Headless slash-command popup list — zero built-in styles.
 *
 * Renders a `role="listbox"` container with `role="option"` buttons.
 * Use `data-slot` attributes to target elements:
 *   - `data-slot="slash-command-menu"` — outermost container
 *   - `data-slot="slash-command-item"` — each command row
 *     - `data-highlighted=""` present when the row is active
 *   - `data-slot="slash-command-label"` — command label span
 *   - `data-slot="slash-command-description"` — description span
 *
 * Keyboard navigation is handled by the parent (e.g. ChatInputBar).
 * `onMouseDown` is `e.preventDefault()`-ed on each item so clicking
 * a command never blurs the textarea.
 */
export function HeadlessSlashCommandMenu({
  commands,
  highlightedIndex,
  onSelect,
  className,
  style,
  itemClassName,
  itemHighlightedClassName,
}: SlashCommandMenuProps) {
  if (commands.length === 0) return null;

  return (
    <div
      data-slot="slash-command-menu"
      role="listbox"
      aria-label="Slash commands"
      className={className}
      style={style}
    >
      {commands.map((cmd, idx) => {
        const isHighlighted = idx === highlightedIndex;
        const itemClass = [
          itemClassName,
          isHighlighted ? itemHighlightedClassName : undefined,
        ]
          .filter(Boolean)
          .join(" ") || undefined;

        return (
          <button
            key={cmd.id}
            type="button"
            role="option"
            aria-selected={isHighlighted}
            data-slot="slash-command-item"
            {...(isHighlighted ? { "data-highlighted": "" } : {})}
            className={itemClass}
            onClick={() => onSelect(cmd)}
            // Prevent the textarea from losing focus on click.
            onMouseDown={(e) => e.preventDefault()}
          >
            <span data-slot="slash-command-label">{cmd.label}</span>
            <span data-slot="slash-command-description">{cmd.description}</span>
          </button>
        );
      })}
    </div>
  );
}
