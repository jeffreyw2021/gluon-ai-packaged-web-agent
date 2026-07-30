"use client";

import { useAgentContext } from "../provider/AgentProvider";
import type { AgentChat } from "../../types/AgentSessionAdapter";

export interface UseChatListReturn {
  chats: AgentChat[] | undefined;
  activeChatId: string | null;
  busyChatIds: ReadonlySet<string>;
  selectChat: (id: string) => void;
  newChat: () => void;
  deleteChat: (id: string) => void;
}

export function useChatList(): UseChatListReturn {
  const { adapter } = useAgentContext();
  return {
    chats: adapter.chats,
    activeChatId: adapter.activeChatId,
    busyChatIds: adapter.busyChatIds,
    selectChat: adapter.selectChat,
    newChat: adapter.newChat,
    deleteChat: adapter.deleteChat,
  };
}
