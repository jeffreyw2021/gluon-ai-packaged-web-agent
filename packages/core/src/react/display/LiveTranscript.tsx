"use client";

import React from "react";

export interface LiveTranscriptRenderProps {
  /** Whether the recognizer is actively listening. */
  listening: boolean;
  /** Accumulated finalized transcript text. */
  transcript: string;
  /** Partial in-progress result of the current utterance. */
  interimTranscript: string;
  /**
   * Combined display text: `transcript` + `interimTranscript`.
   * Handy for rendering a single continuous stream without joining them yourself.
   */
  displayText: string;
}

export interface LiveTranscriptProps {
  /** Pass the `listening` value from `useSpeechTranscriber`. */
  listening: boolean;
  /** Pass the `transcript` value from `useSpeechTranscriber`. */
  transcript: string;
  /** Pass the `interimTranscript` value from `useSpeechTranscriber`. */
  interimTranscript?: string;
  /**
   * Render prop — receives live transcription state.
   *
   * When omitted, renders nothing (returns `null`).
   * Renders nothing when not listening and `alwaysRender` is false.
   *
   * @example
   * ```tsx
   * const transcriber = useSpeechTranscriber({ lang: "en-US" });
   *
   * <LiveTranscript
   *   listening={transcriber.listening}
   *   transcript={transcriber.transcript}
   *   interimTranscript={transcriber.interimTranscript}
   * >
   *   {({ displayText }) => (
   *     <div className={transcriber.listening ? "live" : "idle"}>
   *       {displayText || "Say something…"}
   *     </div>
   *   )}
   * </LiveTranscript>
   * ```
   */
  children?: (props: LiveTranscriptRenderProps) => React.ReactNode;
  /**
   * If `true`, always call children even when not listening. Default `false`.
   * Useful when you want to show the committed transcript after stopping.
   */
  alwaysRender?: boolean;
}

/**
 * Headless live-transcription display. Accepts state from `useSpeechTranscriber`
 * as props — it has no side effects of its own. No styles or markup from the package.
 *
 * Use `useSpeechTranscriber` in your parent component and pass its values here
 * alongside `TranscribeButton` so both share the same recognition session.
 *
 * Renders `null` when `children` is omitted or when not listening and
 * `alwaysRender` is false.
 */
export function LiveTranscript({
  listening,
  transcript,
  interimTranscript = "",
  children,
  alwaysRender = false,
}: LiveTranscriptProps) {
  if (!listening && !alwaysRender) return null;
  if (!children) return null;

  const displayText = [transcript, interimTranscript].filter(Boolean).join(" ").trim();

  return <>{children({ listening, transcript, interimTranscript, displayText })}</>;
}
