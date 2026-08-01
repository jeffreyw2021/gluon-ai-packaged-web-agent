
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import type { LanguageModel, ToolSet } from "ai";
import { z } from "zod";
import type { LoadedConfig } from "../../config/loader";
import { getLanguageModel, modelProvider, normalizeModelId } from "../model/resolveModel";
import { requestConfirmation } from "./tools/requestConfirmation";
import { createReadSkillTool } from "./tools/readSkill";
import { createDiscoverToolsTool } from "./tools/discoverTools";

function buildSystemPrompt(config: LoadedConfig, contextParts: string[]): string {
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

  return prompt;
}

export interface CreateAgentOptions {
  /** When true, select the reasoningModel (if configured) and enable reasoning. */
  sendReasoning?: boolean;
}

/**
 * Build provider options for the given model.
 * For OpenAI reasoning models (o-series), set parallelToolCalls: false
 * and optionally a reasoning effort level.
 */
function buildProviderOptions(normalizedModelId: string, sendReasoning: boolean): Record<string, Record<string, string | number | boolean | null>> | undefined {
  const provider = modelProvider(normalizedModelId);
  if (provider === "openai") {
    const base: Record<string, string | number | boolean | null> = { parallelToolCalls: false };
    if (sendReasoning) {
      base.reasoningEffort = "medium";
    }
    return { openai: base };
  }
  return undefined;
}

export async function createAgent(config: LoadedConfig, opts: CreateAgentOptions = {}) {
  // Call context providers fresh on every request so dynamic values (e.g.
  // current date/time) are always up to date.
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

  // When sendReasoning is requested, prefer the dedicated reasoningModel (if
  // configured). Fall back to the main model so callers never get undefined.
  const sendReasoning = opts.sendReasoning ?? false;
  const rawModelId =
    sendReasoning && config.raw.reasoningModel
      ? config.raw.reasoningModel
      : config.raw.model;

  const normalizedId = normalizeModelId(rawModelId);
  const model: LanguageModel = getLanguageModel(normalizedId);
  const providerOptions = buildProviderOptions(normalizedId, sendReasoning);

  return new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt(config, contextParts),
    allowSystemInMessages: true,
    tools,
    maxOutputTokens: config.raw.maxOutputTokens,
    stopWhen: stepCountIs(config.raw.maxRounds),
    ...(providerOptions ? { providerOptions } : {}),
  });
}
