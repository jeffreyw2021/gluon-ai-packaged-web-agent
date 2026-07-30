"use client";

import { useAtom } from "jotai";
import { panelModeAtom } from "../provider/atoms";
import type { AgentPanelMode } from "../panel/AgentPanel";

export interface UsePanelModeReturn {
  mode: AgentPanelMode;
  setMode: (mode: AgentPanelMode) => void;
  isMinimal: boolean;
  isFullscreen: boolean;
  isSideBySide: boolean;
  expand: () => void;
  collapse: () => void;
  toggleSideBySide: () => void;
}

export function usePanelMode(): UsePanelModeReturn {
  const [mode, setMode] = useAtom(panelModeAtom);

  return {
    mode,
    setMode,
    isMinimal: mode === "minimal",
    isFullscreen: mode === "fullscreen",
    isSideBySide: mode === "sideBySide",
    expand: () => setMode("fullscreen"),
    collapse: () => setMode("minimal"),
    toggleSideBySide: () =>
      setMode((prev) => (prev === "sideBySide" ? "fullscreen" : "sideBySide")),
  };
}
