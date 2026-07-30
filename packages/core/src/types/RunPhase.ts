/** Client-safe run lifecycle (mirrors server job + SSE). */
export type RunPhase =
  | "idle"
  | "queued"
  | "running"
  | "awaiting_user"
  | "completed"
  | "failed"
  | "cancelled";

export const LIVE_RUN_PHASES: ReadonlySet<RunPhase> = new Set([
  "queued",
  "running",
  "awaiting_user",
]);

export function isLiveRunPhase(phase: RunPhase): boolean {
  return LIVE_RUN_PHASES.has(phase);
}

export type ChatTurnPhase = RunPhase | "preparing";
