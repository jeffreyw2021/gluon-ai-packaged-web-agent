"use client";

import { useCallback } from "react";
import type { AgentSessionAdapter } from "../../types/AgentSessionAdapter";
import type { UseAttachmentsReturn } from "./useAttachments";
import type { UseSpeechTranscriberReturn } from "./useSpeechTranscriber";
import { buildSendPayload } from "../lib/attachmentPayload";

export interface UseComposerActionsOptions {
  /** The adapter from `useAgentContext().adapter` or `useAgentAdapter(...)`. */
  adapter: AgentSessionAdapter;
  /**
   * Full return value of `useAttachments()`.
   * When provided, `handleSend` builds the attachment payload and clears
   * all files after a successful send.
   */
  attachments?: UseAttachmentsReturn;
  /**
   * Full return value of `useSpeechTranscriber()`.
   * When provided, `handleMicToggle` starts/stops transcription and commits
   * the final transcript to the composer input on stop.
   */
  transcriber?: UseSpeechTranscriberReturn;
}

export interface UseComposerActionsReturn {
  /**
   * Send the current composer input (with any attached files) as a user message.
   * - Builds the payload via `buildSendPayload` so extracted file text is included.
   * - Clears the composer text and all attachments after dispatching.
   * - No-ops when there is nothing to send.
   */
  handleSend: () => void;
  /**
   * Send a one-off suggested prompt directly.
   * Does **not** clear the composer text or attachments.
   */
  handleSuggestedPrompt: (prompt: string) => void;
  /**
   * Toggle the microphone on/off.
   * - **Start:** resets any stale transcript, then begins listening.
   * - **Stop:** stops listening and appends the final transcript to the composer
   *   input (space-separated if there is already text), then resets the transcript.
   * No-ops when no `transcriber` was supplied.
   */
  handleMicToggle: () => void;
}

/**
 * Composes the three standard message-sending actions from their primitive hooks.
 *
 * Use this instead of wiring `handleSend`, `handleSuggestedPrompt`, and
 * `handleMicToggle` by hand in every consumer component.
 *
 * @example
 * ```tsx
 * const transcriber = useSpeechTranscriber();
 * const attachmentsHook = useAttachments();
 * const { adapter } = useAgentContext();
 *
 * const { handleSend, handleSuggestedPrompt, handleMicToggle } = useComposerActions({
 *   adapter,
 *   attachments: attachmentsHook,
 *   transcriber,
 * });
 * ```
 */
export function useComposerActions({
  adapter,
  attachments,
  transcriber,
}: UseComposerActionsOptions): UseComposerActionsReturn {
  const handleSend = useCallback(() => {
    const inputText = adapter.composer.inputText.trim();
    const attachmentList = attachments?.attachments ?? [];
    const payload = buildSendPayload(inputText, attachmentList);

    if (!payload && attachmentList.length === 0) return;

    adapter.composer.setInputText("");
    attachments?.clearAll();
    void adapter.sendUserMessage(payload);
  }, [adapter, attachments]);

  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      void adapter.sendUserMessage(prompt);
    },
    [adapter],
  );

  const handleMicToggle = useCallback(() => {
    if (!transcriber) return;

    if (transcriber.listening) {
      // commitAndReset() reads from refs that are updated synchronously inside
      // onresult — never stale, even if React hasn't flushed pending state updates.
      // It also stops the recognizer and clears state atomically.
      const combined = transcriber.commitAndReset();
      if (combined) {
        const current = adapter.composer.inputText;
        adapter.composer.setInputText(
          current.trim() ? `${current.trim()} ${combined}` : combined,
        );
      }
    } else {
      transcriber.reset();
      transcriber.start();
    }
  }, [transcriber, adapter]);

  return { handleSend, handleSuggestedPrompt, handleMicToggle };
}
