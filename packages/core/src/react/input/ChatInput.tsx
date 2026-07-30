"use client";

import React, { type CSSProperties } from "react";
import type { RunPhase } from "../../types/RunPhase";
import { useChatInput } from "../hooks/useChatInput";

export interface ChatInputClassNames {
  /** Root `<form>` element. Prefer the top-level `className` prop for simple cases. */
  root?: string;
  textarea?: string;
  submitButton?: string;
}

export interface ChatInputStyles {
  /** Root `<form>` element. Prefer the top-level `style` prop for simple cases. */
  root?: CSSProperties;
  textarea?: CSSProperties;
  submitButton?: CSSProperties;
}

export interface ChatInputProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop?: () => void;
  runPhase: RunPhase;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Pass `true` when files are attached so the send button is enabled and
   * Enter triggers send even if the textarea is empty.
   * Forwarded to `useChatInput({ hasAttachments })`.
   */
  hasAttachments?: boolean;
  /**
   * Root `<form>` class name. Takes precedence over `classNames.root`.
   * Consistent with every other gluon component that accepts `className` for
   * the root element.
   */
  className?: string;
  /**
   * Root `<form>` inline style. Takes precedence over `styles.root`.
   */
  style?: CSSProperties;
  /** Per-element class names (root, textarea, submitButton). */
  classNames?: ChatInputClassNames;
  /** Per-element inline style overrides (root, textarea, submitButton). */
  styles?: ChatInputStyles;
  /**
   * Fully custom submit button content.
   * Receives `{ isActive, canSend }` — render your own icon/label.
   * If omitted, renders an unstyled `<button>`.
   */
  renderSubmitButton?: (props: { isActive: boolean; canSend: boolean }) => React.ReactNode;
}

/**
 * Headless chat input. Wires textarea auto-grow, Enter-to-send, and
 * send/stop logic — zero built-in styles. Apply your own via
 * `className`, `style`, `classNames`, `styles`, or override the submit
 * button with `renderSubmitButton`.
 *
 * `data-slot="chat-input"` on the root `<form>`.
 * `data-active="true"` on the root `<form>` when a run is in progress.
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  runPhase,
  placeholder = "Message…",
  disabled = false,
  hasAttachments = false,
  className,
  style,
  classNames = {},
  styles = {},
  renderSubmitButton,
}: ChatInputProps) {
  const { isActive, canSend, textareaRef, handleChange, handleKeyDown, handleSubmit } =
    useChatInput({ value, onChange, onSend, onStop, runPhase, hasAttachments });

  return (
    <form
      data-slot="chat-input"
      onSubmit={handleSubmit}
      data-active={isActive ? "true" : undefined}
      className={className ?? classNames.root}
      style={style ?? styles.root}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isActive}
        rows={1}
        aria-label="Message input"
        className={classNames.textarea}
        style={styles.textarea}
      />
      {renderSubmitButton ? (
        renderSubmitButton({ isActive, canSend })
      ) : (
        <button
          type="submit"
          disabled={disabled || (!isActive && !canSend)}
          aria-label={isActive ? "Stop" : "Send"}
          className={classNames.submitButton}
          style={styles.submitButton}
        >
          {isActive ? "■" : "↑"}
        </button>
      )}
    </form>
  );
}
