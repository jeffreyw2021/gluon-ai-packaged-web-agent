"use client";

import React, { type CSSProperties } from "react";
import { LiveTranscript } from "../display/LiveTranscript";
import type { UseSpeechTranscriberReturn } from "../hooks/useSpeechTranscriber";

const CSS = `
@keyframes gluon-ti-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.gluon-ti-dot {
  flex-shrink: 0;
  margin-top: 0.35rem;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f87171;
  animation: gluon-ti-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.gluon-ti-wrap {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px 4px;
  min-height: 40px;
  max-height: 128px;
  overflow-y: auto;
  box-sizing: border-box;
}
.gluon-ti-text {
  font-size: 0.875rem;
  line-height: 1.625;
  flex: 1;
  margin: 0;
}
.gluon-ti-text-light { color: #525252; }
.gluon-ti-text-dark { color: #d4d4d4; }
.gluon-ti-placeholder { font-style: italic; }
.gluon-ti-placeholder-light { color: #a3a3a3; }
.gluon-ti-placeholder-dark { color: #737373; }
` as const;

export interface TranscriptionIndicatorProps {
  /**
   * Share the `useSpeechTranscriber()` return value from the paired `MicButton`.
   * Required — renders nothing when not provided.
   */
  transcriber: UseSpeechTranscriberReturn;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Styled live-transcription display. Renders a pulsing dot + the current
 * speech recognition text while the microphone is active.
 *
 * Use alongside `MicButton` by sharing the same `transcriber` instance:
 *
 * ```tsx
 * const transcriber = useSpeechTranscriber();
 * <MicButton transcriber={transcriber} />
 * <TranscriptionIndicator transcriber={transcriber} />
 * ```
 */
export function TranscriptionIndicator({
  transcriber,
  darkMode = false,
  className,
  style,
}: TranscriptionIndicatorProps) {
  return (
    <>
      <style>{CSS}</style>
      <LiveTranscript
        listening={transcriber.listening}
        transcript={transcriber.transcript}
        interimTranscript={transcriber.interimTranscript}
      >
        {({ displayText }) => (
          <div className={`gluon-ti-wrap${className ? ` ${className}` : ""}`} style={style}>
            <span className="gluon-ti-dot" />
            <p className={`gluon-ti-text ${darkMode ? "gluon-ti-text-dark" : "gluon-ti-text-light"}`}>
              {displayText ? (
                displayText
              ) : (
                <span className={`gluon-ti-placeholder ${darkMode ? "gluon-ti-placeholder-dark" : "gluon-ti-placeholder-light"}`}>
                  Listening…
                </span>
              )}
            </p>
          </div>
        )}
      </LiveTranscript>
    </>
  );
}
