"use client";

import React, { type ButtonHTMLAttributes } from "react";
import { useAtom } from "jotai";
import { panelModeAtom } from "../provider/atoms";

export type CollapseButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Headless collapse button. Sets the panel mode to "minimal".
 * Disabled when already minimal. Pass children for your own icon/label.
 *
 * `data-slot="collapse-button"` is set on the root element for CSS targeting.
 */
export function CollapseButton({ children, disabled, onClick, ...rest }: CollapseButtonProps) {
  const [mode, setMode] = useAtom(panelModeAtom);
  const alreadyMinimal = mode === "minimal";

  return (
    <button
      type="button"
      data-slot="collapse-button"
      disabled={disabled ?? alreadyMinimal}
      aria-label="Collapse chat"
      aria-pressed={alreadyMinimal}
      onClick={(e) => {
        setMode("minimal");
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
