"use client";

import React, { type ButtonHTMLAttributes, useCallback } from "react";
import {
  useSpeechTranscriber,
  type SpeechTranscriberOptions,
  type UseSpeechTranscriberReturn,
} from "../hooks/useSpeechTranscriber";

export interface TranscribeButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /**
   * Called with the accumulated transcript text when listening stops.
   * Only fires if the transcript is non-empty.
   */
  onTranscribed?: (text: string) => void;
  /**
   * Default speech recognizer options (lang, continuous).
   * Ignored when `transcriber` is provided.
   */
  transcriberOptions?: SpeechTranscriberOptions;
  /**
   * Optional external `useSpeechTranscriber()` return value.
   *
   * **Controlled mode** — pass this when you want `TranscribeButton` and
   * `LiveTranscript` to share the same recognition session:
   *
   * ```tsx
   * const transcriber = useSpeechTranscriber({ lang: "en-US" });
   * // …
   * <TranscribeButton transcriber={transcriber} onTranscribed={setInput} />
   * <LiveTranscript listening={transcriber.listening} transcript={transcriber.transcript} … />
   * ```
   *
   * When omitted the button manages its own internal instance (uncontrolled mode).
   */
  transcriber?: UseSpeechTranscriberReturn;
  /**
   * Children to render inside the button.
   *
   * Accepts either a static node or a **render function** that receives the
   * current `listening` state — useful for toggling icons:
   *
   * ```tsx
   * <TranscribeButton onTranscribed={setInput}>
   *   {(listening) => listening ? <IconStop /> : <IconMic />}
   * </TranscribeButton>
   * ```
   */
  children?: React.ReactNode | ((listening: boolean) => React.ReactNode);
}

/**
 * Headless transcribe-speech button. Toggles live Web Speech API recognition on click.
 *
 * **Uncontrolled (default):** manages its own `useSpeechTranscriber` instance.
 * **Controlled:** pass a `transcriber` prop to share the session with `LiveTranscript`.
 *
 * - `data-listening="true"` attribute is set while the microphone is active.
 * - Calls `onTranscribed(text)` when listening stops and the transcript is non-empty.
 * - Disabled automatically when the browser does not support the Web Speech API.
 * - `children` may be a function `(listening: boolean) => ReactNode` for icon toggling.
 *
 * @example
 * ```tsx
 * // Uncontrolled — simple drop-in
 * <TranscribeButton onTranscribed={(t) => setInput(t)}>
 *   {(listening) => listening ? <IconStop /> : <IconMic />}
 * </TranscribeButton>
 *
 * // Controlled — share session with LiveTranscript
 * const transcriber = useSpeechTranscriber();
 * <TranscribeButton transcriber={transcriber} onTranscribed={(t) => setInput(t)}>…</TranscribeButton>
 * <LiveTranscript listening={transcriber.listening} transcript={transcriber.transcript}
 *   interimTranscript={transcriber.interimTranscript}>
 *   {({ displayText }) => <p>{displayText}</p>}
 * </LiveTranscript>
 * ```
 */
export function TranscribeButton({
  children,
  onTranscribed,
  transcriberOptions,
  transcriber: externalTranscriber,
  onClick,
  disabled,
  ...rest
}: TranscribeButtonProps) {
  // Own instance used only in uncontrolled mode
  const internal = useSpeechTranscriber(transcriberOptions);
  const t = externalTranscriber ?? internal;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (t.listening) {
        t.stop();
        if (t.transcript.trim() && onTranscribed) {
          onTranscribed(t.transcript.trim());
        }
        t.reset();
      } else {
        t.reset();
        t.start();
      }
      onClick?.(e);
    },
    [t, onTranscribed, onClick],
  );

  return (
    <button
      type="button"
      data-slot="transcribe-button"
      disabled={disabled ?? !t.isSupported}
      aria-label={t.listening ? "Stop transcribing" : "Start voice input"}
      aria-pressed={t.listening}
      data-listening={t.listening ? "true" : undefined}
      onClick={handleClick}
      {...rest}
    >
      {typeof children === "function"
        ? (children as (listening: boolean) => React.ReactNode)(t.listening)
        : children}
    </button>
  );
}
