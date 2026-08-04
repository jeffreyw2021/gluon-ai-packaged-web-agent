import type { UIMessageChunk } from "ai";

export function extractTextDeltaFromChunk(chunk: UIMessageChunk): string | null {
  if (chunk.type !== "text-delta") return null;
  const raw = chunk as {
    delta?: unknown;
    textDelta?: unknown;
    text?: unknown;
  };
  const delta =
    typeof raw.delta === "string"
      ? raw.delta
      : typeof raw.textDelta === "string"
        ? raw.textDelta
        : typeof raw.text === "string"
          ? raw.text
          : null;
  return delta && delta.length > 0 ? delta : null;
}

export function extractReasoningDeltaFromChunk(chunk: UIMessageChunk): string | null {
  if (chunk.type !== "reasoning-delta") return null;
  const raw = chunk as { delta?: unknown; text?: unknown };
  const delta =
    typeof raw.delta === "string"
      ? raw.delta
      : typeof raw.text === "string"
        ? raw.text
        : null;
  return delta && delta.length > 0 ? delta : null;
}
