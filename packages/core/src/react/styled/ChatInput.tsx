"use client";

import React, { useEffect, useRef, type CSSProperties } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { HeadlessChatInput } from "../input/ChatInput";
import type { ChatInputHandle, ChatInputProps as HeadlessChatInputProps } from "../input/ChatInput";

export type { ChatInputHandle };

const CSS = `
.gluon-chat-input-box {
  border-radius: 16px;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(0,0,0,0.08);
  overflow: hidden;
  box-sizing: border-box;
}
.gluon-chat-input-box-dark {
  background: rgba(0,0,0,0.4);
  border-color: rgba(255,255,255,0.1);
}
.gluon-chat-input-textarea {
  width: 100%;
  background: transparent;
  padding: 14px 16px 6px;
  font-size: 0.875rem;
  color: #262626;
  resize: none;
  outline: none;
  max-height: 128px;
  overflow-y: auto;
  line-height: 1.625;
  border: none;
  box-sizing: border-box;
  font-family: inherit;
}
.gluon-chat-input-textarea-dark { color: #e5e5e5; }
.gluon-chat-input-textarea::placeholder { color: #a3a3a3; }
.gluon-chat-input-textarea-dark::placeholder { color: #737373; }
` as const;

export interface ChatInputProps {
  placeholder?: string;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
  /**
   * Called when the user presses Enter. Defaults to sending `composer.inputText`
   * via `adapter.sendUserMessage`. Pass a custom handler to include attachments.
   */
  onSend?: () => void;
  /**
   * Override whether the textarea is hidden (e.g. when voice listening is active).
   * Defaults to `false`.
   */
  hideTextarea?: boolean;
  /**
   * `renderSubmitButton` is forwarded to the underlying `HeadlessChatInput`.
   * Use this to inject the action row (attach, mic, send buttons).
   */
  renderSubmitButton?: HeadlessChatInputProps["renderSubmitButton"];
  /** Imperative ref for accessing `autoGrow()`. */
  ref?: React.Ref<ChatInputHandle>;
}

/**
 * Styled chat textarea with the frosted-glass container. Renders a
 * `HeadlessChatInput` with default textarea + container styles applied.
 * Wires `adapter.composer` and `runPhase` from `AgentProvider` automatically.
 *
 * Pass `renderSubmitButton` to inject the action row (attach, mic, send buttons).
 * Must be rendered inside `<AgentProvider>`.
 */
export const ChatInput = React.forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(
    {
      placeholder = "Ask anything…",
      darkMode = false,
      className,
      style,
      onSend: onSendProp,
      hideTextarea = false,
      renderSubmitButton,
    },
    ref,
  ) {
    const { adapter } = useAgentContext();
    const { composer, runPhase, stopGeneration } = adapter;
    const innerRef = useRef<ChatInputHandle>(null);
    const combinedRef = ref ?? innerRef;

    const handleSend = onSendProp ?? (() => {
      const text = composer.inputText.trim();
      if (text) {
        composer.setInputText("");
        void adapter.sendUserMessage(text);
      }
    });

    useEffect(() => {
      if (!hideTextarea) {
        (typeof combinedRef === "function"
          ? null
          : combinedRef.current)?.autoGrow();
      }
    }, [hideTextarea, combinedRef]);

    const boxCls = [
      "gluon-chat-input-box",
      darkMode ? "gluon-chat-input-box-dark" : "",
      className ?? "",
    ].filter(Boolean).join(" ");

    return (
      <>
        <style>{CSS}</style>
        <div className={boxCls} style={style}>
            <HeadlessChatInput
            ref={combinedRef}
            value={composer.inputText}
            onChange={composer.setInputText}
            onSend={handleSend}
            onStop={() => void stopGeneration()}
            runPhase={runPhase as HeadlessChatInputProps["runPhase"]}
            placeholder={placeholder}
            styles={{
              root: { display: "flex", flexDirection: "column" },
              textarea: {
                width: "100%",
                background: "transparent",
                padding: "14px 16px 6px",
                fontSize: "0.875rem",
                color: darkMode ? "#e5e5e5" : "#262626",
                resize: "none",
                outline: "none",
                maxHeight: 128,
                overflowY: "auto",
                lineHeight: 1.625,
                border: "none",
                boxSizing: "border-box",
                display: hideTextarea ? "none" : undefined,
                fontFamily: "inherit",
              } as CSSProperties,
            }}
            renderSubmitButton={renderSubmitButton}
          />
        </div>
      </>
    );
  },
);
