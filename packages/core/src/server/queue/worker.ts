import { Worker } from "bullmq";
import { AI_CHAT_QUEUE, getRedisConnection } from "./queue";
import type { RunAiChatJobInput } from "./queue";
import { chatJobRunRepository } from "../db/repositories/chatJobRunRepository";
import { runEngineRounds } from "../run/RunEngine";
import { loadConfig } from "../../config/loader";

let _worker: Worker<RunAiChatJobInput> | undefined;

export function startAgentWorker(): Worker<RunAiChatJobInput> {
  if (_worker) return _worker;
  const n = Number(process.env.AGENT_WORKER_CONCURRENCY ?? 5);
  _worker = new Worker<RunAiChatJobInput>(
    AI_CHAT_QUEUE,
    async (job) => {
      const d = job.data;
      const cfg = await loadConfig();
      if (!d.continueAfterApproval) {
        await chatJobRunRepository.transitionStatus(d.chatJobRunId, "RUNNING");
      }
      if (cfg.hooks.onRunStart) {
        await cfg.hooks
          .onRunStart({ userId: d.userId, chatId: d.chatId, runId: d.chatJobRunId })
          .catch((e: unknown) => console.error("[agent-worker] onRunStart", e));
      }
      return runEngineRounds({
        chatJobRunId: d.chatJobRunId,
        chatId: d.chatId,
        userId: d.userId,
        initialUserMessage: d.initialUserMessage,
        enqueuePersistedMessageCount: d.enqueuePersistedMessageCount,
        sendReasoning: d.sendReasoning,
        loadedConfig: cfg,
      });
    },
    { connection: getRedisConnection(), concurrency: n },
  );
  _worker.on("error", (e) => console.error("[agent-worker]", e));
  return _worker;
}
