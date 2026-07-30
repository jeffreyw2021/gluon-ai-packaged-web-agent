import type { UIMessage, UIMessageChunk } from "ai";
import { TOOL_PART_STATE, isAwaitingConfirmationInput } from "../thread/toolPartStatePolicy";

const CLIENT_ASSISTED_PAUSE_TOOLS = new Set(["request_confirmation"]);

export function collectApprovalIdsFromMessage(
  message: UIMessage | null,
): string[] {
  if (!message || message.role !== "assistant") return [];
  const ids: string[] = [];
  for (const part of message.parts ?? []) {
    if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
      continue;
    }
    const row = part as {
      state?: string;
      toolCallId?: string;
      approval?: { id?: string };
    };
    const toolName = part.type.replace("tool-", "");

    if (row.state === TOOL_PART_STATE.APPROVAL_REQUESTED) {
      const approvalId = row.approval?.id ?? row.toolCallId;
      if (approvalId) ids.push(approvalId);
      continue;
    }

    if (
      CLIENT_ASSISTED_PAUSE_TOOLS.has(toolName) &&
      isAwaitingConfirmationInput(row.state) &&
      row.toolCallId
    ) {
      ids.push(row.toolCallId);
    }
  }
  return ids;
}

export function detectApprovalFromChunk(chunk: UIMessageChunk): string | null {
  if (chunk.type === "tool-approval-request") {
    return (chunk as { approvalId?: string }).approvalId ?? null;
  }
  return null;
}
