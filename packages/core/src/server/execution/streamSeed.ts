import type { UIMessage } from "ai";

export function lastAssistantMessageForStreamSeed(
  messages: UIMessage[],
): UIMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "assistant") return messages[i];
  }
  return undefined;
}
