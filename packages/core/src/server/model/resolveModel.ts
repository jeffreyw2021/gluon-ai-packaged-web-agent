
import type { LanguageModel } from "ai";
import { getAiGateway } from "./aiGateway";

/**
 * Normalize a model id to the gateway `provider/model` format.
 *
 * Bare ids (e.g. "gpt-4o") are assumed to be OpenAI models and are
 * rewritten to "openai/gpt-4o" for backward compatibility.
 *
 * @example
 *   normalizeModelId("gpt-4o")                 // "openai/gpt-4o"
 *   normalizeModelId("openai/gpt-4o")           // "openai/gpt-4o"
 *   normalizeModelId("anthropic/claude-sonnet") // "anthropic/claude-sonnet"
 */
export function normalizeModelId(modelId: string): string {
  if (!modelId.includes("/")) return `openai/${modelId}`;
  return modelId;
}

/**
 * Return the provider prefix from a normalized model id (e.g. "openai" from
 * "openai/gpt-4o"). Returns undefined for ids without a slash.
 */
export function modelProvider(normalizedId: string): string | undefined {
  const idx = normalizedId.indexOf("/");
  return idx >= 0 ? normalizedId.slice(0, idx) : undefined;
}

/**
 * Resolve a model id string to an AI SDK LanguageModel via the gateway.
 * Bare ids are normalized to the "openai/…" prefix automatically.
 *
 * @example
 *   getLanguageModel("openai/gpt-4o")
 *   getLanguageModel("anthropic/claude-sonnet-4-6")
 *   getLanguageModel("google/gemini-2.0-flash")
 *   getLanguageModel("gpt-4o")  // backward compat — treated as openai/gpt-4o
 */
export function getLanguageModel(modelId: string): LanguageModel {
  const normalized = normalizeModelId(modelId);
  return getAiGateway()(normalized) as LanguageModel;
}
