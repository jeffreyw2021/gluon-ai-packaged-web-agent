import { createProviderRegistry, createGateway, type LanguageModel } from "ai";
import type { AgentConfig } from "../../config/schema";

type EnvConfig = NonNullable<AgentConfig["env"]>;

// [id, npm-package, env-config-key, default-env-var, factory-function-name]
const OPTIONAL_PROVIDERS = [
  ["openai", "@ai-sdk/openai", "openaiApiKey", "OPENAI_API_KEY", "createOpenAI"],
  ["anthropic", "@ai-sdk/anthropic", "anthropicApiKey", "ANTHROPIC_API_KEY", "createAnthropic"],
  ["google", "@ai-sdk/google", "googleApiKey", "GOOGLE_GENERATIVE_AI_API_KEY", "createGoogleGenerativeAI"],
  ["mistral", "@ai-sdk/mistral", "mistralApiKey", "MISTRAL_API_KEY", "createMistral"],
  ["groq", "@ai-sdk/groq", "groqApiKey", "GROQ_API_KEY", "createGroq"],
  ["xai", "@ai-sdk/xai", "xaiApiKey", "XAI_API_KEY", "createXai"],
  ["deepseek", "@ai-sdk/deepseek", "deepseekApiKey", "DEEPSEEK_API_KEY", "createDeepSeek"],
] as const;

let _registry: ReturnType<typeof createProviderRegistry> | null = null;
let _envSnapshot: string | null = null;

function resolveEnvValue(envConfig: EnvConfig | undefined, key: string, defaultVar: string): string | undefined {
  const varName = (envConfig as Record<string, string> | undefined)?.[key] ?? defaultVar;
  return process.env[varName] || undefined;
}

/**
 * Builds (and caches) a createProviderRegistry instance from whichever
 * provider packages are installed and whichever API keys are set in the
 * process environment.
 *
 * Called at most once per unique envConfig shape; the singleton is reused on
 * subsequent calls so provider instances are not recreated on every request.
 */
export function buildProviderRegistry(envConfig?: EnvConfig): ReturnType<typeof createProviderRegistry> {
  const snapshot = JSON.stringify(envConfig ?? {});
  if (_registry && _envSnapshot === snapshot) return _registry;

  const providers: Record<string, unknown> = {};

  // All providers are registered the same way — try/require the optional package if installed and key is set
  for (const [id, pkg, envKey, defaultVar, factoryName] of OPTIONAL_PROVIDERS) {
    const key = resolveEnvValue(envConfig, envKey, defaultVar);
    if (!key) continue;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(pkg) as Record<string, ((opts: { apiKey: string }) => unknown) | undefined>;
      const factory = mod[factoryName];
      if (typeof factory === "function") providers[id] = factory({ apiKey: key });
    } catch {
      // Package not installed in host app — skip silently
    }
  }

  // Vercel AI Gateway — registered when AI_GATEWAY_API_KEY (or override) is set.
  // Use "gateway/provider/model" as the model string to route through the gateway.
  const gatewayKey = resolveEnvValue(envConfig, "aiGatewayApiKey", "AI_GATEWAY_API_KEY");
  if (gatewayKey) {
    providers["gateway"] = createGateway({ apiKey: gatewayKey });
  }

  _registry = createProviderRegistry(
    providers as Parameters<typeof createProviderRegistry>[0],
    { separator: "/" },
  );
  _envSnapshot = snapshot;
  return _registry;
}

/**
 * Resolves a `provider/model` string (e.g. `"openai/gpt-4o"`,
 * `"anthropic/claude-sonnet-4.6"`, `"gateway/openai/gpt-4o"`) to a
 * LanguageModel via the provider registry.
 *
 * Model IDs must include a provider prefix (e.g. `"openai/gpt-4o"`).
 */
export function resolveLanguageModel(modelId: string, envConfig?: EnvConfig): LanguageModel {
  return buildProviderRegistry(envConfig).languageModel(modelId as `${string}/${string}`);
}
