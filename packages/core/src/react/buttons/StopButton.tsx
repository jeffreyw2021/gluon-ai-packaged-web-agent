"use client";

import React, { type ButtonHTMLAttributes } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { isLiveRunPhase } from "../../types/RunPhase";

export type StopButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Headless stop button. Visible/enabled only while a run is active.
 * Pass children for your own icon/label.
 *
 * `data-slot="stop-button"` is set on the root element for CSS targeting.
 */
export function StopButton({ children, disabled, onClick, ...rest }: StopButtonProps) {
  const { adapter } = useAgentContext();
  const { stopGeneration, runPhase } = adapter;
  const isActive = isLiveRunPhase(runPhase);

  return (
    <button
      type="button"
      data-slot="stop-button"
      disabled={disabled ?? !isActive}
      aria-label="Stop generation"
      onClick={(e) => {
        if (isActive) void stopGeneration();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
