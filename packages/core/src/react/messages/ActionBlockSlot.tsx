"use client";

import React from "react";
import type { UIMessage } from "ai";
import type { ActionBlockRegistry } from "../../tool";

export interface ActionBlockSlotProps {
  message: UIMessage;
  registry: ActionBlockRegistry;
}

interface ToolPart {
  type: string; // "tool-<toolName>" in AI SDK v6
  toolCallId: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
}

function toolNameFromPartType(type: string): string {
  return type.slice("tool-".length);
}

/**
 * Renders the user-registered action block for each tool invocation part
 * in a message. Renders nothing for tool names not in the registry.
 */
export function ActionBlockSlot({ message, registry }: ActionBlockSlotProps) {
  const toolParts = (message.parts ?? [])
    .filter((p) => p.type.startsWith("tool-"))
    .map((p) => p as unknown as ToolPart);

  if (toolParts.length === 0) return null;

  return (
    <>
      {toolParts.map((part) => {
        const toolName = part.toolName ?? toolNameFromPartType(part.type);
        const Component = registry[toolName];
        if (!Component) return null;

        return (
          <Component
            key={part.toolCallId}
            toolName={toolName}
            messageId={message.id}
            toolInput={part.input}
            toolOutput={part.output}
            state={part.state}
          />
        );
      })}
    </>
  );
}
