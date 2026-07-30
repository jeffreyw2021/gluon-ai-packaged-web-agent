"use client";

import React, { type ButtonHTMLAttributes } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { isLiveRunPhase } from "../../types/RunPhase";
import { buildSendPayload } from "../lib/attachmentPayload";
import type { UseAttachmentsReturn } from "../hooks/useAttachments";

export interface SendButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Override text to send. If omitted, reads from composer.inputText. */
  text?: string;
  /**
   * Pass the return value of `useAttachments()` to include file content in the
   * sent message and clear the attachment list after dispatching.
   *
   * When provided, the button also becomes enabled when files are attached even
   * if the text input is empty.
   *
   * @example
   * ```tsx
   * const attachments = useAttachments();
   * <SendButton attachments={attachments}>Send</SendButton>
   * ```
   */
  attachments?: Pick<UseAttachmentsReturn, "attachments" | "clearAll" | "areAllReady">;
}

/**
 * Headless send button. Handles click → sendUserMessage, disables when there
 * is nothing to send or a run is active.
 *
 * - Pass `attachments` (from `useAttachments()`) to include file content in the
 *   message payload and clear files after send.
 * - Pass `text` to override the default composer input text.
 * - Pass `children` for your own icon/label.
 *
 * `data-slot="send-button"` is set on the root element for CSS targeting.
 */
export function SendButton({ children, text, attachments, disabled, onClick, ...rest }: SendButtonProps) {
  const { adapter } = useAgentContext();
  const { sendUserMessage, runPhase, composer } = adapter;
  const isActive = isLiveRunPhase(runPhase);
  const sendText = text ?? composer.inputText;
  const hasFiles = (attachments?.attachments.length ?? 0) > 0;
  const canSend = !isActive && (sendText.trim().length > 0 || hasFiles);

  return (
    <button
      type="button"
      data-slot="send-button"
      disabled={disabled ?? !canSend}
      aria-label="Send message"
      onClick={(e) => {
        if (canSend) {
          const payload = buildSendPayload(sendText, attachments?.attachments ?? []);
          composer.setInputText("");
          attachments?.clearAll();
          void sendUserMessage(payload ?? sendText);
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
