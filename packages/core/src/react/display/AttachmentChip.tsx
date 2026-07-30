"use client";

import type { Attachment } from "../hooks/useAttachments";

export interface AttachmentChipRenderProps {
  name: string;
  size: number;
  type: string;
  previewUrl: string | null;
  /** `true` while client-side text extraction is in progress. */
  isExtracting: boolean;
  /** Non-null when extraction failed; contains a human-readable message. */
  extractionError: string | null;
  onRemove: () => void;
}

export interface AttachmentChipProps {
  attachment: Attachment;
  onRemove: (id: string) => void;
  /**
   * Render prop — receives file metadata + remove handler.
   *
   * When omitted, renders nothing (returns `null`).
   *
   * @example
   * ```tsx
   * {attachments.map((a) => (
   *   <AttachmentChip key={a.id} attachment={a} onRemove={attachments.removeFile}>
   *     {({ name, onRemove }) => (
   *       <div className="chip">
   *         {name}
   *         <button onClick={onRemove}>×</button>
   *       </div>
   *     )}
   *   </AttachmentChip>
   * ))}
   * ```
   */
  children?: (props: AttachmentChipRenderProps) => React.ReactNode;
}

/**
 * Headless attachment chip. Owns the remove handler; you supply the visual
 * via the `children` render prop.
 *
 * Renders `null` when `children` is omitted.
 */
export function AttachmentChip({ attachment, onRemove, children }: AttachmentChipProps) {
  if (!children) return null;
  return (
    <>
      {children({
        name: attachment.name,
        size: attachment.size,
        type: attachment.type,
        previewUrl: attachment.previewUrl,
        isExtracting: attachment.isExtracting ?? false,
        extractionError: attachment.extractionError ?? null,
        onRemove: () => onRemove(attachment.id),
      })}
    </>
  );
}
