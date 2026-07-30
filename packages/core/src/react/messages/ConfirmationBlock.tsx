"use client";

import React, { type CSSProperties } from "react";
import type { UIMessage } from "ai";

export interface ConfirmationOption {
  id: string;
  label: string;
  style?: "confirm" | "cancel" | "neutral";
}

export interface ConfirmationBlockProps {
  message: UIMessage;
  awaitingApprovalId: string | null;
  onApprove: (opts: { approvalId: string; approved: boolean; reason?: string }) => Promise<void>;
  className?: string;
  style?: CSSProperties;
  classNames?: {
    card?: string;
    title?: string;
    description?: string;
    options?: string;
    optionButton?: string;
  };
  styles?: {
    card?: CSSProperties;
    title?: CSSProperties;
    description?: CSSProperties;
    options?: CSSProperties;
    optionButton?: CSSProperties;
  };
}

interface ConfirmationPart {
  type: string;
  toolCallId: string;
  state?: string;
  input?: {
    action?: string;
    id?: string;
    title?: string;
    description?: string;
    options?: ConfirmationOption[];
    pendingTool?: string;
  };
}

function toConfirmationParts(parts: UIMessage["parts"]): ConfirmationPart[] {
  return (parts ?? [])
    .filter((p) => p.type.startsWith("tool-request_confirmation"))
    .map((p) => p as unknown as ConfirmationPart);
}

/**
 * Headless HITL confirmation block. Renders a `<div data-slot="confirmation">` per
 * pending approval. No styles — apply via `className` / `style` / `classNames` / `styles`.
 *
 * `data-active="true"` on the card when this approval is currently awaiting response.
 * Option buttons carry `data-style="confirm|cancel|neutral"` for attribute-based styling.
 */
export function ConfirmationBlock({
  message,
  awaitingApprovalId,
  onApprove,
  className,
  style,
  classNames = {},
  styles = {},
}: ConfirmationBlockProps) {
  const parts = toConfirmationParts(message.parts);
  if (parts.length === 0) return null;

  return (
    <div data-slot="confirmation-list" className={className} style={style}>
      {parts.map((part) => {
        const input = part.input;
        if (!input || input.action !== "CONFIRMATION_REQUEST") return null;

        const approvalId = input.id ?? part.toolCallId;
        const isActive = awaitingApprovalId === approvalId;
        const options: ConfirmationOption[] = input.options ?? [
          { id: "yes", label: "Confirm", style: "confirm" },
          { id: "no", label: "Cancel", style: "cancel" },
        ];

        return (
          <div
            key={part.toolCallId}
            data-slot="confirmation"
            data-active={isActive ? "true" : undefined}
            className={classNames.card}
            style={styles.card}
          >
            {input.title && (
              <div
                data-slot="confirmation-title"
                className={classNames.title}
                style={styles.title}
              >
                {input.title}
              </div>
            )}
            {input.description && (
              <div
                data-slot="confirmation-description"
                className={classNames.description}
                style={styles.description}
              >
                {input.description}
              </div>
            )}
            <div
              data-slot="confirmation-options"
              className={classNames.options}
              style={styles.options}
            >
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!isActive}
                  data-style={opt.style}
                  aria-label={opt.label}
                  className={classNames.optionButton}
                  style={styles.optionButton}
                  onClick={() =>
                    isActive &&
                    void onApprove({
                      approvalId,
                      approved: opt.style !== "cancel",
                      reason: opt.label,
                    })
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
