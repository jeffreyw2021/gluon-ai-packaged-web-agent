"use client";

import React, { type ButtonHTMLAttributes } from "react";
import { useAtom } from "jotai";
import { panelModeAtom } from "../provider/atoms";
import type { AgentPanelMode } from "../panel/AgentPanel";

export interface ExpandButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Mode to expand to. Default "fullscreen". */
  targetMode?: AgentPanelMode;
}

/**
 * Headless expand button. Sets the panel mode to `targetMode` (default "fullscreen").
 * Disabled when already at that mode. Pass children for your own icon/label.
 *
 * `data-slot="expand-button"` is set on the root element for CSS targeting.
 */
export function ExpandButton({ children, targetMode = "fullscreen", disabled, onClick, ...rest }: ExpandButtonProps) {
  const [mode, setMode] = useAtom(panelModeAtom);
  const alreadyExpanded = mode === targetMode;

  return (
    <button
      type="button"
      data-slot="expand-button"
      disabled={disabled ?? alreadyExpanded}
      aria-label="Expand chat"
      aria-pressed={alreadyExpanded}
      onClick={(e) => {
        setMode(targetMode);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
