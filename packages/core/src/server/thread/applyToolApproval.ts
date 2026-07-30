
import type { UIMessage } from "ai";
import { AgentError } from "../../AgentError";
import { TOOL_PART_STATE } from "./toolPartStatePolicy";

export interface ToolApprovalResponse {
  approvalId: string;
  approved: boolean;
  reason?: string;
}

export function applyToolApprovalToMessages(
  messages: UIMessage[],
  response: ToolApprovalResponse,
): UIMessage[] {
  const { approvalId, approved, reason } = response;
  let found = false;

  const next = messages.map((msg) => {
    if (msg.role !== "assistant") return msg;
    const parts = (msg.parts ?? []).map((part) => {
      if (
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        "approval" in part &&
        (part as { approval?: { id?: string } }).approval?.id === approvalId
      ) {
        found = true;
        return {
          ...part,
          state: TOOL_PART_STATE.APPROVAL_RESPONDED,
          approval: {
            ...(part as { approval?: object }).approval,
            approved,
            reason,
          },
        };
      }
      if (
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        "toolCallId" in part &&
        (part as { toolCallId?: string }).toolCallId === approvalId &&
        (part as { state?: string }).state === TOOL_PART_STATE.APPROVAL_REQUESTED
      ) {
        found = true;
        return {
          ...part,
          state: approved
            ? TOOL_PART_STATE.APPROVAL_RESPONDED
            : TOOL_PART_STATE.OUTPUT_DENIED,
          approval: { approved, reason },
        };
      }
      return part;
    });
    return { ...msg, parts };
  });

  if (!found) {
    throw AgentError.badRequest(
      `No approval-requested part for id=${approvalId.slice(-8)}`,
      "APPROVAL_NOT_FOUND",
    );
  }

  return next as UIMessage[];
}
