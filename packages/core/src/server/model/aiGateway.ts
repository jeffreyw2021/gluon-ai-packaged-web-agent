
import { createGateway } from "ai";
export type AiGatewaySdk = ReturnType<typeof createGateway>;

/**
 * Return the Vercel AI Gateway key, or null if none is configured.
 *
 * Checks (in order):
 *   1. VERCEL_AI_GATEWAY_API_KEY — standard Vercel name
 *   2. AI_GATEWAY_API_KEY        — alternate name used by some AI SDK docs
 *
 * NOTE: A plain OPENAI_API_KEY is NOT a valid gateway key — Vercel Gateway
 * has its own auth and rejects direct provider keys. See resolveModel.ts
 * for the OPENAI_API_KEY direct-provider fallback.
 */
export function resolveGatewayKey(): string | null {
  return (
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim() ||
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    null
  );
}

let cachedGateway: AiGatewaySdk | null = null;

/**
 * Singleton gateway client. Throws if no gateway key is configured.
 * Call `invalidateGatewayCache()` (e.g. in tests) to force a new instance.
 */
export function getAiGateway(): AiGatewaySdk {
  if (!cachedGateway) {
    const apiKey = resolveGatewayKey();
    if (!apiKey) {
      throw new Error(
        "[gluon-ai] VERCEL_AI_GATEWAY_API_KEY is not set. " +
          "Set it to use the AI Gateway, or use OPENAI_API_KEY alone to route " +
          "openai/* models directly without the gateway.",
      );
    }
    const baseURL = process.env.AI_GATEWAY_URL?.trim();
    cachedGateway = createGateway(baseURL ? { apiKey, baseURL } : { apiKey });
  }
  return cachedGateway;
}

export function invalidateGatewayCache(): void {
  cachedGateway = null;
}
