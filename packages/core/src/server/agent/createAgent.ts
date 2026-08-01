
import { ToolLoopAgent, extractReasoningMiddleware, stepCountIs, tool, wrapLanguageModel } from "ai";
import type { LanguageModel, ToolSet } from "ai";
import { z } from "zod";
import type { LoadedConfig } from "../../config/loader";
import { getLanguageModel, normalizeModelId } from "../model/resolveModel";
import { requestConfirmation } from "./tools/requestConfirmation";
import { createReadSkillTool } from "./tools/readSkill";
import { createDiscoverToolsTool } from "./tools/discoverTools";

const THINKING_INSTRUCTION = `\n\n## Think mode
Think carefully before responding. First write out your reasoning inside <thinking>...</thinking> tags — work through the problem step by step, consider edge cases, and only then write your final answer outside the tags. Your thinking is visible to the user.`;

function buildSystemPrompt(
  config: LoadedConfig,
  contextParts: string[],
  sendReasoning: boolean,
): string {
  let prompt = config.systemPrompt;

  if (contextParts.length > 0) {
    prompt += "\n\n## Context\n" + contextParts.join("\n");
  }

  if (Object.keys(config.tools).length > 0) {
    prompt +=
      "\n\n## Tools\n" +
      "You have custom tools available. Before using any tool for the first time in a conversation, " +
      "call `discover_tools` to see the full catalog — what each tool does, when to use it, and its exact parameter signatures. " +
      "Do NOT answer from memory or training data when a tool is available for the task.";
  }

  if (config.skills.length > 0) {
    prompt +=
      "\n\n## Available Skills\n" +
      "Use the `read_skill` tool to load a skill document before using domain-specific tools.\n\n" +
      config.skills
        .map((_, i) => `- Index ${i}: Skill document ${i + 1}`)
        .join("\n");
  }

  if (sendReasoning) {
    prompt += THINKING_INSTRUCTION;
  }

  return prompt;
}

export interface CreateAgentOptions {
  /** When true, select the reasoningModel (if configured) and enable reasoning. */
  sendReasoning?: boolean;
}

export async function createAgent(config: LoadedConfig, opts: CreateAgentOptions = {}) {
  const contextParts: string[] = [];
  for (const provider of config.contextProviders ?? []) {
    try {
      const value = await provider();
      if (value && value.trim()) contextParts.push(value.trim());
    } catch (err) {
      console.error("[gluon-ai] Context provider threw an error (skipped):", err);
    }
  }

  const tools: ToolSet = {};

  tools["request_confirmation"] = requestConfirmation;

  if (Object.keys(config.tools).length > 0) {
    tools["discover_tools"] = createDiscoverToolsTool(config.tools);
  }

  if (config.skills.length > 0) {
    tools["read_skill"] = createReadSkillTool(config.skills);
  }

  for (const [name, def] of Object.entries(config.tools)) {
    tools[name] = tool({
      description: def.description,
      inputSchema: def.inputSchema as z.ZodTypeAny,
      ...(def.needsApproval !== undefined
        ? { needsApproval: def.needsApproval as (input: unknown) => boolean }
        : {}),
      execute: async (input, execOpts) => def.execute(input, execOpts),
    });
  }

  const sendReasoning = opts.sendReasoning ?? false;

  // When Think mode is active, prefer the dedicated reasoningModel if configured.
  const rawModelId =
    sendReasoning && config.raw.reasoningModel
      ? config.raw.reasoningModel
      : config.raw.model;

  const normalizedId = normalizeModelId(rawModelId);
  let model: LanguageModel = getLanguageModel(normalizedId);

  // Wrap with extractReasoningMiddleware so <thinking>…</thinking> blocks
  // in the model output are converted to proper reasoning-* stream events,
  // which the ThoughtWindow then displays. This works with any gateway model.
  if (sendReasoning) {
    model = wrapLanguageModel({
      model,
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt(config, contextParts, sendReasoning),
    allowSystemInMessages: true,
    tools,
    maxOutputTokens: config.raw.maxOutputTokens,
    stopWhen: stepCountIs(config.raw.maxRounds),
  });
}
