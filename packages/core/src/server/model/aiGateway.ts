
import { createGateway } from "ai";
export type AiGatewaySdk = ReturnType<typeof createGateway>;

/**
 * Return the Vercel AI Gateway key, or null if none is configured.
 * Checks VERCEL_AI_GATEWAY_API_KEY, then AI_GATEWAY_API_KEY.
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
 * Singleton gateway client. Throws if VERCEL_AI_GATEWAY_API_KEY is not set.
 * Call `invalidateGatewayCache()` (e.g. in tests) to force a new instance.
 */
export function getAiGateway(): AiGatewaySdk {
  if (!cachedGateway) {
    const apiKey = resolveGatewayKey();
    if (!apiKey) {
      throw new Error(
        "[gluon-ai] VERCEL_AI_GATEWAY_API_KEY is not set. " +
          "Add it to your .env.local — see https://vercel.com/docs/ai-gateway.",
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
