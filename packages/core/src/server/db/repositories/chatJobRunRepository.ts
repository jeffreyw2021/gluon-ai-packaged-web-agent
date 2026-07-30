import { getDb } from "../adapterRegistry";

export type ChatJobRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "AWAITING_USER"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export const chatJobRunRepository = {
  create(params: { chatId: string; userId: string }) {
    return getDb().run.create(params.chatId, params.userId);
  },

  setBullmqJobId(jobRunId: string, bullmqJobId: string) {
    return getDb().run.setBullmqId(jobRunId, bullmqJobId);
  },

  findById(jobRunId: string) {
    return getDb().run.findById(jobRunId);
  },

  findActiveForChat(chatId: string) {
    return getDb().run.findActiveForChat(chatId);
  },

  findOwnedById(jobRunId: string, userId: string) {
    return getDb().run.findOwned(jobRunId, userId);
  },

  recordRoundComplete(jobRunId: string, nextRoundIndex: number) {
    return getDb().run.setRound(jobRunId, nextRoundIndex);
  },

  markAwaitingUser(jobRunId: string, toolCallId: string) {
    return getDb().run.markAwaitingUser(jobRunId, toolCallId);
  },

  clearAwaitingUser(jobRunId: string) {
    return getDb().run.clearAwaitingUser(jobRunId);
  },

  appendConfirmationResolvedId(jobRunId: string, toolCallId: string) {
    return getDb().run.appendConfirmationResolved(jobRunId, toolCallId);
  },

  transitionStatus(
    jobRunId: string,
    nextStatus: ChatJobRunStatus,
    extra: { errorMessage?: string | null } = {},
  ) {
    return getDb().run.transition(jobRunId, nextStatus, extra);
  },

  incrementSeq(jobRunId: string): Promise<number> {
    return getDb().run.incrementSeq(jobRunId);
  },

  setLastPublishedSeq(jobRunId: string, seq: number): Promise<void> {
    return getDb().run.setSeqIfHigher(jobRunId, seq);
  },
};

export const chatActiveJobRunRepository = {
  setActive(chatId: string, jobRunId: string) {
    return getDb().chat.setActiveRun(chatId, jobRunId);
  },

  clearActiveIfMatches(chatId: string, jobRunId: string) {
    return getDb().chat.clearActiveRunIfMatches(chatId, jobRunId);
  },
};
