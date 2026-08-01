"use client";

import React, {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { useAttachments } from "../hooks/useAttachments";
import { useSpeechTranscriber } from "../hooks/useSpeechTranscriber";
import { useComposerActions } from "../hooks/useComposerActions";
import { ChatInput } from "../input/ChatInput";
import { LiveTranscript } from "../display/LiveTranscript";
import { AttachButton } from "../buttons/AttachButton";
import { AttachmentChip } from "../display/AttachmentChip";
import type { Attachment } from "../hooks/useAttachments";
import type { ChatInputProps, ChatInputHandle } from "../input/ChatInput";
import { X, Paperclip, ArrowRight, Square, Mic } from "lucide-react";

// ── Scoped CSS ─────────────────────────────────────────────────────────────

const INPUTBAR_CSS = `
[data-gluon-inputbar] {
  --gluon-ib-fg: #262626;
  --gluon-ib-fg-secondary: #525252;
  --gluon-ib-fg-subtle: #a3a3a3;
  --gluon-ib-chip-bg: rgba(0,0,0,0.05);
  --gluon-ib-chip-border: rgba(0,0,0,0.07);
  --gluon-ib-box-bg: rgba(255,255,255,0.7);
  --gluon-ib-box-border: rgba(0,0,0,0.08);
  --gluon-ib-disclaimer: #a3a3a3;
}
[data-gluon-inputbar][data-dark] {
  --gluon-ib-fg: #e5e5e5;
  --gluon-ib-fg-secondary: #d4d4d4;
  --gluon-ib-fg-subtle: #737373;
  --gluon-ib-chip-bg: rgba(255,255,255,0.08);
  --gluon-ib-chip-border: rgba(255,255,255,0.1);
  --gluon-ib-box-bg: rgba(0,0,0,0.4);
  --gluon-ib-box-border: rgba(255,255,255,0.1);
  --gluon-ib-disclaimer: #737373;
}

[data-gluon-inputbar] .gluon-ib-remove-btn {
  flex-shrink: 0;
  color: #a3a3a3;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: color 0.15s ease;
}
[data-gluon-inputbar] .gluon-ib-remove-btn:hover {
  color: #404040;
}
[data-gluon-inputbar][data-dark] .gluon-ib-remove-btn { color: #737373; }
[data-gluon-inputbar][data-dark] .gluon-ib-remove-btn:hover { color: #e5e5e5; }

[data-gluon-inputbar] .gluon-ib-attach-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: #a3a3a3;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease, background-color 0.15s ease;
}
[data-gluon-inputbar] .gluon-ib-attach-btn:hover {
  color: #525252;
  background: rgba(0,0,0,0.05);
}
[data-gluon-inputbar] .gluon-ib-attach-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}
[data-gluon-inputbar][data-dark] .gluon-ib-attach-btn { color: #737373; }
[data-gluon-inputbar][data-dark] .gluon-ib-attach-btn:hover {
  color: #d4d4d4;
  background: rgba(255,255,255,0.08);
}

[data-gluon-inputbar] .gluon-ib-mic-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease, background-color 0.15s ease;
  color: #a3a3a3;
}
[data-gluon-inputbar] .gluon-ib-mic-btn:hover {
  color: #525252;
  background: rgba(0,0,0,0.05);
}
[data-gluon-inputbar] .gluon-ib-mic-btn-listening {
  color: #ef4444;
  background: #fef2f2;
}
[data-gluon-inputbar] .gluon-ib-mic-btn-listening:hover {
  background: #fee2e2;
}
[data-gluon-inputbar][data-dark] .gluon-ib-mic-btn { color: #737373; }
[data-gluon-inputbar][data-dark] .gluon-ib-mic-btn:hover {
  color: #d4d4d4;
  background: rgba(255,255,255,0.08);
}
[data-gluon-inputbar][data-dark] .gluon-ib-mic-btn-listening {
  color: #f87171;
  background: rgba(239,68,68,0.15);
}
[data-gluon-inputbar][data-dark] .gluon-ib-mic-btn-listening:hover {
  background: rgba(239,68,68,0.22);
}

[data-gluon-inputbar] .gluon-ib-send-btn {
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
}
[data-gluon-inputbar] .gluon-ib-send-btn-idle {
  background: rgba(0,0,0,0.05);
  color: #a3a3a3;
  cursor: not-allowed;
}
[data-gluon-inputbar] .gluon-ib-send-btn-active {
  background: #e5e5e5;
  color: #404040;
}
[data-gluon-inputbar] .gluon-ib-send-btn-active:hover {
  background: #d4d4d4;
}
[data-gluon-inputbar] .gluon-ib-send-btn-ready {
  background: #171717;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
}
[data-gluon-inputbar] .gluon-ib-send-btn-ready:hover {
  background: #404040;
}
[data-gluon-inputbar][data-dark] .gluon-ib-send-btn-idle {
  background: rgba(255,255,255,0.06);
  color: #737373;
}
[data-gluon-inputbar][data-dark] .gluon-ib-send-btn-active {
  background: #404040;
  color: #e5e5e5;
}
[data-gluon-inputbar][data-dark] .gluon-ib-send-btn-active:hover {
  background: #525252;
}
[data-gluon-inputbar][data-dark] .gluon-ib-send-btn-ready {
  background: #f5f5f5;
  color: #171717;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.35), 0 2px 4px -2px rgba(0,0,0,0.3);
}
[data-gluon-inputbar][data-dark] .gluon-ib-send-btn-ready:hover {
  background: #e5e5e5;
}

@keyframes gluon-transcript-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
[data-gluon-inputbar] .gluon-ib-transcript-dot {
  flex-shrink: 0;
  margin-top: 0.35rem;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f87171;
  animation: gluon-transcript-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
` as const;

// ── Types ─────────────────────────────────────────────────────────────────

export interface ChatInputBarStyles {
  root?: CSSProperties;
  inputBox?: CSSProperties;
  disclaimer?: CSSProperties;
}

export interface ChatInputBarProps {
  /**
   * Inline style merged onto the outermost container.
   * Any key here overrides the matching default style.
   */
  style?: CSSProperties;
  /**
   * Additional CSS class names applied to the outermost element.
   * Use this to target the component or override styles via CSS.
   */
  className?: string;
  /**
   * Per-slot style overrides for named internal elements.
   */
  styles?: ChatInputBarStyles;
  /**
   * Placeholder text shown in the textarea.
   * Defaults to "Ask anything…".
   */
  placeholder?: string;
  /**
   * Optional disclaimer shown below the input box.
   * - Omitted → default "AI can make mistakes" message.
   * - Non-empty string → that string is shown instead.
   * - Empty string / null → no disclaimer rendered.
   */
  disclaimer?: string | null;
  /**
   * Controls the file-attachment feature.
   * - Omitted → attach feature is enabled with default UI.
   * - `{ disabled: true }` → attach feature is hidden.
   * - `{ renderButton?, renderChip? }` → enabled with custom UI overrides.
   */
  attach?: {
    disabled?: boolean;
    renderButton?: (props: { disabled: boolean }) => ReactNode;
    renderChip?: (props: {
      attachment: Attachment;
      name: string;
      onRemove: () => void;
    }) => ReactNode;
  };
  /**
   * Controls the voice-input feature.
   * - Omitted → voice feature is enabled with default UI (if browser supports it).
   * - `{ disabled: true }` → voice feature is hidden.
   * - `{ lang?, renderMicButton?, renderTranscript? }` → enabled with custom UI overrides.
   */
  voice?: {
    disabled?: boolean;
    lang?: string;
    renderMicButton?: (props: { listening: boolean }) => ReactNode;
    renderTranscript?: (props: { displayText: string }) => ReactNode;
  };
  /**
   * Optional slot overrides for the action-row buttons.
   */
  slots?: {
    sendButton?: (props: {
      isActive: boolean;
      canSend: boolean;
      isListening: boolean;
    }) => ReactNode;
  };
  /**
   * When `true`, applies the dark-mode color palette.
   * Defaults to `false`.
   */
  darkMode?: boolean;
}

const DEFAULT_DISCLAIMER = "AI can make mistakes. Verify important info.";

/**
 * Self-contained chat input bar for the agent chat UI.
 *
 * Must be rendered inside `<AgentProvider>`. All state is managed internally.
 *
 * Pass `style` to override the outermost container's styles.
 * Pass `styles.inputBox` for the rounded input container.
 * Pass `styles.disclaimer` for the disclaimer text.
 */
export function ChatInputBar({
  style,
  className,
  styles,
  placeholder = "Ask anything…",
  disclaimer = DEFAULT_DISCLAIMER,
  attach,
  voice,
  slots,
  darkMode = false,
}: ChatInputBarProps) {
  const { adapter } = useAgentContext();
  const { composer, runPhase, stopGeneration } = adapter;

  const attachmentsHook = useAttachments();
  const { attachments, addFiles, removeFile } = attachmentsHook;

  const transcriber = useSpeechTranscriber({
    lang: voice?.lang ?? "en-US",
  });

  const { handleSend, handleMicToggle } = useComposerActions({
    adapter,
    attachments: attachmentsHook,
    transcriber,
  });

  const attachEnabled = !attach?.disabled;
  const voiceEnabled = !voice?.disabled;

  const isListening = voiceEnabled ? (transcriber.listening ?? false) : false;
  const safeAttachments = attachEnabled ? attachments : [];

  const chatInputRef = useRef<ChatInputHandle>(null);
  useEffect(() => {
    if (!isListening) {
      chatInputRef.current?.autoGrow();
    }
  }, [isListening]);

  const chatInputRunPhase = runPhase as ChatInputProps["runPhase"];

  const rootStyle: CSSProperties = {
    flexShrink: 0,
    padding: 10,
    boxSizing: "border-box",
    ...styles?.root,
    ...style,
  };

  const inputBoxStyle: CSSProperties = {
    borderRadius: 16,
    background: "var(--gluon-ib-box-bg)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    border: "1px solid var(--gluon-ib-box-border)",
    overflow: "hidden",
    ...styles?.inputBox,
  };

  return (
    <>
      <style>{INPUTBAR_CSS}</style>
      <div
        data-gluon-inputbar=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={`gluon-inputbar${className ? ` ${className}` : ""}`}
        style={rootStyle}
      >
        <div className="gluon-ib-input-box" style={inputBoxStyle}>
          {/* Attachment chips */}
          {attachEnabled && !isListening && safeAttachments.length > 0 && (
            <div
              className="gluon-ib-attachments"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                padding: "12px 14px 0",
              }}
            >
              {safeAttachments.map((a) => (
                <AttachmentChip key={a.id} attachment={a} onRemove={removeFile}>
                  {({ name, onRemove }) =>
                    attach?.renderChip ? (
                      <>{attach.renderChip({ attachment: a, name, onRemove })}</>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 8px",
                          borderRadius: 8,
                          background: "var(--gluon-ib-chip-bg)",
                          border: "1px solid var(--gluon-ib-chip-border)",
                          fontSize: "0.6875rem",
                          color: "var(--gluon-ib-fg-secondary)",
                          maxWidth: 140,
                        }}
                      >
                        {a.isExtracting ? (
                          <span
                            style={{
                              flexShrink: 0,
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              border: "1px solid #a3a3a3",
                              borderTopColor: "transparent",
                              animation:
                                "gluon-transcript-pulse 0.75s linear infinite",
                            }}
                          />
                        ) : a.extractionError ? (
                          <span
                            style={{
                              flexShrink: 0,
                              color: "#f87171",
                              fontSize: 10,
                            }}
                          >
                            !
                          </span>
                        ) : null}
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {name}
                        </span>
                        <button
                          type="button"
                          onClick={onRemove}
                          aria-label={`Remove ${name}`}
                          className="gluon-ib-remove-btn"
                        >
                          <X width={10} height={10} />
                        </button>
                      </div>
                    )
                  }
                </AttachmentChip>
              ))}
            </div>
          )}

          {/* Voice transcript */}
          {voiceEnabled && (
            <LiveTranscript
              listening={transcriber.listening}
              transcript={transcriber.transcript}
              interimTranscript={transcriber.interimTranscript}
            >
              {({ displayText }) =>
                voice?.renderTranscript ? (
                  <>{voice.renderTranscript({ displayText })}</>
                ) : (
                  <div
                    className="gluon-ib-voice-transcript"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "14px 16px 4px",
                      minHeight: 40,
                      maxHeight: 128,
                      overflowY: "auto",
                    }}
                  >
                    <span className="gluon-ib-transcript-dot" />
                    <p
                      style={{
                        fontSize: "0.875rem",
                        lineHeight: 1.625,
                        color: "var(--gluon-ib-fg-secondary)",
                        flex: 1,
                        margin: 0,
                      }}
                    >
                      {displayText ? (
                        displayText
                      ) : (
                        <span style={{ color: "var(--gluon-ib-fg-subtle)", fontStyle: "italic" }}>
                          Listening…
                        </span>
                      )}
                    </p>
                  </div>
                )
              }
            </LiveTranscript>
          )}

          {/* Textarea + action row */}
          <ChatInput
            ref={chatInputRef}
            value={composer.inputText}
            onChange={composer.setInputText}
            onSend={handleSend}
            onStop={() => void stopGeneration()}
            runPhase={chatInputRunPhase}
            placeholder={placeholder}
            hasAttachments={safeAttachments.length > 0}
            styles={{
              root: { display: "flex", flexDirection: "column" },
              textarea: {
                width: "100%",
                background: "transparent",
                padding: "14px 16px 6px",
                fontSize: "0.875rem",
                color: "var(--gluon-ib-fg)",
                resize: "none",
                outline: "none",
                maxHeight: 128,
                overflowY: "auto",
                lineHeight: 1.625,
                border: "none",
                boxSizing: "border-box",
                display: isListening ? "none" : undefined,
              } as CSSProperties,
            }}
            renderSubmitButton={({ isActive, canSend }) => (
              <div
                className="gluon-ib-action-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 12px 12px",
                }}
              >
                {/* Left: attach button */}
                <div className="gluon-ib-action-left" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {attachEnabled && (
                    <AttachButton
                      onFiles={addFiles}
                      accept="*"
                      multiple
                      title="Attach file"
                      disabled={isListening}
                      className="gluon-ib-attach-btn"
                    >
                      {attach?.renderButton
                        ? attach.renderButton({ disabled: isListening })
                        : <Paperclip width={14} height={14} />}
                    </AttachButton>
                  )}
                </div>

                {/* Right: mic + send */}
                <div
                  className="gluon-ib-action-right"
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {voiceEnabled && transcriber.isSupported && (
                    voice?.renderMicButton ? (
                      <>{voice.renderMicButton({ listening: transcriber.listening })}</>
                    ) : (
                      <button
                        type="button"
                        aria-label={
                          transcriber.listening
                            ? "Stop listening"
                            : "Start voice input"
                        }
                        onClick={handleMicToggle}
                        className={`gluon-ib-mic-btn${transcriber.listening ? " gluon-ib-mic-btn-listening" : ""}`}
                      >
                        {transcriber.listening ? (
                          <Square width={12} height={12} />
                        ) : (
                          <Mic width={14} height={14} />
                        )}
                      </button>
                    )
                  )}

                  {slots?.sendButton ? (
                    slots.sendButton({ isActive, canSend, isListening })
                  ) : (
                    <button
                      type="submit"
                      disabled={(!isActive && !canSend) || isListening}
                      aria-label={isActive ? "Stop generation" : "Send message"}
                      className={`gluon-ib-send-btn ${
                        isActive
                          ? "gluon-ib-send-btn-active"
                          : canSend && !isListening
                            ? "gluon-ib-send-btn-ready"
                            : "gluon-ib-send-btn-idle"
                      }`}
                    >
                      {isActive ? (
                        <Square width={12} height={12} />
                      ) : (
                        <ArrowRight width={14} height={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        </div>

        {disclaimer && (
          <p
            className="gluon-ib-disclaimer"
            style={{
              textAlign: "center",
              fontSize: "0.6rem",
              color: "var(--gluon-ib-disclaimer)",
              marginTop: 6,
              letterSpacing: "0.05em",
              ...styles?.disclaimer,
            }}
          >
            {disclaimer}
          </p>
        )}
      </div>
    </>
  );
}
