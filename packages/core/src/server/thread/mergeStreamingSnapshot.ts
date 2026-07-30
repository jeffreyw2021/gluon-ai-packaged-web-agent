import type { UIMessage } from "ai";
import type { StreamingSnapshotDto } from "../../types/LiveEvent";
import { mergeMessageSnapshot } from "./mergeMessageSnapshot";

export function mergeStreamingSnapshotIntoMessages(
  messages: UIMessage[],
  snapshot: StreamingSnapshotDto | null | undefined,
): UIMessage[] {
  if (!snapshot?.messageId || !snapshot.text) return messages;

  const idx = messages.findIndex((m) => m.id === snapshot.messageId);
  const parts: UIMessage["parts"] = [{ type: "text", text: snapshot.text }];
  if (snapshot.reasoningText?.trim()) {
    parts.unshift({
      type: "reasoning",
      text: snapshot.reasoningText,
    } as UIMessage["parts"][number]);
  }

  const assistant: UIMessage = {
    id: snapshot.messageId,
    role: "assistant",
    parts,
  };

  if (idx >= 0) {
    const existing = messages[idx]!;
    const existingText = existing.parts
      ?.filter((p) => p.type === "text")
      .map((p) => ("text" in p ? String(p.text) : ""))
      .join("\n");
    if ((existingText?.length ?? 0) >= snapshot.text.length) {
      return messages;
    }
  }

  return mergeMessageSnapshot(messages, assistant);
}
