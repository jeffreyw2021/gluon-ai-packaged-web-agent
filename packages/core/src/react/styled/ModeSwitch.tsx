"use client";

import React, { type CSSProperties } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import type { ReasoningMode } from "../../types/ReasoningMode";

const CSS = `
[data-gluon-modeswitch] {
  display: flex;
  align-items: center;
  height: 28px;
  border-radius: 8px;
  background: rgba(0,0,0,0.04);
  padding: 0 2px;
  gap: 1px;
  box-sizing: border-box;
}
[data-gluon-modeswitch][data-dark] { background: rgba(255,255,255,0.06); }
[data-gluon-modeswitch] .gluon-ms-pill {
  padding: 0 8px;
  height: 100%;
  border-radius: 6px;
  font-size: 11px;
  border: none;
  cursor: pointer;
  background: transparent;
  color: #737373;
  transition: color 0.15s;
}
[data-gluon-modeswitch] .gluon-ms-pill:hover { color: #262626; }
[data-gluon-modeswitch] .gluon-ms-pill-active {
  background: rgba(255,255,255,0.8);
  color: #171717;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
[data-gluon-modeswitch][data-dark] .gluon-ms-pill { color: #a3a3a3; }
[data-gluon-modeswitch][data-dark] .gluon-ms-pill:hover { color: #e5e5e5; }
[data-gluon-modeswitch][data-dark] .gluon-ms-pill-active {
  background: rgba(255,255,255,0.12);
  color: #f5f5f5;
  box-shadow: 0 1px 2px rgba(0,0,0,0.35);
}
` as const;

const MODES = [
  { value: "simple" as const, label: "Simple" },
  { value: "auto" as const, label: "Auto" },
  { value: "thinking" as const, label: "Think" },
] satisfies Array<{ value: ReasoningMode; label: string }>;

export type { ReasoningMode };

export interface ModeSwitchProps {
  /**
   * Controlled mode value. Defaults to the value from `useAgentContext()` when omitted.
   */
  value?: ReasoningMode;
  /**
   * Called when the user picks a different mode.
   * Defaults to `adapter.setReasoningMode` when omitted.
   */
  onChange?: (mode: ReasoningMode) => void;
  className?: string;
  style?: CSSProperties;
  /** Apply dark palette. */
  darkMode?: boolean;
}

/**
 * Styled Simple / Auto / Think reasoning mode pill switcher.
 * Reads and writes `reasoningMode` from `AgentProvider` automatically.
 * Must be rendered inside `<AgentProvider>`.
 */
export function ModeSwitch({
  value,
  onChange,
  className,
  style,
  darkMode = false,
}: ModeSwitchProps) {
  const { adapter } = useAgentContext();
  const currentMode = value ?? adapter.reasoningMode;
  const setMode = onChange ?? adapter.setReasoningMode;

  return (
    <>
      <style>{CSS}</style>
      <div
        data-gluon-modeswitch=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={className}
        style={style}
      >
        {MODES.map(({ value: v, label }) => (
          <button
            key={v}
            type="button"
            onClick={() => setMode(v)}
            className={`gluon-ms-pill${currentMode === v ? " gluon-ms-pill-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
