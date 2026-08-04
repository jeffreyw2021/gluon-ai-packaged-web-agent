
import { generateId, type UIMessage } from "ai";
import {
  chatJobRunRepository,
} from "../db/repositories/chatJobRunRepository";
import { getDb } from "../db/adapterRegistry";
import { AgentError } from "../../AgentError";
import type { CommandAck } from "../../types/LiveEvent";
import { cancelRun, scheduleRun } from "../dispatch/queue";
import { threadService } from "../thread/ThreadService";
import { redisLiveBus } from "../live/RedisLiveBus";
import { submitMessage } from "./submitMessage";
import { loadConfig } from "../../config/loader";
import { compressContext, CTX_SNAPSHOT_ID } from "../execution/contextWindow";

export type AgentCommand =
  | {
      type: "send";
      chatId: string;
      clientMessageId: string;
      message: UIMessage;
    }
  | { type: "stop"; chatId: string }
  | {
      type: "toolApproval";
      chatId: string;
      runId: string;
      approvalId: string;
      approved: boolean;
      reason?: string;
    }
  | {
      type: "clientToolOutput";
      chatId: string;
      runId: string;
      toolCallId: string;
      output: unknown;
    }
  | {
      /** On-demand user-triggered context summarization. */
      type: "summarize";
      chatId: string;
    };

export class AgentGateway {
  async handle(
    userId: string,
    command: AgentCommand,
    opts?: { sendReasoning?: boolean },
  ): Promise<CommandAck & { runId?: string }> {
    switch (command.type) {
      case "send": {
        const result = await submitMessage({
          userId,
          chatId: command.chatId,
          clientMessageId: command.clientMessageId,
          message: command.message,
          sendReasoning: opts?.sendReasoning,
        });
        return result.ack;
      }
      case "stop":
        return this.handleStop(userId, command.chatId);
      case "toolApproval":
        return this.handleToolApproval(userId, command);
      case "clientToolOutput":
        return this.handleClientToolOutput(userId, command);
      case "summarize":
        return this.handleSummarize(userId, command.chatId);
      default:
        throw AgentError.badRequest("Unknown command", "UNKNOWN_COMMAND");
    }
  }

  private async handleStop(userId: string, chatId: string): Promise<CommandAck> {
    const chat = await getDb().chat.findOwned(chatId, userId);
    if (!chat) {
      throw AgentError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }

    const activeJob = await chatJobRunRepository.findActiveForChat(chatId);
    let runId: string | null = null;
    if (activeJob && activeJob.userId === userId) {
      runId = activeJob.id;
      await chatJobRunRepository.transitionStatus(activeJob.id, "CANCELLED", {
        errorMessage: "Cancelled by user",
      });
      await getDb().chat.clearActiveRunIfMatches(chatId, activeJob.id);
      if (activeJob.bullmqJobId) {
        await cancelRun(activeJob.bullmqJobId);
      }
      try {
        const seq = await chatJobRunRepository.incrementSeq(activeJob.id);
        await redisLiveBus.publishRunEvent(userId, activeJob.id, {
          type: "run.cancelled",
          chatId,
          runId: activeJob.id,
          seq,
        });
      } catch (err) {
        console.error("[gluon:gateway] cancel publish failed", err);
      }
    }

    return {
      ok: true,
      chatId,
      runId: runId ?? "",
      acceptedAt: new Date().toISOString(),
    };
  }

  private async handleToolApproval(
    userId: string,
    command: Extract<AgentCommand, { type: "toolApproval" }>,
  ): Promise<CommandAck> {
    const run = await chatJobRunRepository.findOwnedById(command.runId, userId);
    if (!run || run.chatId !== command.chatId) {
      throw AgentError.notFound("Job run not found", "JOB_RUN_NOT_FOUND");
    }

    if (this.isApprovalAlreadyResolved(run, command.approvalId)) {
      return this.toolApprovalAck(command);
    }

    const claimed = await getDb().run.claimApproval(command.runId, userId, command.chatId);

    if (!claimed) {
      const fresh = await chatJobRunRepository.findOwnedById(command.runId, userId);
      if (fresh && this.isApprovalAlreadyResolved(fresh, command.approvalId)) {
        return this.toolApprovalAck(command);
      }
      throw AgentError.conflict("Job is not awaiting approval", "NOT_AWAITING_APPROVAL");
    }

    await threadService.applyToolApprovalResponse(command.chatId, {
      approvalId: command.approvalId,
      approved: command.approved,
      reason: command.reason,
    });
    await chatJobRunRepository.appendConfirmationResolvedId(
      command.runId,
      command.approvalId,
    );

    const messages = await threadService.load(command.chatId);
    const userMsg = messages.find((m) => m.role === "user");

    await scheduleRun({
      chatJobRunId: command.runId,
      chatId: command.chatId,
      userId,
      initialUserMessage:
        userMsg ?? ({
          id: generateId(),
          role: "user",
          parts: [{ type: "text", text: "" }],
        } as UIMessage),
      enqueuePersistedMessageCount: messages.length,
      sendReasoning: false,
      continueAfterApproval: true,
    });

    try {
      const seq = await chatJobRunRepository.incrementSeq(command.runId);
      await redisLiveBus.publishRunEvent(userId, command.runId, {
        type: "run.started",
        chatId: command.chatId,
        runId: command.runId,
        seq,
      });
    } catch (err) {
      console.error("[gluon:gateway] resume publish failed", err);
    }

    return this.toolApprovalAck(command);
  }

  private isApprovalAlreadyResolved(
    run: { confirmationResolvedIds: unknown },
    approvalId: string,
  ): boolean {
    const resolved = (run.confirmationResolvedIds as string[] | null) ?? [];
    return resolved.includes(approvalId);
  }

  private toolApprovalAck(
    command: Extract<AgentCommand, { type: "toolApproval" }>,
  ): CommandAck & { runId: string } {
    return {
      ok: true,
      chatId: command.chatId,
      runId: command.runId,
      acceptedAt: new Date().toISOString(),
    };
  }

  private async handleClientToolOutput(
    userId: string,
    command: Extract<AgentCommand, { type: "clientToolOutput" }>,
  ): Promise<CommandAck> {
    const run = await chatJobRunRepository.findOwnedById(command.runId, userId);
    if (!run || run.chatId !== command.chatId) {
      throw AgentError.notFound("Job run not found", "JOB_RUN_NOT_FOUND");
    }

    await threadService.applyClientToolOutput(
      command.chatId,
      command.toolCallId,
      command.output,
    );
    await chatJobRunRepository.clearAwaitingUser(command.runId);
    await chatJobRunRepository.transitionStatus(command.runId, "RUNNING");

    const messages = await threadService.load(command.chatId);
    const userMsg = messages.find((m) => m.role === "user");

    await scheduleRun({
      chatJobRunId: command.runId,
      chatId: command.chatId,
      userId,
      initialUserMessage:
        userMsg ?? ({
          id: generateId(),
          role: "user",
          parts: [{ type: "text", text: "" }],
        } as UIMessage),
      enqueuePersistedMessageCount: messages.length,
      sendReasoning: false,
      continueAfterApproval: true,
    });

    try {
      const seq = await chatJobRunRepository.incrementSeq(command.runId);
      await redisLiveBus.publishRunEvent(userId, command.runId, {
        type: "run.started",
        chatId: command.chatId,
        runId: command.runId,
        seq,
      });
    } catch (err) {
      console.error("[gluon:gateway] clientToolOutput resume publish failed", err);
    }

    return {
      ok: true,
      chatId: command.chatId,
      runId: command.runId,
      acceptedAt: new Date().toISOString(),
    };
  }

  private async handleSummarize(
    userId: string,
    chatId: string,
  ): Promise<CommandAck & { summarized: boolean }> {
    const chat = await getDb().chat.findOwned(chatId, userId);
    if (!chat) {
      throw AgentError.notFound("Chat not found", "CHAT_NOT_FOUND");
    }

    const messages = await threadService.load(chatId);
    // Strip any existing snapshot before compressing so we don't double-wrap.
    const baseMessages = messages.filter((m) => m.id !== CTX_SNAPSHOT_ID);

    const config = await loadConfig();
    const { agentMessages, wasCompressed, splitIndex } = await compressContext(
      baseMessages,
      config.raw,
      { force: true },
    );

    if (wasCompressed) {
      const snapshotMsg = agentMessages[0];
      // On-demand: append at the END of the thread so the user sees the marker
      // at the bottom of their current view (where "Summarizing…" was).
      // Automatic (budget-triggered) compression in turnExecutor uses the split
      // point instead, giving a divider between old and kept messages.
      await threadService.replaceContextSnapshot(chatId, snapshotMsg, Number.MAX_SAFE_INTEGER);
    }

    return {
      ok: true,
      chatId,
      runId: "",
      acceptedAt: new Date().toISOString(),
      summarized: wasCompressed,
    };
  }
}

export const agentGateway = new AgentGateway();
