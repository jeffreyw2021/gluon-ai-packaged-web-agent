"use client";

import React, { useCallback, type CSSProperties } from "react";
import {
  useSpeechTranscriber,
  type UseSpeechTranscriberReturn,
} from "../hooks/useSpeechTranscriber";
import { useAgentContext } from "../provider/AgentProvider";
import { Mic, Square } from "lucide-react";

const CSS = `
.gluon-mic-btn {
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
  box-sizing: border-box;
}
.gluon-mic-btn:hover {
  color: #525252;
  background: rgba(0,0,0,0.05);
}
.gluon-mic-btn-listening {
  color: #ef4444;
  background: #fef2f2;
}
.gluon-mic-btn-listening:hover { background: #fee2e2; }
.gluon-mic-btn-dark { color: #737373; }
.gluon-mic-btn-dark:hover {
  color: #d4d4d4;
  background: rgba(255,255,255,0.08);
}
.gluon-mic-btn-dark.gluon-mic-btn-listening {
  color: #f87171;
  background: rgba(239,68,68,0.15);
}
.gluon-mic-btn-dark.gluon-mic-btn-listening:hover {
  background: rgba(239,68,68,0.22);
}
` as const;

export interface MicButtonProps {
  /**
   * Share an external `useSpeechTranscriber()` session with a
   * `TranscriptionIndicator` so both track the same recognition instance.
   * When omitted the button manages its own internal instance.
   */
  transcriber?: UseSpeechTranscriberReturn;
  /**
   * Called with the accumulated transcript text when listening stops
   * and the transcript is non-empty.
   * Defaults to appending the text to `adapter.composer.inputText`.
   */
  onTranscribed?: (text: string) => void;
  /** BCP-47 language tag for speech recognition. Default `"en-US"`. */
  lang?: string;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode | ((listening: boolean) => React.ReactNode);
}

/**
 * Styled microphone toggle button. Integrates with the Web Speech API via
 * `useSpeechTranscriber`. Pass a shared `transcriber` instance alongside
 * `TranscriptionIndicator` to display the live transcript.
 *
 * Must be rendered inside `<AgentProvider>`.
 */
export function MicButton({
  transcriber: externalTranscriber,
  onTranscribed,
  lang = "en-US",
  darkMode = false,
  className,
  style,
  children,
}: MicButtonProps) {
  const { adapter } = useAgentContext();
  const internal = useSpeechTranscriber({ lang });
  const t = externalTranscriber ?? internal;

  const defaultTranscribed = useCallback(
    (text: string) => {
      const current = adapter.composer.inputText;
      adapter.composer.setInputText(current ? `${current} ${text}` : text);
    },
    [adapter.composer],
  );

  const handleTranscribed = onTranscribed ?? defaultTranscribed;

  const handleClick = useCallback(() => {
    if (t.listening) {
      t.stop();
      if (t.transcript.trim()) handleTranscribed(t.transcript.trim());
      t.reset();
    } else {
      t.reset();
      t.start();
    }
  }, [t, handleTranscribed]);

  if (!t.isSupported) return null;

  const cls = [
    "gluon-mic-btn",
    t.listening ? "gluon-mic-btn-listening" : "",
    darkMode ? "gluon-mic-btn-dark" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  const defaultIcon = t.listening
    ? <Square width={12} height={12} />
    : <Mic width={14} height={14} />;

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        data-slot="mic-button"
        aria-label={t.listening ? "Stop listening" : "Start voice input"}
        aria-pressed={t.listening}
        data-listening={t.listening ? "true" : undefined}
        onClick={handleClick}
        className={cls}
        style={style}
      >
        {typeof children === "function"
          ? (children as (listening: boolean) => React.ReactNode)(t.listening)
          : (children ?? defaultIcon)}
      </button>
    </>
  );
}
