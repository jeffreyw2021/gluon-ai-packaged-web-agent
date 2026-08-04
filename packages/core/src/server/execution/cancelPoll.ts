
import { chatJobRunRepository } from "../db/repositories/chatJobRunRepository";

const CANCEL_POLL_INTERVAL_MS = 250;

export type CancelPollState = {
  at: number;
  cancelled: boolean;
};

export function createCancelPollState(): CancelPollState {
  return { at: 0, cancelled: false };
}

export async function pollRunCancelled(
  jobRunId: string,
  state: CancelPollState,
): Promise<boolean> {
  if (state.cancelled) return true;
  const now = Date.now();
  if (now - state.at < CANCEL_POLL_INTERVAL_MS) return false;
  state.at = now;
  const row = await chatJobRunRepository.findById(jobRunId);
  state.cancelled = row?.status === "CANCELLED";
  return state.cancelled;
}
