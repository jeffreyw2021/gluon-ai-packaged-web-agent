
import { loadConfig } from "../config/loader";
import { commandService } from "../server/commands/CommandService";
import { prisma } from "../server/db/prismaClient";
import { AgentError, handleRouteError } from "../AgentError";
import { generateId } from "ai";
import type { UIMessage } from "ai";

interface HandlerOptions {
  /** Override the config auto-discovery path */
  configPath?: string;
}

export function createCommandsHandler(_opts?: HandlerOptions) {
  return {
    POST: async (req: Request): Promise<Response> => {
      try {
        const config = await loadConfig();
        const userId = await config.auth.getUserId(req);
        if (!userId) {
          throw AgentError.unauthorized("Authentication required");
        }

        const body = (await req.json()) as {
          type: string;
          chatId?: string;
          clientMessageId?: string;
          message?: UIMessage;
          runId?: string;
          approvalId?: string;
          approved?: boolean;
          reason?: string;
          toolCallId?: string;
          output?: unknown;
          sendReasoning?: boolean;
        };

        // For "send": auto-create chat if chatId not provided or not found
        if (body.type === "send") {
          const chatId = body.chatId ?? generateId();
          const msg = body.message;
          if (!msg) throw AgentError.badRequest("message is required");

          const exists = await prisma.gluonChat.findFirst({
            where: { id: chatId, userId },
            select: { id: true },
          });
          if (!exists) {
            await prisma.gluonChat.create({
              data: { id: chatId, userId, uiMessages: [] },
            });
          }

          const result = await commandService.handle(userId, {
            type: "send",
            chatId,
            clientMessageId: body.clientMessageId ?? generateId(),
            message: msg,
          }, { sendReasoning: body.sendReasoning ?? config.raw.sendReasoning });

          return Response.json(result, { status: 202 });
        }

        if (body.type === "stop") {
          if (!body.chatId) throw AgentError.badRequest("chatId is required");
          const result = await commandService.handle(userId, {
            type: "stop",
            chatId: body.chatId,
          });
          return Response.json(result, { status: 202 });
        }

        if (body.type === "toolApproval") {
          if (!body.chatId || !body.runId || !body.approvalId || body.approved === undefined) {
            throw AgentError.badRequest("chatId, runId, approvalId, approved are required");
          }
          const result = await commandService.handle(userId, {
            type: "toolApproval",
            chatId: body.chatId,
            runId: body.runId,
            approvalId: body.approvalId,
            approved: body.approved,
            reason: body.reason,
          });
          return Response.json(result, { status: 202 });
        }

        if (body.type === "clientToolOutput") {
          if (!body.chatId || !body.runId || !body.toolCallId) {
            throw AgentError.badRequest("chatId, runId, toolCallId are required");
          }
          const result = await commandService.handle(userId, {
            type: "clientToolOutput",
            chatId: body.chatId,
            runId: body.runId,
            toolCallId: body.toolCallId,
            output: body.output,
          });
          return Response.json(result, { status: 202 });
        }

        throw AgentError.badRequest(`Unknown command type: ${body.type}`);
      } catch (err) {
        return handleRouteError(err);
      }
    },
  };
}
