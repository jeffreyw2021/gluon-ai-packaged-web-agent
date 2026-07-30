
import { getRedisClient } from "../db/redisClient";
import { chatRunChannel, userChatChannel } from "./chatRedisChannels";
import type { LiveBus } from "./LiveBus";
import { appendRunEventToBuffer } from "./runEventBuffer";

export const redisLiveBus: LiveBus = {
  async publishRunEvent(userId, runId, event) {
    const redis = await getRedisClient();
    const payload = JSON.stringify(event);
    await Promise.all([
      redis.publish(chatRunChannel(runId), payload),
      redis.publish(userChatChannel(userId), payload),
      appendRunEventToBuffer(runId, event),
    ]);
  },

  async publishUserChatListEvent(userId, event) {
    const redis = await getRedisClient();
    await redis.publish(userChatChannel(userId), JSON.stringify(event));
  },
};
