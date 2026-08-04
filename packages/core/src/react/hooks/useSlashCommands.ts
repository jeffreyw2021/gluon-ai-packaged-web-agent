"use client";

import { useCallback, useMemo } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import type { SlashCommand } from "../input/SlashCommandMenu";

// ── Built-in commands ─────────────────────────────────────────────────────

const BUILT_IN_COMMANDS: SlashCommand[] = [
  {
    id: "summarize",
    label: "Summarize",
    description: "Condense earlier messages to free up context window",
  },
];

// ── Hook ──────────────────────────────────────────────────────────────────

export interface UseSlashCommandsReturn {
  /** Full list of available slash commands. */
  commands: SlashCommand[];
  /**
   * Filter commands to those matching a query string.
   * Empty query returns all commands.
   */
  filter: (query: string) => SlashCommand[];
  /** Execute a command by its id or by passing the command object. */
  execute: (command: SlashCommand) => Promise<void>;
}

/**
 * Provides the list of slash commands available in the chat input and an
 * `execute` function to run them. Must be called inside `<AgentProvider>`.
 */
export function useSlashCommands(): UseSlashCommandsReturn {
  const { adapter } = useAgentContext();

  const commands = useMemo(() => BUILT_IN_COMMANDS, []);

  const filter = useCallback(
    (query: string): SlashCommand[] => {
      if (!query.trim()) return commands;
      const q = query.toLowerCase();
      return commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(q) ||
          cmd.description.toLowerCase().includes(q),
      );
    },
    [commands],
  );

  const execute = useCallback(
    async (command: SlashCommand): Promise<void> => {
      if (command.id === "summarize") {
        await adapter.summarizeContext();
      }
    },
    [adapter],
  );

  return { commands, filter, execute };
}
