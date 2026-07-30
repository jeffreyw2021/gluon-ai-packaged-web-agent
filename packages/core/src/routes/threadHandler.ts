
import { loadConfig } from "../config/loader";
import { prisma } from "../server/db/prismaClient";
import { AgentError, apiSuccess, handleRouteError } from "../AgentError";
import { chatJobRunRepository } from "../server/db/repositories/chatJobRunRepository";
import { threadService } from "../server/thread/ThreadService";
import { readStreamingSnapshot } from "../server/thread/StreamingCheckpointStore";

export function createThreadHandler() {
  return {
    GET: async (req: Request): Promise<Response> => {
      try {
        const config = await loadConfig();
        const userId = await config.auth.getUserId(req);
        if (!userId) throw AgentError.unauthorized("Authentication required");

        const url = new URL(req.url);
        const chatId = url.searchParams.get("chatId");
        if (!chatId) throw AgentError.badRequest("chatId is required");

        const chat = await prisma.gluonChat.findFirst({
          where: { id: chatId, userId },
          select: { id: true, uiMessages: true, activeJobRunId: true },
        });
        if (!chat) throw AgentError.notFound("Chat not found", "CHAT_NOT_FOUND");

        const messages = await threadService.load(chatId);

        let snapshot = null;
        if (chat.activeJobRunId) {
          const run = await chatJobRunRepository.findById(chat.activeJobRunId);
          if (run && (run.status === "RUNNING" || run.status === "AWAITING_USER")) {
            const record = await readStreamingSnapshot(run.id);
            snapshot = record ?? null;
          }
        }

        return apiSuccess({ messages, snapshot, runId: chat.activeJobRunId });
      } catch (err) {
        return handleRouteError(err);
      }
    },
  };
}
