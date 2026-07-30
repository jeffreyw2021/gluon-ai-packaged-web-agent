"use client";

import { atom } from "jotai";
import type { AgentPanelMode } from "../panel/AgentPanel";
import type { ReasoningMode } from "../../types/ReasoningMode";

export const panelModeAtom = atom<AgentPanelMode>("fullscreen");

export const reasoningModeAtom = atom<ReasoningMode>("auto");
