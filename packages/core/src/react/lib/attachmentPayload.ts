import type { Attachment } from "../hooks/useAttachments";

const ATTACHMENT_META_START = "\n\n___ATTACHMENT_META___\n";
const ATTACHMENT_META_END = "\n___END_ATTACHMENT_META___\n\n";

export interface AttachmentChipMeta {
  filename: string;
  mimeType: string;
  displayType: string;
}

/**
 * Combines the user's typed text with extracted attachment content into a
 * single string ready for `sendUserMessage`.
 *
 * The `___ATTACHMENT_META___` JSON block is for UI chip rendering
 * (`parseAttachmentMeta`). The extracted file text that follows is what the
 * AI model reads as context.
 *
 * Only attachments that have finished extracting without errors are included.
 * Returns just `typedText` when no ready attachments exist.
 *
 * @example
 * ```tsx
 * const handleSend = () => {
 *   const payload = buildSendPayload(composer.inputText.trim(), attachments);
 *   if (!payload) return;
 *   composer.setInputText("");
 *   clearAll();
 *   void sendUserMessage(payload);
 * };
 * ```
 */
export function buildSendPayload(
  typedText: string,
  attachments: Attachment[],
): string {
  const ready = attachments.filter(
    (a) => !a.isExtracting && !a.extractionError && a.extractedText,
  );
  if (ready.length === 0) return typedText;

  const meta: AttachmentChipMeta[] = ready.map((a) => ({
    filename: a.name,
    mimeType: a.type || "application/octet-stream",
    displayType: resolveDisplayType(a),
  }));

  const metaBlock = ATTACHMENT_META_START + JSON.stringify(meta) + ATTACHMENT_META_END;

  const fileContent = ready
    .map((a) => `--- ${a.name} (${resolveDisplayType(a)}) ---\n${a.extractedText ?? ""}`)
    .join("\n\n");

  return typedText + metaBlock + fileContent;
}

/**
 * Parses the `___ATTACHMENT_META___` block from a persisted message text.
 * Returns an empty array when no metadata block is present.
 */
export function parseAttachmentMeta(text: string): AttachmentChipMeta[] {
  const startTag = "___ATTACHMENT_META___\n";
  const endTag = "\n___END_ATTACHMENT_META___";
  const startIdx = text.indexOf(startTag);
  if (startIdx === -1) return [];
  const jsonStart = startIdx + startTag.length;
  const endIdx = text.indexOf(endTag, jsonStart);
  if (endIdx === -1) return [];
  try {
    return JSON.parse(text.slice(jsonStart, endIdx)) as AttachmentChipMeta[];
  } catch {
    return [];
  }
}

/**
 * Strips the attachment metadata block and all file content that follows it,
 * returning only the user's original typed text for display purposes.
 */
export function stripAttachmentBlock(text: string): string {
  const tag = "___ATTACHMENT_META___";
  const idx = text.indexOf(tag);
  if (idx === -1) return text;
  let start = idx;
  while (start > 0 && text[start - 1] === "\n") start--;
  return text.slice(0, start);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function resolveDisplayType(a: Attachment): string {
  if (a.type === "application/pdf") return "PDF";
  if (a.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  if (a.type.startsWith("image/")) return a.type.split("/")[1]?.toUpperCase() ?? "IMAGE";
  if (a.type.startsWith("text/")) return a.type.split("/")[1]?.toUpperCase() ?? "TEXT";
  return a.type.split("/")[1]?.toUpperCase() ?? "FILE";
}
