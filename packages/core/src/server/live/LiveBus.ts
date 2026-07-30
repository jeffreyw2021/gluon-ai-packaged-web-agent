import type { LiveEvent, UserChatListEvent } from "../../types/LiveEvent";

export interface LiveBus {
  publishRunEvent(
    userId: string,
    runId: string,
    event: LiveEvent,
  ): Promise<void>;
  publishUserChatListEvent(
    userId: string,
    event: UserChatListEvent,
  ): Promise<void>;
}
