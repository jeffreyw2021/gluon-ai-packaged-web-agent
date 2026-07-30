"use client";

import { useRecorder } from "../hooks/useRecorder";

export interface RecordingIndicatorRenderProps {
  isRecording: boolean;
  duration: number;
  amplitude: number;
}

export interface RecordingIndicatorProps {
  /**
   * Render prop — receives live recording state.
   *
   * When omitted, renders nothing (returns `null`).
   * Renders nothing when not recording unless `alwaysRender` is true.
   *
   * @example
   * ```tsx
   * <RecordingIndicator>
   *   {({ duration, amplitude }) => (
   *     <div className="recording-pill">
   *       <span className="dot" style={{ transform: `scale(${1 + amplitude})` }} />
   *       {duration}s
   *     </div>
   *   )}
   * </RecordingIndicator>
   * ```
   */
  children?: (props: RecordingIndicatorRenderProps) => React.ReactNode;
  /** If true, always call children even when not recording. Default false. */
  alwaysRender?: boolean;
}

/**
 * Headless recording state display. Renders nothing (or your content) based
 * on whether audio is being recorded. No styles or markup from the package.
 *
 * Renders `null` when `children` is omitted or when not recording and
 * `alwaysRender` is false.
 */
export function RecordingIndicator({ children, alwaysRender = false }: RecordingIndicatorProps) {
  const { isRecording, duration, amplitude } = useRecorder();
  if (!isRecording && !alwaysRender) return null;
  if (!children) return null;
  return <>{children({ isRecording, duration, amplitude })}</>;
}
