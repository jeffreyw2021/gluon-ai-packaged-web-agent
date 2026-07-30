
import { chatJobRunRepository } from "../db/repositories/chatJobRunRepository";

const CANCEL_POLL_MS = 250;

export type RunCancelPollState = {
  at: number;
  cancelled: boolean;
};

export function createRunCancelPollState(): RunCancelPollState {
  return { at: 0, cancelled: false };
}

export async function pollRunCancelled(
  jobRunId: string,
  state: RunCancelPollState,
): Promise<boolean> {
  if (state.cancelled) return true;
  const now = Date.now();
  if (now - state.at < CANCEL_POLL_MS) return false;
  state.at = now;
  const row = await chatJobRunRepository.findById(jobRunId);
  state.cancelled = row?.status === "CANCELLED";
  return state.cancelled;
}
