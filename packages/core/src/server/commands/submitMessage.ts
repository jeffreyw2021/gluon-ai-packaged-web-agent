
import type { UIMessage } from "ai";
import { getDb } from "../db/adapterRegistry";
import {
  chatActiveJobRunRepository,
  chatJobRunRepository,
} from "../db/repositories/chatJobRunRepository";
import { AgentError } from "../../AgentError";
import type { CommandAck } from "../../types/LiveEvent";
import { scheduleRun } from "../dispatch/queue";
import { publishRunActivity } from "../live/publishRunActivity";
import { redisLiveBus } from "../live/RedisLiveBus";
import { loadChat } from "../thread/ThreadService";
import { dropEmptyPartsMessages, ensureToolCallIdsOnParts, normalizeToolPartsInMessages } from "../agent/prepareMessages";

export interface SubmitMessageInput {
  userId: string;
  chatId: string;
  clientMessageId: string;
  message: UIMessage;
  sendReasoning?: boolean;
}

export interface SubmitMessageResult {
  ack: CommandAck;
  chatJobRunId: string;
  bullmqJobId: string;
}

function canonicalize(messages: UIMessage[]): UIMessage[] {
  return ensureToolCallIdsOnParts(
    normalizeToolPartsInMessages(dropEmptyPartsMessages(messages)),
  );
}

export async function submitMessage(
  input: SubmitMessageInput,
): Promise<SubmitMessageResult> {
  const existing = await chatJobRunRepository.findActiveForChat(input.chatId);
  if (existing) {
    throw AgentError.conflict(
      `Chat already has an active job (${existing.id})`,
      "CHAT_JOB_BUSY",
    );
  }

  const previous = await loadChat(input.chatId);
  const alreadyPersisted = previous.some((m) => m.id === input.message.id);
  const allMessages = alreadyPersisted
    ? previous
    : [...previous, input.message];
  const enqueuePersistedMessageCount = allMessages.length;

  await getDb().chat.upsert(input.chatId, input.userId);

  let jobRun: { id: string };
  if (alreadyPersisted) {
    const jr = await getDb().run.create(input.chatId, input.userId);
    await getDb().chat.setActiveRun(input.chatId, jr.id);
    jobRun = jr;
  } else {
    const normalized = canonicalize(allMessages);
    const jr = await getDb().run.create(input.chatId, input.userId);
    await getDb().chat.saveMessages(input.chatId, normalized, {
      activeJobRunId: jr.id,
    });
    jobRun = jr;
  }

  let run: { runId: string };
  try {
    run = await scheduleRun({
      chatJobRunId: jobRun.id,
      chatId: input.chatId,
      userId: input.userId,
      initialUserMessage: input.message,
      enqueuePersistedMessageCount,
      sendReasoning: input.sendReasoning ?? false,
    });
  } catch (error) {
    await chatJobRunRepository.transitionStatus(jobRun.id, "FAILED", {
      errorMessage: error instanceof Error ? error.message : "Failed to schedule run",
    });
    await chatActiveJobRunRepository.clearActiveIfMatches(input.chatId, jobRun.id);
    throw error;
  }

  try {
    await getDb().run.setBullmqId(jobRun.id, run.runId);
  } catch (err) {
    // P2002: bullmqJobId collision — BullMQ recycled a job ID still held by an old
    // completed run record. Non-fatal: the job is already enqueued and will run.
    if ((err as { code?: string }).code !== "P2002") throw err;
    console.warn("[gluon:submit] bullmqJobId collision (non-fatal), run proceeds without ID link:", run.runId);
  }

  try {
    const seq = await chatJobRunRepository.incrementSeq(jobRun.id);
    await redisLiveBus.publishRunEvent(input.userId, jobRun.id, {
      type: "run.started",
      chatId: input.chatId,
      runId: jobRun.id,
      seq,
    });
    await publishRunActivity({
      userId: input.userId,
      chatId: input.chatId,
      runId: jobRun.id,
      activity: "queued",
    });
  } catch (err) {
    console.error("[gluon:submit] Redis publish failed (non-fatal)", err);
  }

  const ack: CommandAck = {
    ok: true,
    chatId: input.chatId,
    clientMessageId: input.clientMessageId,
    runId: jobRun.id,
    acceptedAt: new Date().toISOString(),
  };

  return { ack, chatJobRunId: jobRun.id, bullmqJobId: run.runId };
}
