
import type { LanguageModel } from "ai";
import { resolveGatewayKey, getAiGateway } from "./aiGateway";

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
 * Resolve a model id string to an AI SDK LanguageModel.
 *
 * Resolution strategy:
 *   1. If VERCEL_AI_GATEWAY_API_KEY (or AI_GATEWAY_API_KEY) is set →
 *      route all providers through the Vercel AI Gateway.
 *   2. Otherwise, for "openai/*" models → use @ai-sdk/openai directly
 *      with OPENAI_API_KEY. This is the backward-compatible path for
 *      users who only have an OpenAI key.
 *   3. Other providers without a gateway key → throw a clear error.
 *
 * @example
 *   getLanguageModel("openai/gpt-4o")
 *   getLanguageModel("anthropic/claude-sonnet-4.6") // requires gateway key
 *   getLanguageModel("gpt-4o")  // backward compat — treated as openai/gpt-4o
 */
export function getLanguageModel(modelId: string): LanguageModel {
  const normalized = normalizeModelId(modelId);
  const provider = modelProvider(normalized);

  // Gateway path: VERCEL_AI_GATEWAY_API_KEY (or AI_GATEWAY_API_KEY) is set
  if (resolveGatewayKey()) {
    return getAiGateway()(normalized) as LanguageModel;
  }

  // Direct OpenAI fallback: no gateway key but OPENAI_API_KEY is present
  if (provider === "openai") {
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (!openaiKey) {
      throw new Error(
        "[gluon-ai] Neither VERCEL_AI_GATEWAY_API_KEY nor OPENAI_API_KEY is set. " +
          "Set one of them to run the agent.",
      );
    }
    // Dynamic import so @ai-sdk/openai stays an optional peer when using gateway
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createOpenAI } = require("@ai-sdk/openai") as typeof import("@ai-sdk/openai");
    const openai = createOpenAI({ apiKey: openaiKey });
    const modelName = normalized.slice("openai/".length);
    return openai(modelName) as LanguageModel;
  }

  // Non-OpenAI provider without a gateway key
  throw new Error(
    `[gluon-ai] Model "${normalized}" requires VERCEL_AI_GATEWAY_API_KEY. ` +
      "Set it to use providers other than OpenAI.",
  );
}
