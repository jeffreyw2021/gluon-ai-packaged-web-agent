"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Minimal local interfaces for the Web Speech API ───────────────────────────
// Browsers expose this as window.SpeechRecognition or window.webkitSpeechRecognition.
// Defined locally so the package works regardless of the consumer's DOM lib target.

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResultEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

// ─────────────────────────────────────────────────────────────────────────────

export interface SpeechTranscriberOptions {
  /** BCP 47 language tag, e.g. "en-US". Defaults to the browser's native default. */
  lang?: string;
  /**
   * Keep listening after each final result (default `true`).
   * Set to `false` to stop after a single utterance.
   */
  continuous?: boolean;
}

export interface UseSpeechTranscriberReturn {
  /** Whether the recognizer is actively listening. */
  listening: boolean;
  /** Accumulated final transcript across all utterances since the last `reset`. */
  transcript: string;
  /** Partial / in-progress result of the current utterance (resets per utterance). */
  interimTranscript: string;
  /** Start listening. Options override the hook's defaults for this session. */
  start: (options?: SpeechTranscriberOptions) => void;
  /** Stop listening. `transcript` retains its value. */
  stop: () => void;
  /** Clear `transcript` and `interimTranscript` without stopping the recognizer. */
  reset: () => void;
  /** Whether the browser supports the Web Speech API. */
  isSupported: boolean;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition ??
    null
  );
}

/**
 * Headless Web Speech API hook for live, free, browser-native transcription.
 *
 * - `transcript` accumulates finalized text across utterances.
 * - `interimTranscript` holds the in-progress partial result of the current utterance.
 * - Call `stop()` when you want to commit the transcript and `reset()` to start fresh.
 *
 * No external dependencies — uses the browser's built-in `SpeechRecognition`
 * (or `webkitSpeechRecognition` for Safari/older Chrome).
 *
 * @example
 * ```tsx
 * const { listening, transcript, interimTranscript, start, stop, reset, isSupported } =
 *   useSpeechTranscriber({ lang: "en-US" });
 *
 * const handleMic = () => {
 *   if (listening) {
 *     stop();
 *     if (transcript) setInput(transcript);
 *     reset();
 *   } else {
 *     reset();
 *     start();
 *   }
 * };
 * ```
 */
export function useSpeechTranscriber(
  defaults: SpeechTranscriberOptions = {},
): UseSpeechTranscriberReturn {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Keep latest defaults accessible inside event handlers without re-binding
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const isSupported = getSpeechRecognitionCtor() !== null;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    // `listening` is updated in the `onend` handler
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  const start = useCallback((options?: SpeechTranscriberOptions) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    // Stop any in-flight session first
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    const merged: SpeechTranscriberOptions = { ...defaultsRef.current, ...options };
    const rec = new Ctor();
    rec.continuous = merged.continuous ?? true;
    rec.interimResults = true;
    if (merged.lang) rec.lang = merged.lang;

    rec.onstart = () => setListening(true);

    rec.onresult = (event: SpeechRecognitionResultEvent) => {
      let finalChunk = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += text;
        } else {
          interim += text;
        }
      }

      if (finalChunk) {
        setTranscript((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk).trim());
      }
      setInterimTranscript(interim);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "aborted" fires when we call .stop() ourselves — not a real error
      if (event.error !== "aborted") {
        console.warn("[useSpeechTranscriber] error:", event.error);
      }
      setListening(false);
      setInterimTranscript("");
    };

    rec.onend = () => {
      setListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    rec.start();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { listening, transcript, interimTranscript, start, stop, reset, isSupported };
}
