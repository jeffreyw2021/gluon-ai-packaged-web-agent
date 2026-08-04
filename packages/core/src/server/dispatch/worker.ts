import { Worker } from "bullmq";
import { GLUON_QUEUE, getRedisConnection } from "./queue";
import type { AgentJobPayload } from "./queue";
import { chatJobRunRepository } from "../db/repositories/chatJobRunRepository";
import { runAgentLoop } from "../execution/agentLoop";
import { loadConfig } from "../../config/loader";
import { getPrismaClient } from "../db/prismaClient";

// Idempotent SQL executed at startup to ensure gluon tables exist.
// Each statement uses IF NOT EXISTS so re-running on an already-migrated DB is safe.
// Statements are executed individually — Prisma's $executeRawUnsafe does not
// support multi-statement strings.
const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "gluon_chat" (
    "id"             TEXT          NOT NULL,
    "userId"         TEXT          NOT NULL,
    "title"          TEXT          NOT NULL DEFAULT 'New Chat',
    "uiMessages"     JSONB         NOT NULL DEFAULT '[]',
    "activeJobRunId" TEXT,
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gluon_chat_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "gluon_chat_userId_idx" ON "gluon_chat"("userId")`,
  `CREATE TABLE IF NOT EXISTS "gluon_chat_job_run" (
    "id"                            TEXT          NOT NULL,
    "chatId"                        TEXT          NOT NULL,
    "userId"                        TEXT          NOT NULL,
    "status"                        TEXT          NOT NULL DEFAULT 'QUEUED',
    "bullmqJobId"                   TEXT,
    "currentRoundIndex"             INTEGER       NOT NULL DEFAULT 0,
    "pendingConfirmationToolCallId" TEXT,
    "confirmationResolvedIds"       JSONB         NOT NULL DEFAULT '[]',
    "lastPublishedSeq"              INTEGER       NOT NULL DEFAULT 0,
    "errorMessage"                  TEXT,
    "startedAt"                     TIMESTAMP(3),
    "finishedAt"                    TIMESTAMP(3),
    "createdAt"                     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gluon_chat_job_run_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gluon_chat_job_run_chatId_fkey"
        FOREIGN KEY ("chatId") REFERENCES "gluon_chat"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  // Drop the legacy global unique index (caused P2002 when BullMQ recycled job IDs
  // still held by completed runs).
  `DROP INDEX IF EXISTS "gluon_chat_job_run_bullmqJobId_key"`,
  // Partial unique index: uniqueness is only enforced for active runs.
  `CREATE UNIQUE INDEX IF NOT EXISTS "gluon_chat_job_run_bullmqJobId_active_key" ON "gluon_chat_job_run"("bullmqJobId") WHERE status IN ('QUEUED','RUNNING','AWAITING_USER')`,
  `CREATE INDEX IF NOT EXISTS "gluon_chat_job_run_chatId_createdAt_idx" ON "gluon_chat_job_run"("chatId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "gluon_chat_job_run_userId_createdAt_idx" ON "gluon_chat_job_run"("userId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "gluon_chat_job_run_status_updatedAt_idx" ON "gluon_chat_job_run"("status", "updatedAt")`,
  `CREATE INDEX IF NOT EXISTS "gluon_chat_job_run_chatId_status_idx" ON "gluon_chat_job_run"("chatId", "status")`,
];

let _migrationPromise: Promise<void> | undefined;

async function runMigration(): Promise<void> {
  if (_migrationPromise) return _migrationPromise;
  _migrationPromise = (async () => {
    const p = getPrismaClient();
    for (const stmt of MIGRATION_STATEMENTS) {
      await p.$executeRawUnsafe(stmt);
    }
    console.log("[gluon] DB migration complete");
  })();
  return _migrationPromise;
}

let _worker: Worker<AgentJobPayload> | undefined;

export function startAgentWorker(): Worker<AgentJobPayload> {
  if (_worker) return _worker;

  // Kick off migration in the background; the job processor awaits it before
  // touching the DB so no job runs before the schema is ready.
  runMigration().catch((e) =>
    console.error("[gluon:worker] migration error:", e),
  );

  const n = Number(process.env.AGENT_WORKER_CONCURRENCY ?? 5);
  _worker = new Worker<AgentJobPayload>(
    GLUON_QUEUE,
    async (job) => {
      await runMigration();
      const d = job.data;
      const shortRun = d.chatJobRunId.slice(-8);
      console.log(`[gluon] job start  run=${shortRun} chat=${d.chatId.slice(-8)}`);
      const cfg = await loadConfig();
      if (!d.continueAfterApproval) {
        await chatJobRunRepository.transitionStatus(d.chatJobRunId, "RUNNING");
      }
      if (cfg.hooks.onRunStart) {
        await cfg.hooks
          .onRunStart({ userId: d.userId, chatId: d.chatId, runId: d.chatJobRunId })
          .catch((e: unknown) => console.error("[gluon:worker] onRunStart", e));
      }
      try {
        const result = await runAgentLoop({
          chatJobRunId: d.chatJobRunId,
          chatId: d.chatId,
          userId: d.userId,
          initialUserMessage: d.initialUserMessage,
          enqueuePersistedMessageCount: d.enqueuePersistedMessageCount,
          sendReasoning: d.sendReasoning,
          loadedConfig: cfg,
        });
        console.log(`[gluon] job done   run=${shortRun} finish=${result.finishReason}${result.errorMessage ? " err=" + result.errorMessage : ""}`);
        return result;
      } catch (e) {
        console.error(`[gluon] job error  run=${shortRun}`, e);
        throw e;
      }
    },
    { connection: getRedisConnection(), concurrency: n },
  );
  _worker.on("error", (e) => console.error("[gluon:worker]", e));
  return _worker;
}
