
import type { UIMessage } from "ai";
import { getDb } from "../db/adapterRegistry";
import { chatRepository } from "../db/repositories/chatRepository";
import { chatJobRunRepository } from "../db/repositories/chatJobRunRepository";
import type { RunActivityPhase } from "../../types/RunActivityPhase";
import type { RunPhase } from "../../types/RunPhase";
import type { StreamingSnapshotDto } from "../../types/LiveEvent";
import type { LiveBus } from "../live/LiveBus";
import { redisLiveBus } from "../live/RedisLiveBus";
import { LiveProjectionPublisher } from "./LiveProjectionPublisher";
import { mergeMessageSnapshot } from "./mergeMessageSnapshot";
import {
  applyToolApprovalToMessages,
  type ToolApprovalResponse,
} from "./applyToolApproval";
import { applyClientToolOutputToMessages } from "./applyClientToolOutput";
import { mergeStreamingSnapshotIntoMessages } from "./mergeStreamingSnapshot";
import {
  appendStreamingReasoningDelta,
  appendStreamingTextDelta,
  clearStreamingCheckpoint,
  flushStreamingCheckpointNow,
  readRunActivity,
  readStreamingSnapshot,
} from "./StreamingCheckpointStore";
import {
  dropEmptyPartsMessages,
  ensureToolCallIdsOnParts,
  normalizeToolPartsInMessages,
} from "../agent/prepareMessages";

function parseUiMessages(raw: unknown): UIMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw as UIMessage[];
}

function canonicalizeMessages(messages: UIMessage[]): UIMessage[] {
  return ensureToolCallIdsOnParts(
    normalizeToolPartsInMessages(dropEmptyPartsMessages(messages)),
  );
}

async function loadChat(chatId: string): Promise<UIMessage[]> {
  const raw = await getDb().chat.loadMessages(chatId);
  return parseUiMessages(raw);
}

async function saveChat(opts: {
  chatId: string;
  messages: UIMessage[];
  skipIfMissingChat?: boolean;
}): Promise<void> {
  const normalized = canonicalizeMessages(opts.messages);
  await getDb().chat.saveMessages(
    opts.chatId,
    normalized,
    { skipIfMissing: opts.skipIfMissingChat },
  );
}

export class ThreadService {
  constructor(private readonly liveBus: LiveBus = redisLiveBus) {}

  async load(chatId: string): Promise<UIMessage[]> {
    return loadChat(chatId);
  }

  async loadThreadForUser(
    chatId: string,
    userId: string,
  ): Promise<{
    messages: UIMessage[];
    activeRunId: string | null;
    runPhase: RunPhase;
    streamingSnapshot: StreamingSnapshotDto | null;
    runActivity: RunActivityPhase | null;
  }> {
    const row = await chatRepository.findOwnedWithActiveJob(chatId, userId);
    if (!row) {
      return {
        messages: [],
        activeRunId: null,
        runPhase: "idle",
        streamingSnapshot: null,
        runActivity: null,
      };
    }
    let messages = await loadChat(chatId);
    const activeRunId = row.activeJobRunId;
    let runPhase: RunPhase = activeRunId ? "running" : "idle";
    let streamingSnapshot: StreamingSnapshotDto | null = null;
    let runActivity: RunActivityPhase | null = null;

    if (activeRunId) {
      const jobRow = await chatJobRunRepository.findById(activeRunId);
      if (jobRow?.status === "AWAITING_USER") runPhase = "awaiting_user";
      else if (jobRow?.status === "QUEUED") runPhase = "queued";
      else if (
        jobRow?.status === "COMPLETED" ||
        jobRow?.status === "FAILED" ||
        jobRow?.status === "CANCELLED"
      ) {
        runPhase =
          jobRow.status === "COMPLETED"
            ? "completed"
            : jobRow.status === "CANCELLED"
              ? "cancelled"
              : "failed";
      }
    }

    if (activeRunId && isLivePhase(runPhase)) {
      try {
        streamingSnapshot = await readStreamingSnapshot(activeRunId);
        runActivity = await readRunActivity(activeRunId);
      } catch (err) {
        console.error(
          "[ThreadService] Redis streaming hydrate skipped (DB-only)",
          err,
        );
      }
      if (streamingSnapshot) {
        messages = mergeStreamingSnapshotIntoMessages(messages, streamingSnapshot);
      }
    }

    return { messages, activeRunId, runPhase, streamingSnapshot, runActivity };
  }

  async appendUserMessage(chatId: string, msg: UIMessage): Promise<UIMessage[]> {
    const prev = await loadChat(chatId);
    const already = prev.some((m) => m.id === msg.id);
    const next = already ? prev : [...prev, msg];
    await saveChat({ chatId, messages: next });
    return next;
  }

  private projectionPublishers = new Map<string, LiveProjectionPublisher>();

  private getPublisher(chatId: string, runId: string, userId: string): LiveProjectionPublisher {
    const key = `${chatId}:${runId}`;
    let pub = this.projectionPublishers.get(key);
    if (!pub) {
      pub = new LiveProjectionPublisher({
        liveBus: this.liveBus,
        userId,
        chatId,
        runId,
      });
      this.projectionPublishers.set(key, pub);
    }
    return pub;
  }

  publishAssistantTextDelta(
    chatId: string,
    runId: string,
    userId: string,
    messageId: string,
    delta: string,
  ): void {
    void appendStreamingTextDelta({ runId, chatId, messageId, delta });
    this.getPublisher(chatId, runId, userId).publishRawTextDelta(messageId, delta);
  }

  publishAssistantReasoningDelta(
    chatId: string,
    runId: string,
    userId: string,
    messageId: string,
    delta: string,
  ): void {
    void appendStreamingReasoningDelta({ runId, chatId, messageId, delta });
    this.getPublisher(chatId, runId, userId).publishRawReasoningDelta(messageId, delta);
  }

  async applyAssistantProjection(
    chatId: string,
    runId: string,
    userId: string,
    snapshot: UIMessage,
  ): Promise<void> {
    this.getPublisher(chatId, runId, userId).maybePublish(snapshot);
  }

  async flushProjections(chatId: string, runId: string, userId: string): Promise<void> {
    await this.getPublisher(chatId, runId, userId).flush();
    this.projectionPublishers.delete(`${chatId}:${runId}`);
    await flushStreamingCheckpointNow(runId);
  }

  async clearRunStreamingState(runId: string): Promise<void> {
    await clearStreamingCheckpoint(runId);
  }

  async checkpoint(chatId: string, messages: UIMessage[]): Promise<void> {
    await saveChat({ chatId, messages });
  }

  async applyToolApprovalResponse(
    chatId: string,
    response: ToolApprovalResponse,
  ): Promise<UIMessage[]> {
    const prev = await loadChat(chatId);
    const next = applyToolApprovalToMessages(prev, response);
    await saveChat({ chatId, messages: next });
    return next;
  }

  async applyClientToolOutput(
    chatId: string,
    toolCallId: string,
    output: unknown,
  ): Promise<UIMessage[]> {
    const prev = await loadChat(chatId);
    const next = applyClientToolOutputToMessages(prev, toolCallId, output);
    await saveChat({ chatId, messages: next });
    return next;
  }

  mergeSnapshot(messages: UIMessage[], snapshot: UIMessage): UIMessage[] {
    return mergeMessageSnapshot(messages, snapshot);
  }

  /**
   * Inserts a system marker (e.g. the context compression snapshot) into the
   * persisted thread at `insertAt` — the index of the first message that was
   * kept in the recent tail. Call-sites should guard against double-injection
   * by checking whether a marker with the same id already exists.
   */
  async injectSystemMarker(
    chatId: string,
    marker: UIMessage,
    insertAt: number,
  ): Promise<void> {
    const prev = await loadChat(chatId);
    const clampedAt = Math.max(0, Math.min(insertAt, prev.length));
    const next = [
      ...prev.slice(0, clampedAt),
      marker,
      ...prev.slice(clampedAt),
    ];
    await saveChat({ chatId, messages: next });
  }

  /**
   * Atomically replaces any existing context snapshot with a fresh one.
   * Removes the old marker first, then inserts the new one at `insertAt`
   * (index into the snapshot-free history). Safe to call even when no
   * prior snapshot exists.
   */
  async replaceContextSnapshot(
    chatId: string,
    marker: UIMessage,
    insertAt: number,
  ): Promise<void> {
    const prev = await loadChat(chatId);
    const withoutSnapshot = prev.filter((m) => m.id !== marker.id);
    const clampedAt = Math.max(0, Math.min(insertAt, withoutSnapshot.length));
    const next = [
      ...withoutSnapshot.slice(0, clampedAt),
      marker,
      ...withoutSnapshot.slice(clampedAt),
    ];
    await saveChat({ chatId, messages: next });
  }
}

function isLivePhase(phase: RunPhase): boolean {
  return phase === "running" || phase === "queued" || phase === "awaiting_user";
}

export const threadService = new ThreadService();

export { loadChat, saveChat };
