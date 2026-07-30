
import type { UIMessage } from "ai";
import { getDb } from "../db/adapterRegistry";
import { getRedisClient } from "../db/redisClient";
import type { RunActivityPhase } from "../../types/RunActivityPhase";
import type { StreamingSnapshotDto } from "../../types/LiveEvent";
import { mergeMessageSnapshot } from "./mergeMessageSnapshot";
import { RUN_STREAM_REDIS_TTL_SEC } from "../live/runEventBufferKeys";
import {
  STREAMING_ACTIVITY_KEY,
  STREAMING_SNAPSHOT_KEY,
} from "./streamingSnapshotKeys";
import {
  dropEmptyPartsMessages,
  ensureToolCallIdsOnParts,
} from "../agent/prepareMessages";

export interface StreamingSnapshotRecord {
  chatId: string;
  messageId: string;
  text: string;
  reasoningText?: string;
  updatedAt: number;
}

const FLUSH_DEBOUNCE_MS = 750;
const MIN_CHARS_BETWEEN_DB_FLUSH = 120;

type FlushState = {
  timer: ReturnType<typeof setTimeout> | null;
  lastFlushedTextLen: number;
  pending: StreamingSnapshotRecord;
};

const flushByRun = new Map<string, FlushState>();

export async function readStreamingSnapshot(
  runId: string,
): Promise<StreamingSnapshotDto | null> {
  const redis = await getRedisClient();
  const raw = await redis.get(STREAMING_SNAPSHOT_KEY(runId));
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw) as StreamingSnapshotRecord;
    if (!rec.messageId) return null;
    return {
      messageId: rec.messageId,
      text: rec.text ?? "",
      reasoningText: rec.reasoningText,
      updatedAt: new Date(rec.updatedAt).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function readRunActivity(
  runId: string,
): Promise<RunActivityPhase | null> {
  const redis = await getRedisClient();
  const raw = await redis.get(STREAMING_ACTIVITY_KEY(runId));
  if (!raw) return null;
  return raw as RunActivityPhase;
}

export async function setRunActivity(
  runId: string,
  activity: RunActivityPhase,
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(STREAMING_ACTIVITY_KEY(runId), activity, {
    EX: RUN_STREAM_REDIS_TTL_SEC,
  });
}

export async function appendStreamingTextDelta(input: {
  runId: string;
  chatId: string;
  messageId: string;
  delta: string;
}): Promise<void> {
  if (!input.delta) return;
  const redis = await getRedisClient();
  const key = STREAMING_SNAPSHOT_KEY(input.runId);
  const existing = await redis.get(key);
  let rec: StreamingSnapshotRecord;
  if (existing) {
    try {
      rec = JSON.parse(existing) as StreamingSnapshotRecord;
      if (rec.messageId !== input.messageId) {
        rec = {
          chatId: input.chatId,
          messageId: input.messageId,
          text: input.delta,
          updatedAt: Date.now(),
        };
      } else {
        rec.text = (rec.text ?? "") + input.delta;
        rec.updatedAt = Date.now();
      }
    } catch {
      rec = {
        chatId: input.chatId,
        messageId: input.messageId,
        text: input.delta,
        updatedAt: Date.now(),
      };
    }
  } else {
    rec = {
      chatId: input.chatId,
      messageId: input.messageId,
      text: input.delta,
      updatedAt: Date.now(),
    };
  }
  await redis.set(key, JSON.stringify(rec), { EX: RUN_STREAM_REDIS_TTL_SEC });
  scheduleDebouncedDbFlush(input.runId, rec);
}

export async function appendStreamingReasoningDelta(input: {
  runId: string;
  chatId: string;
  messageId: string;
  delta: string;
}): Promise<void> {
  if (!input.delta) return;
  const redis = await getRedisClient();
  const key = STREAMING_SNAPSHOT_KEY(input.runId);
  const existing = await redis.get(key);
  let rec: StreamingSnapshotRecord;
  if (existing) {
    try {
      rec = JSON.parse(existing) as StreamingSnapshotRecord;
      rec.reasoningText = (rec.reasoningText ?? "") + input.delta;
      rec.updatedAt = Date.now();
      if (!rec.messageId) rec.messageId = input.messageId;
      if (!rec.chatId) rec.chatId = input.chatId;
    } catch {
      rec = {
        chatId: input.chatId,
        messageId: input.messageId,
        text: "",
        reasoningText: input.delta,
        updatedAt: Date.now(),
      };
    }
  } else {
    rec = {
      chatId: input.chatId,
      messageId: input.messageId,
      text: "",
      reasoningText: input.delta,
      updatedAt: Date.now(),
    };
  }
  await redis.set(key, JSON.stringify(rec), { EX: RUN_STREAM_REDIS_TTL_SEC });
}

async function flushSnapshotToDb(
  runId: string,
  rec: StreamingSnapshotRecord,
): Promise<void> {
  const raw = await getDb().chat.loadMessages(rec.chatId);
  const prev = parseUiMessages(raw);
  const parts: UIMessage["parts"] = [];
  if (rec.reasoningText?.trim()) {
    parts.push({
      type: "reasoning",
      text: rec.reasoningText,
    } as UIMessage["parts"][number]);
  }
  if (rec.text) {
    parts.push({ type: "text", text: rec.text });
  }
  const snapshot: UIMessage = {
    id: rec.messageId,
    role: "assistant",
    parts,
  };
  const merged = mergeMessageSnapshot(prev, snapshot);
  const normalized = ensureToolCallIdsOnParts(dropEmptyPartsMessages(merged));
  await getDb().chat.saveMessages(rec.chatId, normalized, { skipIfMissing: true });
  const state = flushByRun.get(runId);
  if (state) state.lastFlushedTextLen = rec.text.length;
}

function parseUiMessages(raw: unknown): UIMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw as UIMessage[];
}

function scheduleDebouncedDbFlush(
  runId: string,
  rec: StreamingSnapshotRecord,
): void {
  let state = flushByRun.get(runId);
  if (!state) {
    state = {
      timer: null,
      lastFlushedTextLen: 0,
      pending: rec,
    };
    flushByRun.set(runId, state);
  }
  state.pending = rec;

  const charDelta = rec.text.length - state.lastFlushedTextLen;
  if (charDelta >= MIN_CHARS_BETWEEN_DB_FLUSH && !state.timer) {
    void flushSnapshotToDb(runId, rec).catch((err) =>
      console.error("[StreamingCheckpoint] db flush failed", err),
    );
    state.lastFlushedTextLen = rec.text.length;
  }

  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state!.timer = null;
    void flushSnapshotToDb(runId, state!.pending).catch((err) =>
      console.error("[StreamingCheckpoint] debounced flush failed", err),
    );
    state!.lastFlushedTextLen = state!.pending.text.length;
  }, FLUSH_DEBOUNCE_MS);
}

export async function clearStreamingCheckpoint(runId: string): Promise<void> {
  const state = flushByRun.get(runId);
  if (state?.timer) {
    clearTimeout(state.timer);
  }
  flushByRun.delete(runId);
  const redis = await getRedisClient();
  await redis.del([
    STREAMING_SNAPSHOT_KEY(runId),
    STREAMING_ACTIVITY_KEY(runId),
  ]);
}

export async function flushStreamingCheckpointNow(runId: string): Promise<void> {
  const state = flushByRun.get(runId);
  if (state?.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  const redis = await getRedisClient();
  const raw = await redis.get(STREAMING_SNAPSHOT_KEY(runId));
  if (!raw) return;
  try {
    const rec = JSON.parse(raw) as StreamingSnapshotRecord;
    await flushSnapshotToDb(runId, rec);
  } catch (err) {
    console.error("[StreamingCheckpoint] final flush failed", err);
  }
}
