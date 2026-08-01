
import { ToolLoopAgent, stepCountIs, tool, type ToolSet, type JSONValue } from "ai";
import { z } from "zod";
import type { LoadedConfig } from "../../config/loader";
import { resolveLanguageModel } from "../model/registry";
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

  if (config.raw.sendReasoning) {
    prompt +=
      "\n\n## Reasoning\n" +
      "Before responding, think through the problem carefully in your reasoning space: " +
      "understand what is being asked, consider relevant constraints and context, reason through " +
      "the best approach, and verify your plan before writing your final answer. " +
      "When selecting or calling tools, reason about which tool fits the task and why.";
  }

  return prompt;
}

export async function createAgent(config: LoadedConfig) {
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

  // Always inject discover_tools when the config has at least one custom tool.
  // It is an internal tool — never visible in agent.config.json.
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
      execute: async (input, opts) => def.execute(input, opts),
    });
  }

  const model = resolveLanguageModel(config.raw.model, config.raw.env);

  // Build provider-specific reasoning options when sendReasoning is enabled.
  // Only reasoning-capable models emit reasoning tokens; for others these options
  // are silently ignored or produce a graceful SDK error.
  const providerOptions: Record<string, Record<string, JSONValue | undefined>> = {};
  if (config.raw.sendReasoning) {
    const m = config.raw.model;
    if (/^(openai\/o|gateway\/openai\/o)/i.test(m)) {
      // OpenAI o-series (o1, o3, o4-mini, …): enable reasoning effort
      providerOptions["openai"] = { reasoningEffort: "medium" };
    } else if (/^(anthropic\/|gateway\/anthropic\/)/i.test(m)) {
      // Anthropic extended thinking (claude-3.7+): allocate up to 60% of token budget
      const budgetTokens = Math.min(Math.floor(config.raw.maxOutputTokens * 0.6), 10000);
      providerOptions["anthropic"] = { thinking: { type: "enabled", budgetTokens } };
    }
  }

  return new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt(config, contextParts),
    allowSystemInMessages: true,
    tools,
    maxOutputTokens: config.raw.maxOutputTokens,
    stopWhen: stepCountIs(config.raw.maxRounds),
    ...(Object.keys(providerOptions).length > 0 ? { providerOptions } : {}),
  });
}
