"use client";

import React, { type ButtonHTMLAttributes } from "react";
import { useRecorder } from "../hooks/useRecorder";

export interface RecordButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Called with the recorded Blob when recording stops. */
  onRecorded?: (blob: Blob) => void;
}

/**
 * Headless record-audio button. Toggles recording on click.
 * When recording stops, calls `onRecorded` with the audio Blob.
 * `data-recording="true"` when active so you can style via attribute selector.
 * Pass children for your own icon/label.
 *
 * `data-slot="record-button"` is set on the root element for CSS targeting.
 */
export function RecordButton({ children, onRecorded, onClick, disabled, ...rest }: RecordButtonProps) {
  const { isRecording, isSupported, start, stop, audioBlob } = useRecorder();

  // Notify when a new blob is ready
  React.useEffect(() => {
    if (audioBlob && onRecorded) onRecorded(audioBlob);
  }, [audioBlob, onRecorded]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isRecording) {
      stop();
    } else {
      await start();
    }
    onClick?.(e);
  };

  return (
    <button
      type="button"
      data-slot="record-button"
      disabled={disabled ?? !isSupported}
      aria-label={isRecording ? "Stop recording" : "Record audio"}
      aria-pressed={isRecording}
      data-recording={isRecording ? "true" : undefined}
      onClick={(e) => void handleClick(e)}
      {...rest}
    >
      {children}
    </button>
  );
}
