import type { z } from "zod";
import type React from "react";

/**
 * UI hints surfaced to the front-end for a tool's row in the ThoughtWindow.
 * Define these inside your `defineTool()` call — the package surfaces them
 * automatically via the config API; no manual wiring in UI components needed.
 */
export interface ToolUI {
  /** Label shown while the tool is executing (e.g. "Searching web"). */
  executingLabel?: string;
  /** Label shown after the tool completes (e.g. "Search done"). */
  completedLabel?: string;
  /**
   * Lucide icon name to render next to the label (e.g. "Globe", "FileText").
   * Defaults to "Settings" when not provided.
   */
  icon?: string;
}

export interface ToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  description: string;
  inputSchema: TInput;
  execute: (input: z.infer<TInput>, options?: { toolCallId?: string }) => Promise<unknown>;
  needsApproval?: boolean | ((input: z.infer<TInput>) => boolean | Promise<boolean>);
  displayLabel?: string;
  /** Optional UI hints for the ThoughtWindow tool row. */
  ui?: ToolUI;
}

export function defineTool<TInput extends z.ZodTypeAny>(
  def: ToolDefinition<TInput>,
): ToolDefinition<TInput> {
  return def;
}

export interface ActionBlockProps<TInput = unknown, TOutput = unknown> {
  toolInput: TInput;
  toolOutput: TOutput;
  toolName: string;
  messageId: string;
  /** State of the tool invocation: "call", "result", "partial-call". */
  state?: string;
}

export type ActionBlockComponent = React.ComponentType<ActionBlockProps>;

export type ActionBlockRegistry = Record<string, ActionBlockComponent>;
