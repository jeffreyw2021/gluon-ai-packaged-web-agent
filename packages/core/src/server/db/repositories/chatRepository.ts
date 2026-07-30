import { getDb } from "../adapterRegistry";

export const chatRepository = {
  create(userId: string, title = "New Chat") {
    return getDb().chat.create(userId, title);
  },

  findAllForUser(userId: string) {
    return getDb().chat.listForUser(userId);
  },

  findOwnedId(chatId: string, userId: string) {
    return getDb().chat.findOwned(chatId, userId);
  },

  findTitleForChat(chatId: string) {
    return getDb().chat.findTitle(chatId);
  },

  findOwnedWithActiveJob(chatId: string, userId: string) {
    return getDb().chat.findWithActiveJob(chatId, userId);
  },

  updateTitle(chatId: string, title: string) {
    return getDb().chat.updateTitle(chatId, title);
  },

  delete(chatId: string) {
    return getDb().chat.delete(chatId);
  },
};
