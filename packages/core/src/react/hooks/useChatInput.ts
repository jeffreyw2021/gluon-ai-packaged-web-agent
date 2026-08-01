"use client";

import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, FormEvent, ChangeEvent } from "react";
import { isLiveRunPhase } from "../../types/RunPhase";
import type { RunPhase } from "../../types/RunPhase";

export interface UseChatInputOptions {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop?: () => void;
  runPhase: RunPhase;
  /** Max pixel height for textarea auto-grow. Default 200. */
  maxHeight?: number;
  /**
   * When `true`, the send button is enabled and Enter triggers send even if the
   * textarea is empty. Use this when files are attached — the payload will be
   * built from attachments even without typed text.
   */
  hasAttachments?: boolean;
}

export interface UseChatInputReturn {
  value: string;
  isActive: boolean;
  canSend: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e?: FormEvent) => void;
  /** Call this after the textarea ref is attached to apply auto-grow. */
  autoGrow: () => void;
}

export function useChatInput({
  value,
  onChange,
  onSend,
  onStop,
  runPhase,
  maxHeight = 200,
  hasAttachments = false,
}: UseChatInputOptions): UseChatInputReturn {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isActive = isLiveRunPhase(runPhase);
  const hasContent = value.trim().length > 0 || hasAttachments;
  const canSend = !isActive && hasContent;

  const autoGrow = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, [maxHeight]);

  // Re-run autoGrow whenever `value` changes via any path — including
  // programmatic updates (e.g. audio transcription) that bypass the native
  // change event and therefore wouldn't otherwise trigger a resize.
  // Guard: if the element is currently `display:none` (e.g. hidden by a
  // parent while voice input is active), skip — scrollHeight would be 0
  // and we'd lock the height to 0px. The parent is responsible for calling
  // autoGrow() again once the element becomes visible (see ChatInput's
  // imperative handle).
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (typeof window !== "undefined" && window.getComputedStyle(ta).display === "none") return;
    autoGrow();
  }, [value, autoGrow]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      const ta = textareaRef.current;
      if (ta) {
        ta.style.height = "auto";
        ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
      }
    },
    [onChange, maxHeight],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isActive) return;
        if (hasContent) onSend();
      }
    },
    [hasContent, isActive, onSend],
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (isActive) {
        onStop?.();
      } else if (hasContent) {
        onSend();
      }
    },
    [isActive, onSend, onStop, hasContent],
  );

  return { value, isActive, canSend, textareaRef, handleChange, handleKeyDown, handleSubmit, autoGrow };
}
