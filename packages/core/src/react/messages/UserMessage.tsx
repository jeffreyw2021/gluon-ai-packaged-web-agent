"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import type { UIMessage } from "ai";
import { parseAttachmentMeta, stripAttachmentBlock } from "../lib/attachmentPayload";
import type { AttachmentChipMeta } from "../lib/attachmentPayload";

export type { AttachmentChipMeta };

export interface UserMessageProps {
  message: UIMessage;
  className?: string;
  style?: CSSProperties;
  /**
   * Render the content yourself.
   *
   * - `text` — the user's typed text with the attachment payload block stripped
   * - `attachments` — parsed chip metadata (filename, mimeType, displayType)
   *   for every file that was sent with the message
   *
   * If omitted, renders a plain `<span>` with the stripped text.
   */
  children?: (text: string, attachments: AttachmentChipMeta[]) => ReactNode;
}

function getRawTextContent(msg: UIMessage): string {
  return (msg.parts ?? [])
    .filter((p) => p.type === "text" && "text" in p)
    .map((p) => ("text" in p ? String(p.text) : ""))
    .join("");
}

/**
 * Headless user message. Renders a `<div>` with `data-role="user"`.
 * No styles applied — pass `className` / `style` for your own styling.
 *
 * Automatically strips the `___ATTACHMENT_META___` payload block from the
 * displayed text and parses attachment chip metadata, so consumers can render
 * file chips without any extra parsing.
 */
export function UserMessage({ message, className, style, children }: UserMessageProps) {
  const raw = getRawTextContent(message);
  const attachments = parseAttachmentMeta(raw);
  const text = stripAttachmentBlock(raw);

  return (
    <div data-role="user" className={className} style={style}>
      {children ? children(text, attachments) : <span>{text}</span>}
    </div>
  );
}
