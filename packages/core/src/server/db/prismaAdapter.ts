/**
 * createPrismaAdapter
 *
 * Wraps any Prisma client (the package's own or a user-supplied one) into a
 * `GluonDatabaseAdapter`. Supports every Prisma-compatible provider:
 * PostgreSQL, MySQL, SQLite, SQL Server, and CockroachDB.
 *
 * Usage:
 *
 *   import { createPrismaAdapter } from "gluon-ai/server";
 *   import { PrismaClient } from "@prisma/client";  // your own client
 *
 *   setDbAdapter(createPrismaAdapter(new PrismaClient()));
 */
import type { GluonChatRow, GluonDatabaseAdapter, GluonJobRunRow } from "./adapter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrismaClient = any;

function mapChat(row: AnyPrismaClient): GluonChatRow {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    uiMessages: row.uiMessages,
    activeJobRunId: row.activeJobRunId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRun(row: AnyPrismaClient): GluonJobRunRow {
  return {
    id: row.id,
    chatId: row.chatId,
    userId: row.userId,
    status: row.status,
    bullmqJobId: row.bullmqJobId ?? null,
    currentRoundIndex: row.currentRoundIndex,
    pendingConfirmationToolCallId: row.pendingConfirmationToolCallId ?? null,
    confirmationResolvedIds: (row.confirmationResolvedIds as string[] | null) ?? [],
    lastPublishedSeq: row.lastPublishedSeq,
    errorMessage: row.errorMessage ?? null,
    startedAt: row.startedAt ?? null,
    finishedAt: row.finishedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createPrismaAdapter(db: AnyPrismaClient): GluonDatabaseAdapter {
  return {
    chat: {
      async create(userId, title = "New Chat") {
        const row = await db.gluonChat.create({
          data: { userId, title },
        });
        return mapChat(row);
      },

      async upsert(chatId, userId, uiMessages) {
        await db.gluonChat.upsert({
          where: { id: chatId },
          create: { id: chatId, userId, uiMessages: uiMessages ?? [] },
          update: { updatedAt: new Date() },
        });
      },

      async loadMessages(chatId) {
        const row = await db.gluonChat.findUnique({
          where: { id: chatId },
          select: { uiMessages: true },
        });
        return row?.uiMessages ?? [];
      },

      async saveMessages(chatId, msgs, opts) {
        const result = await db.gluonChat.updateMany({
          where: { id: chatId },
          data: {
            uiMessages: JSON.parse(JSON.stringify(msgs)),
            updatedAt: new Date(),
            ...(opts?.activeJobRunId !== undefined
              ? { activeJobRunId: opts.activeJobRunId }
              : {}),
          },
        });
        if (result.count === 0 && !opts?.skipIfMissing) {
          throw new Error(`[gluon-ai] Chat not found: ${chatId}`);
        }
      },

      async listForUser(userId) {
        const rows = await db.gluonChat.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });
        return rows.map(mapChat);
      },

      async findOwned(chatId, userId) {
        const row = await db.gluonChat.findFirst({
          where: { id: chatId, userId },
          select: { id: true },
        });
        return row ? { id: row.id } : null;
      },

      async findTitle(chatId) {
        const row = await db.gluonChat.findUnique({
          where: { id: chatId },
          select: { title: true },
        });
        return row ? { title: row.title } : null;
      },

      async findWithActiveJob(chatId, userId) {
        const row = await db.gluonChat.findFirst({
          where: { id: chatId, userId },
          select: { id: true, activeJobRunId: true },
        });
        return row ? { id: row.id, activeJobRunId: row.activeJobRunId ?? null } : null;
      },

      async findForRun(chatId, userId) {
        const row = await db.gluonChat.findFirst({
          where: { id: chatId, userId },
        });
        return row ? mapChat(row) : null;
      },

      async updateTitle(chatId, title) {
        await db.gluonChat.update({
          where: { id: chatId },
          data: { title },
        });
      },

      async setActiveRun(chatId, runId) {
        await db.gluonChat.updateMany({
          where: { id: chatId },
          data: { activeJobRunId: runId },
        });
      },

      async clearActiveRunIfMatches(chatId, runId) {
        await db.gluonChat.updateMany({
          where: { id: chatId, activeJobRunId: runId },
          data: { activeJobRunId: null },
        });
      },

      async delete(chatId) {
        await db.gluonChat.delete({ where: { id: chatId } });
      },
    },

    run: {
      async create(chatId, userId) {
        const row = await db.gluonChatJobRun.create({
          data: { chatId, userId, status: "QUEUED" },
        });
        return mapRun(row);
      },

      async setBullmqId(runId, bullmqJobId) {
        await db.gluonChatJobRun.update({
          where: { id: runId },
          data: { bullmqJobId },
        });
      },

      async findById(runId) {
        const row = await db.gluonChatJobRun.findUnique({ where: { id: runId } });
        return row ? mapRun(row) : null;
      },

      async findActiveForChat(chatId) {
        const row = await db.gluonChatJobRun.findFirst({
          where: {
            chatId,
            status: { in: ["QUEUED", "RUNNING", "AWAITING_USER"] },
          },
          orderBy: { createdAt: "desc" },
        });
        return row ? mapRun(row) : null;
      },

      async findOwned(runId, userId) {
        const row = await db.gluonChatJobRun.findFirst({
          where: { id: runId, userId },
        });
        return row ? mapRun(row) : null;
      },

      async setRound(runId, nextRoundIndex) {
        await db.gluonChatJobRun.update({
          where: { id: runId },
          data: { currentRoundIndex: nextRoundIndex },
        });
      },

      async markAwaitingUser(runId, toolCallId) {
        await db.gluonChatJobRun.update({
          where: { id: runId },
          data: {
            status: "AWAITING_USER",
            pendingConfirmationToolCallId: toolCallId,
          },
        });
      },

      async clearAwaitingUser(runId) {
        await db.gluonChatJobRun.update({
          where: { id: runId },
          data: { status: "RUNNING", pendingConfirmationToolCallId: null },
        });
      },

      async claimApproval(runId, userId, chatId) {
        const result = await db.gluonChatJobRun.updateMany({
          where: { id: runId, userId, chatId, status: "AWAITING_USER" },
          data: { status: "RUNNING", pendingConfirmationToolCallId: null },
        });
        return result.count > 0;
      },

      async appendConfirmationResolved(runId, toolCallId) {
        const row = await db.gluonChatJobRun.findUnique({
          where: { id: runId },
          select: { confirmationResolvedIds: true },
        });
        const prev = (row?.confirmationResolvedIds as string[] | null) ?? [];
        if (!prev.includes(toolCallId)) {
          await db.gluonChatJobRun.update({
            where: { id: runId },
            data: { confirmationResolvedIds: [...prev, toolCallId] },
          });
        }
      },

      async transition(runId, status, extra) {
        const isTerminal =
          status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
        await db.gluonChatJobRun.update({
          where: { id: runId },
          data: {
            status,
            ...(isTerminal ? { finishedAt: new Date() } : {}),
            ...(extra?.errorMessage !== undefined
              ? { errorMessage: extra.errorMessage }
              : {}),
          },
        });
      },

      async incrementSeq(runId) {
        const updated = await db.gluonChatJobRun.update({
          where: { id: runId },
          data: { lastPublishedSeq: { increment: 1 } },
          select: { lastPublishedSeq: true },
        });
        return updated.lastPublishedSeq as number;
      },

      async setSeqIfHigher(runId, seq) {
        if (seq <= 0) return;
        await db.gluonChatJobRun.updateMany({
          where: { id: runId, lastPublishedSeq: { lt: seq } },
          data: { lastPublishedSeq: seq },
        });
      },
    },
  };
}
