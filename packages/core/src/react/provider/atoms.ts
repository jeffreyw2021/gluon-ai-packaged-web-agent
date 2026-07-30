"use client";

import { atom } from "jotai";
import type { ReasoningMode } from "../../types/ReasoningMode";

export const reasoningModeAtom = atom<ReasoningMode>("auto");
