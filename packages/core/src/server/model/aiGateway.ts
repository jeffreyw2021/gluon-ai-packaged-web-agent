
import { createGateway } from "ai";
export type AiGatewaySdk = ReturnType<typeof createGateway>;

/**
 * Resolve the gateway API key.
 *
 * Priority:
 *   1. VERCEL_AI_GATEWAY_API_KEY  – dedicated gateway key (preferred)
 *   2. OPENAI_API_KEY             – OpenAI key also accepted by the gateway as a fallback
 *
 * Works without deploying on Vercel — just set whichever key you have.
 */
function resolveApiKey(): string {
  const gatewayKey = process.env.VERCEL_AI_GATEWAY_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const key = gatewayKey || openaiKey;
  if (!key) {
    throw new Error(
      "[gluon-ai] No AI provider key found. Set VERCEL_AI_GATEWAY_API_KEY " +
        "(recommended) or OPENAI_API_KEY in your environment.",
    );
  }
  return key;
}

let cachedGateway: AiGatewaySdk | null = null;

/**
 * Singleton gateway client for all server-side model calls.
 *
 * Options are fixed at first use for the process lifetime.
 * Call `invalidateGatewayCache()` (e.g. in tests) to force a new instance.
 */
export function getAiGateway(): AiGatewaySdk {
  if (!cachedGateway) {
    const apiKey = resolveApiKey();
    const baseURL = process.env.AI_GATEWAY_URL?.trim();
    cachedGateway = createGateway(baseURL ? { apiKey, baseURL } : { apiKey });
  }
  return cachedGateway;
}

export function invalidateGatewayCache(): void {
  cachedGateway = null;
}

