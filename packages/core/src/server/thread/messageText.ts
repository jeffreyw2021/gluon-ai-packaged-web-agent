import type { UIMessage } from "ai";

export function joinedText(parts: UIMessage["parts"] | undefined): string {
  const chunks: string[] = [];
  for (const part of parts ?? []) {
    if (part.type === "text" && "text" in part) {
      chunks.push(String(part.text ?? ""));
    }
  }
  return chunks.join("\n");
}

export function joinedReasoning(parts: UIMessage["parts"] | undefined): string {
  const chunks: string[] = [];
  for (const part of parts ?? []) {
    if (part.type === "reasoning") {
      // AI SDK persists reasoning as `.text`; live deltas append as `.reasoning`
      const content = ("text" in part ? part.text : null) ?? ("reasoning" in part ? (part as { reasoning?: unknown }).reasoning : null);
      if (content != null) chunks.push(String(content));
    }
  }
  return chunks.join("\n");
}

export function fingerprintNonTextParts(message: UIMessage): string {
  const parts = message.parts ?? [];
  let h = `${message.role}:${message.id}:`;
  for (const part of parts) {
    if (part.type === "text") continue;
    if (part.type === "reasoning" && "text" in part) {
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
