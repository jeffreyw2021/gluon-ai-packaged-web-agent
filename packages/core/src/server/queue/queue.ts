
import { Queue, type ConnectionOptions } from "bullmq";
import type { UIMessage } from "ai";

export const AI_CHAT_QUEUE = "agent-ai-chat";

export interface RunAiChatJobInput {
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

let queue: Queue<RunAiChatJobInput> | undefined;

function getAiChatQueue(): Queue<RunAiChatJobInput> {
  queue ??= new Queue<RunAiChatJobInput>(AI_CHAT_QUEUE, {
    connection: getRedisConnection(),
  });
  return queue;
}

export async function enqueueAiChatJob(
  input: RunAiChatJobInput,
): Promise<{ runId: string }> {
  const job = await getAiChatQueue().add("run", input, {
    attempts: 1,
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  });
  return { runId: job.id! };
}

export async function cancelAiChatJob(runId: string): Promise<void> {
  try {
    const job = await getAiChatQueue().getJob(runId);
    if (job) {
      await job.remove();
    }
  } catch {
    // Non-fatal: running jobs stop via the DB CANCELLED flag.
  }
}
