"use client";

import React, { type CSSProperties } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { isLiveRunPhase } from "../../types/RunPhase";
import { buildSendPayload } from "../lib/attachmentPayload";
import type { UseAttachmentsReturn } from "../hooks/useAttachments";
import { ArrowRight, Square } from "lucide-react";

const CSS = `
.gluon-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
}
.gluon-send-btn-idle {
  background: rgba(0,0,0,0.05);
  color: #a3a3a3;
  cursor: not-allowed;
}
.gluon-send-btn-active {
  background: #e5e5e5;
  color: #404040;
}
.gluon-send-btn-active:hover { background: #d4d4d4; }
.gluon-send-btn-ready {
  background: #171717;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
}
.gluon-send-btn-ready:hover { background: #404040; }
.gluon-send-btn-dark.gluon-send-btn-idle {
  background: rgba(255,255,255,0.06);
  color: #737373;
}
.gluon-send-btn-dark.gluon-send-btn-active {
  background: #404040;
  color: #e5e5e5;
}
.gluon-send-btn-dark.gluon-send-btn-active:hover { background: #525252; }
.gluon-send-btn-dark.gluon-send-btn-ready {
  background: #f5f5f5;
  color: #171717;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.35), 0 2px 4px -2px rgba(0,0,0,0.3);
}
.gluon-send-btn-dark.gluon-send-btn-ready:hover { background: #e5e5e5; }
` as const;

export interface SendButtonProps {
  /**
   * Pass `useAttachments()` return value to include file content and clear
   * attachments on send.
   */
  attachments?: Pick<UseAttachmentsReturn, "attachments" | "clearAll" | "areAllReady">;
  /**
   * Override the text to send. Reads from `adapter.composer.inputText` when omitted.
   */
  text?: string;
  /**
   * When `true` the button will be shown but remain in the disabled idle state,
   * even if there is text in the composer (e.g. while the mic is listening).
   */
  disabled?: boolean;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}

/**
 * Styled send / stop button. Switches between send (ready/idle) and stop
 * (active run) states automatically. Wires the adapter from `AgentProvider`.
 * Must be rendered inside `<AgentProvider>`.
 */
export function SendButton({
  attachments,
  text,
  disabled = false,
  darkMode = false,
  className,
  style,
  children,
}: SendButtonProps) {
  const { adapter } = useAgentContext();
  const { sendUserMessage, stopGeneration, runPhase, composer } = adapter;
  const isActive = isLiveRunPhase(runPhase);
  const sendText = text ?? composer.inputText;
  const hasFiles = (attachments?.attachments.length ?? 0) > 0;
  const canSend = !isActive && (sendText.trim().length > 0 || hasFiles);

  const handleClick = () => {
    if (isActive) {
      void stopGeneration();
    } else if (canSend && !disabled) {
      const payload = buildSendPayload(sendText, attachments?.attachments ?? []);
      composer.setInputText("");
      attachments?.clearAll();
      void sendUserMessage(payload ?? sendText);
    }
  };

  const stateClass = isActive
    ? "gluon-send-btn-active"
    : canSend && !disabled
      ? "gluon-send-btn-ready"
      : "gluon-send-btn-idle";

  const cls = [
    "gluon-send-btn",
    stateClass,
    darkMode ? "gluon-send-btn-dark" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  const defaultIcon = isActive
    ? <Square width={12} height={12} />
    : <ArrowRight width={14} height={14} />;

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        data-slot="send-button"
        aria-label={isActive ? "Stop generation" : "Send message"}
        disabled={!isActive && !canSend}
        onClick={handleClick}
        className={cls}
        style={style}
      >
        {children ?? defaultIcon}
      </button>
    </>
  );
}
