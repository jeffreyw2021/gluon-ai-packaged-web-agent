"use client";

import React, { type CSSProperties } from "react";
import { useAttachments } from "../hooks/useAttachments";
import type { UseAttachmentsReturn } from "../hooks/useAttachments";
import { Paperclip } from "lucide-react";

const CSS = `
.gluon-attach-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: #a3a3a3;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s ease, background-color 0.15s ease;
  box-sizing: border-box;
}
.gluon-attach-btn:hover {
  color: #525252;
  background: rgba(0,0,0,0.05);
}
.gluon-attach-btn:disabled {
  opacity: 0.3;
  pointer-events: none;
}
.gluon-attach-btn-dark { color: #737373; }
.gluon-attach-btn-dark:hover {
  color: #d4d4d4;
  background: rgba(255,255,255,0.08);
}
` as const;

export interface AttachButtonProps {
  /**
   * Called with the selected files. When omitted, `attachments.addFiles` is used.
   */
  onFiles?: (files: File[]) => void;
  /**
   * Pass `useAttachments()` return value to auto-wire file selection.
   * Ignored when `onFiles` is also provided.
   */
  attachments?: Pick<UseAttachmentsReturn, "addFiles">;
  /** File types to accept. Default `"*"`. */
  accept?: string;
  /** Allow selecting multiple files. Default `true`. */
  multiple?: boolean;
  disabled?: boolean;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children?: React.ReactNode;
}

/**
 * Styled file-attach button. Opens a native file picker on click.
 * Uses `useAttachments()` from context when `attachments` prop is omitted.
 * Must be rendered inside `<AgentProvider>` in that case.
 */
export function AttachButton({
  onFiles,
  attachments: attachmentsProp,
  accept = "*",
  multiple = true,
  disabled = false,
  darkMode = false,
  className,
  style,
  title = "Attach file",
  children,
}: AttachButtonProps) {
  const attachmentsHook = useAttachments();
  const addFiles = onFiles ?? attachmentsProp?.addFiles ?? attachmentsHook.addFiles;

  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => {
      if (input.files) addFiles(Array.from(input.files));
    };
    input.click();
  };

  const cls = [
    "gluon-attach-btn",
    darkMode ? "gluon-attach-btn-dark" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        data-slot="attach-button"
        aria-label={title}
        title={title}
        disabled={disabled}
        onClick={handleClick}
        className={cls}
        style={style}
      >
        {children ?? <Paperclip width={14} height={14} />}
      </button>
    </>
  );
}
