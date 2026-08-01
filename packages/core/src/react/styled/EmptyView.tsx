"use client";

import React, { type CSSProperties, type ComponentType } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { SuggestedPromptButton } from "./SuggestedPromptButton";
import type { SuggestedPromptButtonProps } from "./SuggestedPromptButton";

const CSS = `
[data-gluon-empty-view] {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-top: 16px;
  box-sizing: border-box;
}
[data-gluon-empty-view] .gluon-ev-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 8px;
  text-align: center;
}
[data-gluon-empty-view] .gluon-ev-labels {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
[data-gluon-empty-view] .gluon-ev-heading {
  font-size: 1rem;
  font-weight: 500;
  color: #a3a3a3;
  line-height: 1.375;
  margin: 0;
}
[data-gluon-empty-view] .gluon-ev-sub {
  font-size: 0.75rem;
  color: #d4d4d4;
  line-height: 1.625;
  max-width: 180px;
  margin: 0;
}
[data-gluon-empty-view][data-dark] .gluon-ev-heading { color: #737373; }
[data-gluon-empty-view][data-dark] .gluon-ev-sub { color: #525252; }
[data-gluon-empty-view] .gluon-ev-prompts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
` as const;

export interface EmptyViewProps {
  /**
   * Prompts to show as chips. Falls back to `AgentProvider` context prompts,
   * then hides the prompts section entirely when neither is available.
   */
  suggestedPrompts?: string[];
  /**
   * Maximum number of chips to render. Default `3`.
   */
  maxSuggestedPrompts?: number;
  /**
   * Called when a prompt chip is clicked.
   * Defaults to `adapter.sendUserMessage(prompt)`.
   */
  onSelect?: (prompt: string) => void;
  darkMode?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Override the prompt chip component. */
  components?: {
    SuggestedPromptButton?: ComponentType<SuggestedPromptButtonProps>;
  };
}

/**
 * Styled empty-state view for the message list. Shows a "How can I help?"
 * headline and a capped list of suggested-prompt chips sourced from config.
 *
 * Must be rendered inside `<AgentProvider>`.
 */
export function EmptyView({
  suggestedPrompts: propPrompts,
  maxSuggestedPrompts = 3,
  onSelect,
  darkMode = false,
  className,
  style,
  components,
}: EmptyViewProps) {
  const { adapter, suggestedPrompts: ctxPrompts } = useAgentContext();
  const prompts = propPrompts ?? ctxPrompts ?? undefined;
  const handleSelect = onSelect ?? ((p: string) => { void adapter.sendUserMessage(p); });
  const PromptButton = components?.SuggestedPromptButton ?? SuggestedPromptButton;

  return (
    <>
      <style>{CSS}</style>
      <div
        data-gluon-empty-view=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={className}
        style={style}
      >
        <div className="gluon-ev-body">
          <div className="gluon-ev-labels">
            <p className="gluon-ev-heading">How can I help?</p>
            <p className="gluon-ev-sub">Ask me anything</p>
          </div>
        </div>
        {prompts && prompts.length > 0 && (
          <div className="gluon-ev-prompts">
            {prompts.slice(0, maxSuggestedPrompts).map((p) => (
              <PromptButton
                key={p}
                label={p}
                onClick={() => handleSelect(p)}
                darkMode={darkMode}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
