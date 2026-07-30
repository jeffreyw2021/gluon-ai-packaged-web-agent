"use client";

import { useAtom } from "jotai";
import { reasoningModeAtom } from "../provider/atoms";
import type { ReasoningMode } from "../../types/ReasoningMode";

export type { ReasoningMode };

export interface UseReasoningModeReturn {
  mode: ReasoningMode;
  setMode: (mode: ReasoningMode) => void;
  modes: ReasoningMode[];
  isThinking: boolean;
  isSimple: boolean;
  isAuto: boolean;
}

const ALL_MODES: ReasoningMode[] = ["auto", "thinking", "simple"];

export function useReasoningMode(): UseReasoningModeReturn {
  const [mode, setMode] = useAtom(reasoningModeAtom);

  return {
    mode,
    setMode,
    modes: ALL_MODES,
    isThinking: mode === "thinking",
    isSimple: mode === "simple",
    isAuto: mode === "auto",
  };
}
