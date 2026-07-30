
import { loadConfig } from "../config/loader";
import { getDb } from "../server/db/adapterRegistry";
import { AgentError, apiSuccess, handleRouteError } from "../AgentError";
import { redisLiveBus } from "../server/live/RedisLiveBus";

export function createChatCrudHandlers() {
  return {
    /** GET /api/gluon-ai/chats  — list all chats for user */
    list: async (req: Request): Promise<Response> => {
      try {
        const config = await loadConfig();
        const userId = await config.auth.getUserId(req);
        if (!userId) throw AgentError.unauthorized("Authentication required");
        const chats = await getDb().chat.listForUser(userId);
        return apiSuccess({
          chats: chats.map((c) => ({
            id: c.id,
            title: c.title,
            userId: c.userId,
            activeJobRunId: c.activeJobRunId ?? null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          })),
        });
      } catch (err) {
        return handleRouteError(err);
      }
    },

    /** POST /api/gluon-ai/chats  — create a new chat */
    create: async (req: Request): Promise<Response> => {
      try {
        const config = await loadConfig();
        const userId = await config.auth.getUserId(req);
        if (!userId) throw AgentError.unauthorized("Authentication required");

        const body = (await req.json().catch(() => ({}))) as { title?: string };
        const chat = await getDb().chat.create(userId, body.title ?? "New Chat");

        const chatDto = {
          id: chat.id,
          title: chat.title,
          userId: chat.userId,
          activeJobRunId: chat.activeJobRunId ?? null,
          createdAt: chat.createdAt.toISOString(),
          updatedAt: chat.updatedAt.toISOString(),
        };

        await redisLiveBus.publishUserChatListEvent(userId, {
          type: "chat.created",
          chat: chatDto,
        });

        return apiSuccess({ chat: chatDto }, 201);
      } catch (err) {
        return handleRouteError(err);
      }
    },

    /** DELETE /api/gluon-ai/chats?chatId=xxx  — delete a chat */
    delete: async (req: Request): Promise<Response> => {
      try {
        const config = await loadConfig();
        const userId = await config.auth.getUserId(req);
        if (!userId) throw AgentError.unauthorized("Authentication required");

        const url = new URL(req.url);
        const chatId = url.searchParams.get("chatId");
        if (!chatId) throw AgentError.badRequest("chatId is required");

        const chat = await getDb().chat.findOwned(chatId, userId);
        if (!chat) throw AgentError.notFound("Chat not found", "CHAT_NOT_FOUND");

        await getDb().chat.delete(chatId);

        await redisLiveBus.publishUserChatListEvent(userId, {
          type: "chat.deleted",
          chatId,
        });

        return apiSuccess({ deleted: true });
      } catch (err) {
        return handleRouteError(err);
      }
    },
  };
}
