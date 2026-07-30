"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { Provider as JotaiProvider, createStore } from "jotai";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { AgentSessionAdapter } from "../../types/AgentSessionAdapter";
import { useAgentAdapter } from "../adapter/useAgentAdapter";
import type { ActionBlockRegistry, ToolUI } from "../../tool";
import type { AgentPanelMode } from "../panel/AgentPanel";
import { panelModeAtom } from "./atoms";

// ── Context ────────────────────────────────────────────────────────────────

export interface AgentContextValue {
  adapter: AgentSessionAdapter;
  actionBlocks: ActionBlockRegistry;
  basePath: string;
  suggestedPrompts: string[];
  /** UI hints keyed by tool name, sourced from each tool's `ui` field. */
  toolUi: Record<string, ToolUI>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgentContext must be used inside <AgentProvider>");
  }
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

export interface AgentProviderProps {
  children: ReactNode;
  /** Override query client if you already have one. */
  queryClient?: QueryClient;
  /** Base path for agent API routes. Default: "/api/agent" */
  basePath?: string;
  /** Action block components keyed by tool name. */
  actionBlocks?: ActionBlockRegistry;
  /**
   * Suggested prompts shown in the empty state.
   * When omitted, the provider fetches them automatically from
   * `GET {basePath}/config` — sourced from `agent.config.json`.
   */
  suggestedPrompts?: string[];
  /** Initial panel display mode. Default "fullscreen". */
  defaultPanelMode?: AgentPanelMode;
}

interface ConfigResponse {
  suggestedPrompts: string[];
  toolUi: Record<string, ToolUI>;
}

function AgentProviderInner({
  children,
  basePath = "/api/gluon-ai",
  actionBlocks = {},
  suggestedPrompts: promptsProp,
}: Omit<AgentProviderProps, "queryClient" | "defaultPanelMode">) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const bumpSession = useCallback(() => bump(), []);

  const adapter = useAgentAdapter({
    basePath,
    activeChatId,
    setActiveChatId,
    bumpSession,
  });

  // Auto-fetch config from the server (suggestedPrompts + toolUi).
  const { data: configData } = useQuery({
    queryKey: ["gluon-agent-config", basePath],
    queryFn: async () => {
      const res = await fetch(`${basePath}/config`);
      if (!res.ok) return { suggestedPrompts: [] as string[], toolUi: {} as Record<string, ToolUI> };
      return res.json() as Promise<ConfigResponse>;
    },
    staleTime: Infinity,
  });

  const suggestedPrompts =
    promptsProp ?? configData?.suggestedPrompts ?? [];

  const toolUi: Record<string, ToolUI> = configData?.toolUi ?? {};

  return (
    <AgentContext.Provider value={{ adapter, actionBlocks, basePath, suggestedPrompts, toolUi }}>
      {children}
    </AgentContext.Provider>
  );
}

export function AgentProvider({
  children,
  queryClient,
  basePath,
  actionBlocks,
  suggestedPrompts,
  defaultPanelMode = "fullscreen",
}: AgentProviderProps) {
  const qc = queryClient ?? defaultQueryClient;
  // Create a stable per-provider Jotai store initialized with the desired panel mode.
  // useMemo with an empty dep array is intentional — the default is read once at mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => {
    const s = createStore();
    s.set(panelModeAtom, defaultPanelMode);
    return s;
  }, []);
  return (
    <JotaiProvider store={store}>
      <QueryClientProvider client={qc}>
        <AgentProviderInner
          basePath={basePath}
          actionBlocks={actionBlocks}
          suggestedPrompts={suggestedPrompts}
        >
          {children}
        </AgentProviderInner>
      </QueryClientProvider>
    </JotaiProvider>
  );
}
