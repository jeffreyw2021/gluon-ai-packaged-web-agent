export const TOOL_PART_STATE = {
  INPUT_STREAMING: "input-streaming",
  INPUT_AVAILABLE: "input-available",
  OUTPUT_AVAILABLE: "output-available",
  OUTPUT_ERROR: "output-error",
  OUTPUT_DENIED: "output-denied",
  APPROVAL_REQUESTED: "approval-requested",
  APPROVAL_RESPONDED: "approval-responded",
} as const;

const TERMINAL_STATES = new Set<string>([
  TOOL_PART_STATE.OUTPUT_AVAILABLE,
  TOOL_PART_STATE.OUTPUT_ERROR,
  TOOL_PART_STATE.OUTPUT_DENIED,
]);

export function isAwaitingConfirmationInput(state: string | undefined): boolean {
  return (
    state === TOOL_PART_STATE.INPUT_AVAILABLE ||
    state === TOOL_PART_STATE.INPUT_STREAMING
  );
}

export function isTerminalToolPartState(state: string | undefined): boolean {
  return state != null && TERMINAL_STATES.has(state);
}

export function normalizeToolPartState(state: string | undefined): string | undefined {
  return state;
}
