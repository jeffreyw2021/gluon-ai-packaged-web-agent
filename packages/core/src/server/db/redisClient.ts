
import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

const globalForRedis = globalThis as unknown as {
  agentRedis: RedisClient | undefined;
};

const REDIS_CONNECT_TIMEOUT_MS = 4_000;
const REDIS_CIRCUIT_OPEN_MS = 15_000;

let redisCircuitOpenUntil = 0;
let lastRedisErrorLogAt = 0;

function logRedisError(scope: string, err: unknown): void {
  const now = Date.now();
  if (now - lastRedisErrorLogAt < 5_000) return;
  lastRedisErrorLogAt = now;
  console.error(`[Agent Redis${scope ? ` ${scope}` : ""}]`, err);
}

export async function getRedisClient(): Promise<RedisClient> {
  if (Date.now() < redisCircuitOpenUntil) {
    throw new Error("Redis temporarily unavailable");
  }

  const existing = globalForRedis.agentRedis;
  if (existing?.isOpen) {
    return existing;
  }

  if (existing && !existing.isOpen) {
    globalForRedis.agentRedis = undefined;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL environment variable is not set");

  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy: (retries) => {
        if (retries > 8) return false;
        return Math.min(500 + retries * 250, 3_000);
      },
    },
  });

  client.on("error", (err) => logRedisError("client", err));

  try {
    await client.connect();
  } catch (err) {
    redisCircuitOpenUntil = Date.now() + REDIS_CIRCUIT_OPEN_MS;
    try {
      await client.quit();
    } catch {
      // ignore teardown errors
    }
    throw err;
  }

  globalForRedis.agentRedis = client;
  return client;
}
