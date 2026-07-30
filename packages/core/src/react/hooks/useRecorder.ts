"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseRecorderReturn {
  isRecording: boolean;
  /** Elapsed recording time in seconds. */
  duration: number;
  /** Approximate audio amplitude 0–1, updated periodically. */
  amplitude: number;
  /** The recorded audio blob, set when recording stops. */
  audioBlob: Blob | null;
  start: () => Promise<void>;
  stop: () => void;
  clear: () => void;
  /** Whether the browser supports MediaRecorder. */
  isSupported: boolean;
}

export function useRecorder(): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported =
    typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined";

  const pollAmplitude = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += Math.abs(v - 128);
    setAmplitude(Math.min(1, sum / data.length / 64));
    animFrameRef.current = requestAnimationFrame(pollAmplitude);
  }, []);

  const start = useCallback(async () => {
    if (!isSupported || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Amplitude analysis
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAmplitude(0);
        void ctx.close();
      };

      mr.start(100);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      animFrameRef.current = requestAnimationFrame(pollAmplitude);
    } catch (err) {
      console.error("[useRecorder] start error", err);
    }
  }, [isSupported, isRecording, pollAmplitude]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
  }, []);

  const clear = useCallback(() => {
    if (isRecording) stop();
    setAudioBlob(null);
    setDuration(0);
    setAmplitude(0);
  }, [isRecording, stop]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { isRecording, duration, amplitude, audioBlob, start, stop, clear, isSupported };
}
