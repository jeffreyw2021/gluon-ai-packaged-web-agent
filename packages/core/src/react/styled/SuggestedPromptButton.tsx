"use client";

import React, { type CSSProperties } from "react";
import { ArrowDownRight } from "lucide-react";

const CSS = `
[data-gluon-prompt-btn] {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(0,0,0,0.08);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  box-sizing: border-box;
}
[data-gluon-prompt-btn]:hover {
  background: rgba(0,0,0,0.04);
  border-color: rgba(0,0,0,0.13);
}
[data-gluon-prompt-btn][data-dark] {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
}
[data-gluon-prompt-btn][data-dark]:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.16);
}
[data-gluon-prompt-btn] .gluon-pb-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #525252;
  line-height: 1.375;
  transition: color 0.15s ease;
}
[data-gluon-prompt-btn]:hover .gluon-pb-text { color: #171717; }
[data-gluon-prompt-btn][data-dark] .gluon-pb-text { color: #a3a3a3; }
[data-gluon-prompt-btn][data-dark]:hover .gluon-pb-text { color: #f5f5f5; }
[data-gluon-prompt-btn] .gluon-pb-icon {
  flex-shrink: 0;
  color: #a3a3a3;
  transition: color 0.15s ease;
}
[data-gluon-prompt-btn]:hover .gluon-pb-icon { color: #525252; }
[data-gluon-prompt-btn][data-dark] .gluon-pb-icon { color: #737373; }
[data-gluon-prompt-btn][data-dark]:hover .gluon-pb-icon { color: #d4d4d4; }
` as const;

export interface SuggestedPromptButtonProps {
  label: string;
  onClick?: () => void;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Styled suggested-prompt chip button. Renders a rounded row with a truncated
 * label and an arrow icon. Used by `EmptyView` but can be placed anywhere.
 */
export function SuggestedPromptButton({
  label,
  onClick,
  darkMode = false,
  className,
  style,
}: SuggestedPromptButtonProps) {
  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        data-gluon-prompt-btn=""
        {...(darkMode ? { "data-dark": "" } : {})}
        onClick={onClick}
        className={className}
        style={style}
      >
        <span className="gluon-pb-text">{label}</span>
        <ArrowDownRight size={14} className="gluon-pb-icon" />
      </button>
    </>
  );
}
