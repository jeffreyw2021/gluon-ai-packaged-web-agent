
import type { LiveEvent } from "../../types/LiveEvent";
import { getRedisClient } from "../db/redisClient";
import {
  MAX_RUN_BUFFER_EVENTS,
  RUN_EVENT_BUFFER_KEY,
  RUN_STREAM_REDIS_TTL_SEC,
} from "./runEventBufferKeys";
import { parseReplayCursor, formatReplayCursor } from "./replayCursorParse";

export { parseReplayCursor, formatReplayCursor };

export async function appendRunEventToBuffer(
  runId: string,
  event: LiveEvent,
): Promise<void> {
  if (typeof event.seq !== "number") return;
  const redis = await getRedisClient();
  const key = RUN_EVENT_BUFFER_KEY(runId);
  const member = `${event.seq}:${JSON.stringify(event)}`;
  await redis.zAdd(key, { score: event.seq, value: member });
  const count = await redis.zCard(key);
  if (count > MAX_RUN_BUFFER_EVENTS) {
    await redis.zRemRangeByRank(key, 0, count - MAX_RUN_BUFFER_EVENTS - 1);
  }
  await redis.expire(key, RUN_STREAM_REDIS_TTL_SEC);
}

export async function replayRunEventsSince(
  runId: string,
  sinceSeq: number,
): Promise<LiveEvent[]> {
  const redis = await getRedisClient();
  const key = RUN_EVENT_BUFFER_KEY(runId);
  const members = await redis.zRangeByScore(key, sinceSeq + 1, "+inf");
  const events: LiveEvent[] = [];
  for (const member of members) {
    const jsonStart = member.indexOf("{");
    if (jsonStart < 0) continue;
    try {
      events.push(JSON.parse(member.slice(jsonStart)) as LiveEvent);
    } catch {
      // skip malformed
    }
  }
  return events;
}

export async function replayBufferedEvents(
  cursor: Map<string, number>,
): Promise<LiveEvent[]> {
  const batches = await Promise.all(
    [...cursor.entries()].map(([runId, sinceSeq]) =>
      replayRunEventsSince(runId, sinceSeq),
    ),
  );
  const merged = batches.flat();
  merged.sort((a, b) => {
    if (a.runId !== b.runId) return a.runId.localeCompare(b.runId);
    return a.seq - b.seq;
  });
  return merged;
}

export async function clearRunEventBuffer(runId: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(RUN_EVENT_BUFFER_KEY(runId));
}
