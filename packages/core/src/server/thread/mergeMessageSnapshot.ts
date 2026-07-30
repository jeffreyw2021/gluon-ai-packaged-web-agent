import type { UIMessage } from "ai";

export function mergeMessageSnapshot(
  messages: UIMessage[],
  snapshot: UIMessage,
): UIMessage[] {
  const idx = messages.findIndex((m) => m.id === snapshot.id);
  if (idx >= 0) {
    const next = messages.slice();
    next[idx] = snapshot;
    return next;
  }
  return [...messages, snapshot];
}

export function mergeAssistantRound(
  previousMessages: UIMessage[],
  finalAssistant: UIMessage | null,
): UIMessage[] {
  if (!finalAssistant) return previousMessages;
  if ((finalAssistant.parts?.length ?? 0) === 0) return previousMessages;
  return mergeMessageSnapshot(previousMessages, finalAssistant);
}
