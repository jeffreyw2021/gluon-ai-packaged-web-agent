export type RunActivityPhase =
  | "queued"
  | "round_start"
  | "reasoning"
  | "streaming"
  | "executing_tools"
  | "awaiting_user"
  | "saving";
