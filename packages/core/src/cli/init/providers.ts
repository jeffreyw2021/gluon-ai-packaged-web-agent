export const PROVIDERS = [
  {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    configKey: "openaiApiKey",
    // o4-mini uses the Responses API and requires reasoning items on multi-turn
    // calls, which gluon-ai's message history doesn't store. Use gpt-4o-mini
    // (Chat Completions API) which works correctly across all conversation rounds.
    defaultModel: "openai/gpt-4o-mini",
    sdkPackage: "@ai-sdk/openai",
    // @ai-sdk/openai@4+ switched to Responses-API spec v4, which is incompatible
    // with the ai@6.x (AI SDK 5) bundled inside gluon-ai. Pin to ^3.
    sdkVersion: "3",
  },
  {
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    configKey: "anthropicApiKey",
    defaultModel: "anthropic/claude-sonnet-4-5",
    sdkPackage: "@ai-sdk/anthropic",
    sdkVersion: "4",
  },
  {
    label: "Google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    configKey: "googleApiKey",
    defaultModel: "google/gemini-2.0-flash",
    sdkPackage: "@ai-sdk/google",
    sdkVersion: "4",
  },
  {
    label: "Other / configure manually",
    envKey: "",
    configKey: "",
    defaultModel: "openai/o4-mini",
    sdkPackage: "",
    sdkVersion: "",
  },
] as const;

export interface Answers {
  providerIndex: number;
  model: string;
  port: number;
  runMode: "docker" | "nodejs";
}
