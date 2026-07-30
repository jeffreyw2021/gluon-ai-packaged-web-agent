
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { LoadedConfig } from "../../config/loader";
import { requestConfirmation } from "./tools/requestConfirmation";
import { createReadSkillTool } from "./tools/readSkill";
import { createDiscoverToolsTool } from "./tools/discoverTools";

function buildSystemPrompt(config: LoadedConfig): string {
  let prompt = config.systemPrompt;

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

export function createAgent(config: LoadedConfig) {
  const tools: Record<string, ReturnType<typeof tool>> = {};

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

  const modelId = config.raw.model;
  const openaiApiKey = process.env[config.raw.env?.openaiApiKey ?? "OPENAI_API_KEY"];
  if (!openaiApiKey) {
    throw new Error(
      `OpenAI API key env var ${config.raw.env?.openaiApiKey ?? "OPENAI_API_KEY"} is not set`,
    );
  }

  const model = openai(modelId, { apiKey: openaiApiKey });

  return new ToolLoopAgent({
    model,
    instructions: buildSystemPrompt(config),
    allowSystemInMessages: true,
    tools,
    maxOutputTokens: config.raw.maxOutputTokens,
    stopWhen: stepCountIs(config.raw.maxRounds),
    providerOptions: {
      openai: {
        parallelToolCalls: false,
      },
    },
  });
}
