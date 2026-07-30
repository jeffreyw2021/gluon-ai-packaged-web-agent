
import { createClient } from "redis";
import { chatRunChannel, userChatChannel } from "./chatRedisChannels";
import type { ChatTransportEvent } from "../../types/LiveEvent";
import { parseReplayCursor, replayBufferedEvents } from "./runEventBuffer";

interface SubscriptionHandle {
  events: AsyncIterable<ChatTransportEvent>;
  close: () => Promise<void>;
}

export async function subscribeLiveEvents(opts: {
  scope: "user" | "run";
  userId?: string;
  runId?: string;
  replay?: string | null;
}): Promise<SubscriptionHandle> {
  const channels: string[] = [];
  if (opts.scope === "user" && opts.userId) {
    channels.push(userChatChannel(opts.userId));
  } else if (opts.scope === "run" && opts.runId) {
    channels.push(chatRunChannel(opts.runId));
  }
  if (channels.length === 0) {
    throw new Error("subscribeLiveEvents: no channels resolved");
  }

  const replayCursor = parseReplayCursor(opts.replay);
  if (opts.scope === "run" && opts.runId && replayCursor.size === 0) {
    replayCursor.set(opts.runId, 0);
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL environment variable is not set");

  const subscriber = createClient({
    url: redisUrl,
    socket: { connectTimeout: 4_000 },
  });
  let lastSubscriberErrorLogAt = 0;
  subscriber.on("error", (err) => {
    const now = Date.now();
    if (now - lastSubscriberErrorLogAt < 5_000) return;
    lastSubscriberErrorLogAt = now;
    console.error("[Agent Redis subscriber] error", err);
  });
  await subscriber.connect();

  const queue: ChatTransportEvent[] = [];
  let resolve: (() => void) | null = null;
  let closed = false;

  if (replayCursor.size > 0) {
    try {
      const replayed = await replayBufferedEvents(replayCursor);
      for (const event of replayed) {
        queue.push(event);
      }
    } catch (err) {
      console.error("[subscribeLiveEvents] replay failed", err);
    }
  }

  for (const ch of channels) {
    await subscriber.subscribe(ch, (raw) => {
      try {
        const event = JSON.parse(raw) as ChatTransportEvent;
        if (
          replayCursor.size > 0 &&
          "seq" in event &&
          typeof event.seq === "number" &&
          "runId" in event
        ) {
          const since = replayCursor.get((event as { runId: string }).runId);
          if (since !== undefined && event.seq <= since) {
            return;
          }
        }
        queue.push(event);
        resolve?.();
      } catch {
        // skip malformed
      }
    });
  }

  async function* iterate(): AsyncGenerator<ChatTransportEvent> {
    while (!closed) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        await new Promise<void>((r) => {
          resolve = r;
        });
        resolve = null;
      }
    }
    while (queue.length > 0) {
      yield queue.shift()!;
    }
  }

  return {
    events: iterate(),
    close: async () => {
      closed = true;
      resolve?.();
      try {
        for (const ch of channels) {
          await subscriber.unsubscribe(ch);
        }
        await subscriber.disconnect();
      } catch {
        // best-effort
      }
    },
  };
}
