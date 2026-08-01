
import {
  createAgentUIStream,
  readUIMessageStream,
  type UIMessage,
} from "ai";
import type { LoadedConfig } from "../../config/loader";
import type { TokenUsage } from "../../types/TokenUsage";
import { createAgent } from "../agent/createAgent";
import { prepareUiMessagesForAgent } from "../agent/prepareMessages";
import { chatJobRunRepository } from "../db/repositories/chatJobRunRepository";
import { publishRunActivity } from "../live/publishRunActivity";
import { redisLiveBus } from "../live/RedisLiveBus";
import { threadService } from "../thread/ThreadService";
import { mergeAssistantRound } from "../thread/mergeMessageSnapshot";
import { fingerprintNonTextParts } from "../thread/messageText";
import {
  collectApprovalIdsFromMessage,
  detectApprovalFromChunk,
} from "./detectPendingApprovals";
import { createRunCancelPollState, pollRunCancelled } from "./runCancelPoll";
import { lastAssistantMessageForStreamSeed } from "./streamSeed";
import { extractReasoningDeltaFromChunk, extractTextDeltaFromChunk } from "./streamTextDelta";

export interface RoundExecutorInput {
  chatJobRunId: string;
  chatId: string;
  userId: string;
  roundIndex: number;
  streamMessageId: string;
  initialUserMessage: UIMessage;
  enqueuePersistedMessageCount: number;
  sendReasoning: boolean;
  loadedConfig: LoadedConfig;
}

export interface RoundExecutorResult {
  roundIndex: number;
  finishReason: string;
  awaitingUser: boolean;
  pendingApprovalIds: string[];
  usage: TokenUsage;
}

async function loadChatForRound(input: RoundExecutorInput): Promise<UIMessage[]> {
  let msgs = await threadService.load(input.chatId);

  if (input.roundIndex === 0) {
    if (msgs.length >= input.enqueuePersistedMessageCount) return msgs;
    if (msgs.length === 0) return [input.initialUserMessage];
    for (const ms of [40, 120, 280] as const) {
      await new Promise((r) => setTimeout(r, ms));
      msgs = await threadService.load(input.chatId);
      if (msgs.length >= input.enqueuePersistedMessageCount) return msgs;
    }
    return msgs.length > 0 ? msgs : [input.initialUserMessage];
  }

  if (msgs.length > 0) return msgs;
  for (const ms of [40, 120, 280] as const) {
    await new Promise((r) => setTimeout(r, ms));
    msgs = await threadService.load(input.chatId);
    if (msgs.length > 0) return msgs;
  }
  return msgs;
}

export async function executeRound(
  input: RoundExecutorInput,
): Promise<RoundExecutorResult> {
  let previousMessages = await loadChatForRound(input);
  if (previousMessages.length === 0) {
    if (input.roundIndex === 0) {
      previousMessages = [input.initialUserMessage];
    } else {
      throw new Error(
        `RoundExecutor: empty chat at round ${input.roundIndex} chatId=${input.chatId.slice(-8)}`,
      );
    }
  }

  const agentMessages = prepareUiMessagesForAgent(previousMessages);
  const agent = await createAgent(input.loadedConfig, { sendReasoning: input.sendReasoning });

  let finishReason = "stop";
  const roundUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  const sdkStream = await createAgentUIStream({
    agent,
    uiMessages: agentMessages,
    sendReasoning: input.sendReasoning,
    generateMessageId: () => input.streamMessageId,
    onStepFinish: async (step) => {
      finishReason = step.finishReason ?? finishReason;
      if (step.usage) {
        // AI SDK v6 uses inputTokens/outputTokens; map to the friendlier promptTokens/completionTokens
        const input = step.usage.inputTokens ?? 0;
        const output = step.usage.outputTokens ?? 0;
        roundUsage.promptTokens += input;
        roundUsage.completionTokens += output;
        roundUsage.totalTokens += input + output;
      }
    },
  });

  const [controlBranch, parserBranch] = sdkStream.tee();
  const streamSeedAssistant =
    input.roundIndex > 0
      ? lastAssistantMessageForStreamSeed(agentMessages)
      : undefined;

  const pendingFromChunks = new Set<string>();
  const cancelPoll = createRunCancelPollState();
  let streamStopped = false;
  let publishedStreamingActivity = false;
  let publishedReasoningActivity = false;

  void publishRunActivity({
    userId: input.userId,
    chatId: input.chatId,
    runId: input.chatJobRunId,
    activity: "round_start",
    roundIndex: input.roundIndex,
  });

  const controlPump = (async () => {
    const reader = controlBranch.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        if (await pollRunCancelled(input.chatJobRunId, cancelPoll)) {
          streamStopped = true;
          break;
        }

        const textDelta = extractTextDeltaFromChunk(value);
        if (textDelta) {
          if (!publishedStreamingActivity) {
            publishedStreamingActivity = true;
            void publishRunActivity({
              userId: input.userId,
              chatId: input.chatId,
              runId: input.chatJobRunId,
              activity: "streaming",
              roundIndex: input.roundIndex,
            });
          }
          threadService.publishAssistantTextDelta(
            input.chatId,
            input.chatJobRunId,
            input.userId,
            input.streamMessageId,
            textDelta,
          );
        }

        const reasoningDelta = extractReasoningDeltaFromChunk(value);
        if (reasoningDelta && input.sendReasoning) {
          if (!publishedReasoningActivity) {
            publishedReasoningActivity = true;
            void publishRunActivity({
              userId: input.userId,
              chatId: input.chatId,
              runId: input.chatJobRunId,
              activity: "reasoning",
              roundIndex: input.roundIndex,
            });
          }
          threadService.publishAssistantReasoningDelta(
            input.chatId,
            input.chatJobRunId,
            input.userId,
            input.streamMessageId,
            reasoningDelta,
          );
        }

        const id = detectApprovalFromChunk(value);
        if (id) {
          pendingFromChunks.add(id);
          try {
            await chatJobRunRepository.markAwaitingUser(input.chatJobRunId, id);
          } catch (err) {
            console.error("[RoundExecutor] markAwaitingUser failed", err);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  })();

  let lastAssistantMessage: UIMessage | null = null;
  const parserPump = (async () => {
    const parserOpts =
      streamSeedAssistant !== undefined
        ? { stream: parserBranch, message: streamSeedAssistant }
        : { stream: parserBranch };
    let lastNonTextFp = "";
    for await (const merged of readUIMessageStream(parserOpts)) {
      if (streamStopped || cancelPoll.cancelled) break;
      if (await pollRunCancelled(input.chatJobRunId, cancelPoll)) {
        streamStopped = true;
        break;
      }

      lastAssistantMessage = merged;
      const nonTextFp = fingerprintNonTextParts(merged);
      if (nonTextFp !== lastNonTextFp) {
        lastNonTextFp = nonTextFp;
        void threadService.applyAssistantProjection(
          input.chatId,
          input.chatJobRunId,
          input.userId,
          merged,
        );
      }
    }
    await threadService.flushProjections(
      input.chatId,
      input.chatJobRunId,
      input.userId,
    );
  })();

  await Promise.all([controlPump, parserPump]);

  const merged = mergeAssistantRound(previousMessages, lastAssistantMessage);
  await threadService.checkpoint(input.chatId, merged);

  const approvalIds = [
    ...new Set([
      ...collectApprovalIdsFromMessage(lastAssistantMessage),
      ...pendingFromChunks,
    ]),
  ];
  const awaitingUser = approvalIds.length > 0;

  if (awaitingUser && approvalIds[0]) {
    try {
      await chatJobRunRepository.markAwaitingUser(
        input.chatJobRunId,
        approvalIds[0],
      );
      const seq = await chatJobRunRepository.incrementSeq(input.chatJobRunId);
      await redisLiveBus.publishRunEvent(input.userId, input.chatJobRunId, {
        type: "run.awaiting_user",
        chatId: input.chatId,
        runId: input.chatJobRunId,
        seq,
        approvalIds,
      });
    } catch (err) {
      console.error("[RoundExecutor] publish awaiting_user failed", err);
    }
  }

  await chatJobRunRepository.recordRoundComplete(
    input.chatJobRunId,
    input.roundIndex + 1,
  );

  return {
    roundIndex: input.roundIndex,
    finishReason,
    awaitingUser,
    pendingApprovalIds: approvalIds,
    usage: roundUsage,
  };
}
