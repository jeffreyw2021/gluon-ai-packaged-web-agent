"use client";

import React, { type ButtonHTMLAttributes } from "react";
import type { UseAttachmentsReturn } from "../hooks/useAttachments";

export interface AttachButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** File types to accept, e.g. "image/*,.pdf". Default "*". */
  accept?: string;
  /** Allow selecting multiple files. Default true. */
  multiple?: boolean;
  /**
   * Called with the selected files.
   *
   * Takes precedence over `attachments.addFiles` when both are supplied.
   */
  onFiles?: (files: File[]) => void;
  /**
   * Pass the return value of `useAttachments()` to auto-wire file selection
   * to `attachments.addFiles`. Ignored when `onFiles` is also provided.
   *
   * @example
   * ```tsx
   * const attachments = useAttachments();
   * <AttachButton attachments={attachments}>Attach</AttachButton>
   * ```
   */
  attachments?: Pick<UseAttachmentsReturn, "addFiles">;
}

/**
 * Headless attach-document button. Opens a native file picker on click.
 *
 * Wire it to `useAttachments()` via the `attachments` prop (simplest), or
 * handle the files yourself via `onFiles`. Pass children for your own icon/label.
 *
 * `data-slot="attach-button"` is set on the root element for CSS targeting.
 *
 * @example
 * ```tsx
 * // Simplest — auto-wire with attachments hook
 * const attachments = useAttachments();
 * <AttachButton attachments={attachments} accept="image/*,.pdf">
 *   <PaperclipIcon />
 * </AttachButton>
 *
 * // Manual — handle files yourself
 * <AttachButton onFiles={(files) => console.log(files)}>
 *   <PaperclipIcon />
 * </AttachButton>
 * ```
 */
export function AttachButton({
  children,
  accept = "*",
  multiple = true,
  onFiles,
  attachments,
  onClick,
  ...rest
}: AttachButtonProps) {
  const handleFiles = onFiles ?? attachments?.addFiles;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (handleFiles) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.onchange = () => {
        if (input.files) handleFiles(Array.from(input.files));
      };
      input.click();
    }
    onClick?.(e);
  };

  return (
    <button
      type="button"
      data-slot="attach-button"
      aria-label="Attach file"
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
}
