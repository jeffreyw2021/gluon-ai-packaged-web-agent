
import { generateId, type UIMessage } from "ai";
import {
  chatJobRunRepository,
} from "../db/repositories/chatJobRunRepository";
import { getDb } from "../db/adapterRegistry";
import { AgentError } from "../../AgentError";
import type { CommandAck } from "../../types/LiveEvent";
import { cancelAiChatJob, enqueueAiChatJob } from "../queue/queue";
import { threadService } from "../thread/ThreadService";
import { redisLiveBus } from "../live/RedisLiveBus";
import { enqueueSend } from "./enqueueSend";
import { loadConfig } from "../../config/loader";

export type ChatCommand =
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
    };

export class CommandService {
  async handle(
    userId: string,
    command: ChatCommand,
    opts?: { sendReasoning?: boolean },
  ): Promise<CommandAck & { runId?: string }> {
    switch (command.type) {
      case "send": {
        const result = await enqueueSend({
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
        await cancelAiChatJob(activeJob.bullmqJobId);
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
        console.error("[CommandService] cancel publish failed", err);
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
    command: Extract<ChatCommand, { type: "toolApproval" }>,
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

    await enqueueAiChatJob({
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
      sendReasoning: await this.getConfigSendReasoning(),
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
      console.error("[CommandService] resume publish failed", err);
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
    command: Extract<ChatCommand, { type: "toolApproval" }>,
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
    command: Extract<ChatCommand, { type: "clientToolOutput" }>,
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

    await enqueueAiChatJob({
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
      sendReasoning: await this.getConfigSendReasoning(),
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
      console.error("[CommandService] clientToolOutput resume publish failed", err);
    }

    return {
      ok: true,
      chatId: command.chatId,
      runId: command.runId,
      acceptedAt: new Date().toISOString(),
    };
  }

  /** Load the config-level sendReasoning default (cached, near-zero cost). */
  private async getConfigSendReasoning(): Promise<boolean> {
    try {
      const config = await loadConfig();
      return config.raw.sendReasoning;
    } catch {
      return false;
    }
  }
}

export const commandService = new CommandService();
