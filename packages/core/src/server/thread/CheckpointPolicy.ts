
import type { UIMessage } from "ai";

export type CheckpointReason =
  | "user_message"
  | "streaming_flush"
  | "round_end"
  | "approval_requested"
  | "tool_approval"
  | "client_tool_output"
  | "job_terminal";

export function shouldCheckpoint(_reason: CheckpointReason): boolean {
  return true;
}

export function fingerprintMessage(message: UIMessage): string {
  const parts = message.parts ?? [];
  let h = `${message.role}:${message.id}:`;
  for (const part of parts) {
    if (part.type === "text" && "text" in part) {
      h += `t${String(part.text).length}`;
    } else if (part.type === "reasoning" && "text" in part) {
      h += `r${String(part.text).length}`;
    } else if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      const p = part as { state?: string; toolCallId?: string };
      h += `${part.type}:${p.state ?? ""}:${p.toolCallId ?? ""}`;
    } else {
      h += part.type;
    }
  }
  return h;
}
