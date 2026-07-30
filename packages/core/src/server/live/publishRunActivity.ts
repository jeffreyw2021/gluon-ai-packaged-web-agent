
import type { RunActivityPhase } from "../../types/RunActivityPhase";
import { chatJobRunRepository } from "../db/repositories/chatJobRunRepository";
import { redisLiveBus } from "./RedisLiveBus";
import { STREAMING_ACTIVITY_KEY } from "../thread/streamingSnapshotKeys";
import { setRunActivity } from "../thread/StreamingCheckpointStore";
import { getRedisClient } from "../db/redisClient";

export async function publishRunActivity(input: {
  userId: string;
  chatId: string;
  runId: string;
  activity: RunActivityPhase;
  roundIndex?: number;
}): Promise<void> {
  try {
    const redis = await getRedisClient();
    const prev = await redis.get(STREAMING_ACTIVITY_KEY(input.runId));
    if (prev === input.activity) return;

    await setRunActivity(input.runId, input.activity);
    const seq = await chatJobRunRepository.incrementSeq(input.runId);
    await redisLiveBus.publishRunEvent(input.userId, input.runId, {
      type: "run.phase",
      chatId: input.chatId,
      runId: input.runId,
      seq,
      activity: input.activity,
      roundIndex: input.roundIndex,
    });
  } catch (err) {
    console.error("[publishRunActivity] failed (non-fatal)", err);
  }
}
