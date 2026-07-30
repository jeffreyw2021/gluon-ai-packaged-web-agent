
import type { UIMessage } from "ai";
import { AgentError } from "../../AgentError";
import { TOOL_PART_STATE } from "./toolPartStatePolicy";

export function applyClientToolOutputToMessages(
  messages: UIMessage[],
  toolCallId: string,
  output: unknown,
): UIMessage[] {
  const outputStr =
    typeof output === "string" ? output : JSON.stringify(output);

  let found = false;
  const next = messages.map((msg) => {
    if (msg.role !== "assistant") return msg;
    const parts = (msg.parts ?? []).map((part) => {
      if (
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        "toolCallId" in part &&
        (part as { toolCallId?: string }).toolCallId === toolCallId
      ) {
        found = true;
        return {
          ...part,
          state: TOOL_PART_STATE.OUTPUT_AVAILABLE,
          output: outputStr,
        };
      }
      return part;
    });
    return { ...msg, parts };
  });

  if (!found) {
    throw AgentError.badRequest(
      `No matching tool part for toolCallId=${toolCallId.slice(-8)}`,
      "CLIENT_TOOL_NOT_FOUND",
    );
  }

  return next as UIMessage[];
}
