"use client";

import { useCallback, useState } from "react";
import { useFileExtraction } from "./useFileExtraction";

export interface Attachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  /** Object URL for previewing images. Revoked automatically on remove/clear. */
  previewUrl: string | null;
  /** Extracted plain text (populated asynchronously after the file is added). */
  extractedText?: string;
  /** `true` while client-side text extraction is in progress. */
  isExtracting?: boolean;
  /** Set when extraction fails; contains a human-readable explanation. */
  extractionError?: string;
}

export interface UseAttachmentsReturn {
  attachments: Attachment[];
  /**
   * `true` when every attachment has finished extracting (successfully or with an error).
   * Use this to gate the send button when you require extracted text before sending.
   */
  areAllReady: boolean;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  /** Open a native file picker programmatically. */
  openPicker: (accept?: string, multiple?: boolean) => void;
}

function toAttachment(file: File): Attachment {
  const isImage = file.type.startsWith("image/");
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: isImage ? URL.createObjectURL(file) : null,
    isExtracting: true,
  };
}

/**
 * Manages file attachments with automatic client-side text extraction.
 *
 * Each file added via `addFiles` immediately starts async extraction (PDF, DOCX,
 * plain-text) in the background. `areAllReady` becomes `true` once every file
 * has settled. Pass `attachments` to `buildSendPayload` before calling
 * `sendUserMessage` to inline the extracted content into the message.
 */
export function useAttachments(): UseAttachmentsReturn {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const { extractText } = useFileExtraction();

  const patchById = useCallback((id: string, patch: Partial<Attachment>) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      const fresh = arr.map(toAttachment);
      setAttachments((prev) => [...prev, ...fresh]);

      for (let i = 0; i < arr.length; i++) {
        const id = fresh[i]!.id;
        extractText(arr[i]!)
          .then((text) => {
            patchById(id, { extractedText: text, isExtracting: false });
          })
          .catch((err: unknown) => {
            patchById(id, {
              isExtracting: false,
              extractionError:
                err instanceof Error ? err.message : "Extraction failed",
            });
          });
      }
    },
    [extractText, patchById],
  );

  const removeFile = useCallback((id: string) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setAttachments((prev) => {
      for (const a of prev) {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      }
      return [];
    });
  }, []);

  const openPicker = useCallback(
    (accept = "*", multiple = true) => {
      if (typeof document === "undefined") return;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.onchange = () => {
        if (input.files) addFiles(input.files);
      };
      input.click();
    },
    [addFiles],
  );

  const areAllReady =
    attachments.length > 0 && attachments.every((a) => !a.isExtracting);

  return { attachments, areAllReady, addFiles, removeFile, clearAll, openPicker };
}
