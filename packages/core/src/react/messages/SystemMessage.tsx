"use client";

import type { CSSProperties } from "react";
import type { UIMessage } from "ai";

export interface SystemMessageProps {
  message: UIMessage;
  className?: string;
  style?: CSSProperties;
}

/**
 * Headless system message component. Renders a status label injected by the
 * runtime (e.g. a context-compression marker) with zero built-in styles.
 *
 * Style via `className` / `style`, or override the slot in `MessageList`'s
 * `components.SystemMessage` prop. The element carries `data-slot` and
 * `data-role` attributes for CSS targeting.
 *
 * The inner `<span>` carries `data-slot="system-message-text"` for targeting
 * the text content independently of the outer container.
 */
export function SystemMessage({ message, className, style }: SystemMessageProps) {
  const text =
    message.parts?.find((p): p is { type: "text"; text: string } =>
      p.type === "text",
    )?.text ?? "";

  return (
    <div
      data-slot="system-message"
      data-role="system"
      className={className}
      style={style}
    >
      <span data-slot="system-message-text">{text}</span>
    </div>
  );
}
