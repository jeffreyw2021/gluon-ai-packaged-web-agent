
import { Queue, type ConnectionOptions } from "bullmq";
import type { UIMessage } from "ai";

export const GLUON_QUEUE = "gluon-run";

export interface AgentJobPayload {
  chatJobRunId: string;
  chatId: string;
  userId: string;
  initialUserMessage: UIMessage;
  enqueuePersistedMessageCount: number;
  sendReasoning: boolean;
  continueAfterApproval?: boolean;
}

export function getRedisConnection(): ConnectionOptions {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL environment variable is not set");
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

let _queue: Queue<AgentJobPayload> | undefined;

function getGluonQueue(): Queue<AgentJobPayload> {
  _queue ??= new Queue<AgentJobPayload>(GLUON_QUEUE, {
    connection: getRedisConnection(),
  });
  return _queue;
}

export async function scheduleRun(
  payload: AgentJobPayload,
): Promise<{ runId: string }> {
  const job = await getGluonQueue().add("run", payload, {
    attempts: 1,
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  });
  return { runId: job.id! };
}

export async function cancelRun(runId: string): Promise<void> {
  try {
    const job = await getGluonQueue().getJob(runId);
    if (job) {
      await job.remove();
    }
  } catch {
    // Non-fatal: active jobs stop via the DB CANCELLED status flag.
  }
}
