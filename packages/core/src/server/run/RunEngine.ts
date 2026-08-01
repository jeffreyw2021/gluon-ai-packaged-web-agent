
import { generateId, type UIMessage } from "ai";
import {
  chatActiveJobRunRepository,
  chatJobRunRepository,
} from "../db/repositories/chatJobRunRepository";
import { dropEmptyPartsMessages } from "../agent/prepareMessages";
import { scheduleChatTitleGeneration } from "../chat/titleService";
import { saveChat, threadService } from "../thread/ThreadService";
import { clearRunEventBuffer } from "../live/runEventBuffer";
import { publishRunActivity } from "../live/publishRunActivity";
import { redisLiveBus } from "../live/RedisLiveBus";
import { executeRound, type RoundExecutorInput } from "./RoundExecutor";
import type { LoadedConfig } from "../../config/loader";
import { getDb } from "../db/adapterRegistry";
import type { TokenUsage } from "../../types/TokenUsage";
export interface RunEngineInput {
  chatJobRunId: string;
  chatId: string;
  userId: string;
  initialUserMessage: UIMessage;
  enqueuePersistedMessageCount: number;
  sendReasoning: boolean;
  maxRounds?: number;
  loadedConfig: LoadedConfig;
}

export interface RunEngineResult {
  finishReason: string;
  awaitingUser: boolean;
  errorMessage?: string | null;
}

export async function runEngineRounds(
  input: RunEngineInput,
): Promise<RunEngineResult> {
  const maxRounds = input.maxRounds ?? input.loadedConfig.raw.maxRounds;
  let lastFinishReason = "stop";
  let awaitingUser = false;
  let errorMessage: string | null = null;
  const runTotalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  const jobRow = await chatJobRunRepository.findById(input.chatJobRunId);
  const startRound = jobRow?.currentRoundIndex ?? 0;
  let assistantStreamMessageId = generateId();
  if (startRound > 0) {
    const msgs = await threadService.load(input.chatId);
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === "assistant" && msgs[i].id) {
        assistantStreamMessageId = msgs[i].id!;
        break;
      }
    }
  }

  try {
    if (jobRow?.status === "QUEUED") {
      await chatJobRunRepository.transitionStatus(input.chatJobRunId, "RUNNING");
    }

    for (
      let roundIndex = startRound;
      roundIndex < startRound + maxRounds;
      roundIndex++
    ) {
      const cancelled = await chatJobRunRepository.findById(input.chatJobRunId);
      if (cancelled?.status === "CANCELLED") break;

      if (roundIndex > startRound) {
        await publishRunActivity({
          userId: input.userId,
          chatId: input.chatId,
          runId: input.chatJobRunId,
          activity: "executing_tools",
          roundIndex,
        });
      }

      const roundInput: RoundExecutorInput = {
        chatJobRunId: input.chatJobRunId,
        chatId: input.chatId,
        userId: input.userId,
        roundIndex,
        streamMessageId: assistantStreamMessageId,
        initialUserMessage: input.initialUserMessage,
        enqueuePersistedMessageCount: input.enqueuePersistedMessageCount,
        sendReasoning: input.sendReasoning,
        loadedConfig: input.loadedConfig,
      };

      const result = await executeRound(roundInput);
      lastFinishReason = result.finishReason;
      runTotalUsage.promptTokens += result.usage.promptTokens;
      runTotalUsage.completionTokens += result.usage.completionTokens;
      runTotalUsage.totalTokens += result.usage.totalTokens;

      if (result.awaitingUser) {
        awaitingUser = true;
        break;
      }

      if (result.finishReason !== "tool-calls") {
        break;
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown chat-job error";
    throw err;
  } finally {
    await finalizeRun({
      chatJobRunId: input.chatJobRunId,
      chatId: input.chatId,
      userId: input.userId,
      finishReason: lastFinishReason,
      awaitingUser,
      errorMessage,
      loadedConfig: input.loadedConfig,
      usage: runTotalUsage,
    });
  }

  return { finishReason: lastFinishReason, awaitingUser, errorMessage };
}


async function finalizeRun(args: {
  chatJobRunId: string;
  chatId: string;
  userId: string;
  finishReason: string;
  awaitingUser: boolean;
  errorMessage?: string | null;
  loadedConfig: LoadedConfig;
  usage: TokenUsage;
}): Promise<void> {
  const row = await chatJobRunRepository.findById(args.chatJobRunId);
  if (!row) return;

  if (args.awaitingUser && row.status === "AWAITING_USER") {
    return;
  }

  const alreadyTerminal =
    row.status === "COMPLETED" ||
    row.status === "FAILED" ||
    row.status === "CANCELLED";

  try {
    await threadService.clearRunStreamingState(args.chatJobRunId);
    await clearRunEventBuffer(args.chatJobRunId);
  } catch (err) {
    console.error("[RunEngine] clear streaming state failed", err);
  }

  if (args.errorMessage) {
    try {
      const msgs = await threadService.load(args.chatId);
      const pruned = dropEmptyPartsMessages(msgs);
      if (pruned.length !== msgs.length) {
        await saveChat({ chatId: args.chatId, messages: pruned });
      }
    } catch (err) {
      console.error("[RunEngine] prune empty assistant messages failed", err);
    }
  }

  if (!alreadyTerminal) {
    const nextStatus = args.errorMessage ? "FAILED" : "COMPLETED";
    await chatJobRunRepository.transitionStatus(args.chatJobRunId, nextStatus, {
      errorMessage: args.errorMessage ?? null,
    });
    if (nextStatus === "COMPLETED") {
        scheduleChatTitleGeneration(args.chatId, args.userId, {
          modelId: args.loadedConfig.raw.model,
        });

      if (args.loadedConfig.hooks.onRunEnd) {
        void args.loadedConfig.hooks.onRunEnd({
          userId: args.userId,
          chatId: args.chatId,
          finishReason: args.finishReason,
          usage: args.usage,
        }).catch((err) => console.error("[RunEngine] onRunEnd hook failed", err));
      }
    }
  }

  await chatActiveJobRunRepository.clearActiveIfMatches(
    args.chatId,
    args.chatJobRunId,
  );

  try {
    const seq = await chatJobRunRepository.incrementSeq(args.chatJobRunId);
    if (row.status === "CANCELLED") {
      await redisLiveBus.publishRunEvent(args.userId, args.chatJobRunId, {
        type: "run.cancelled",
        chatId: args.chatId,
        runId: args.chatJobRunId,
        seq,
      });
    } else if (args.errorMessage) {
      await redisLiveBus.publishRunEvent(args.userId, args.chatJobRunId, {
        type: "run.failed",
        chatId: args.chatId,
        runId: args.chatJobRunId,
        seq,
        reason: args.errorMessage,
      });
    } else if (!args.awaitingUser) {
      await redisLiveBus.publishRunEvent(args.userId, args.chatJobRunId, {
        type: "run.completed",
        chatId: args.chatId,
        runId: args.chatJobRunId,
        seq,
        usage: args.usage,
      });
    }
  } catch (err) {
    console.error("[RunEngine] terminal publish failed", err);
  }

  try {
    const chatRow = await getDb().chat.findForRun(args.chatId, args.userId);
    if (chatRow) {
      await redisLiveBus.publishUserChatListEvent(args.userId, {
        type: "chat.updated",
        chat: {
          id: chatRow.id,
          title: chatRow.title,
          userId: chatRow.userId,
          activeJobRunId: chatRow.activeJobRunId,
          createdAt: chatRow.createdAt.toISOString(),
          updatedAt: chatRow.updatedAt.toISOString(),
        },
      });
    }
  } catch {
    // non-fatal
  }
}
