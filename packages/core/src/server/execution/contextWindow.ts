import { generateText, type UIMessage } from "ai";
import type { AgentConfig } from "../../config/schema";
import { resolveLanguageModel } from "../model/registry";

// ── Token estimation ────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 4;

/**
 * Rough token estimate — JSON-serialized character count divided by 4.
 * Accurate enough for budget gating; exact tokenization happens provider-side.
 */
export function estimateContextSize(messages: UIMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += JSON.stringify(msg).length;
  }
  return Math.ceil(total / CHARS_PER_TOKEN);
}

// ── Per-model budget inference ───────────────────────────────────────────────

const MODEL_BUDGET_RULES: Array<[RegExp, number]> = [
  [/^(anthropic\/|gateway\/anthropic\/)/i, 160_000],
  [/^(openai\/gpt-4|gateway\/openai\/gpt-4)/i, 100_000],
  [/^(google\/|gateway\/google\/)/i, 120_000],
];

const DEFAULT_BUDGET = 200_000;

/**
 * Infers a sensible token budget from a model name when none is configured.
 * Matches provider prefix patterns; falls back to 80 000 for unknown models.
 */
export function inferTokenBudget(modelName: string): number {
  for (const [pattern, budget] of MODEL_BUDGET_RULES) {
    if (pattern.test(modelName)) return budget;
  }
  return DEFAULT_BUDGET;
}

// ── Split-point detection ────────────────────────────────────────────────────

// Reserve headroom so the summary message itself plus a few tool responses
// never push the compressed context over the budget.
const SUMMARY_HEADROOM = 2_500;

/**
 * Finds the index at which to split the history so that messages from that
 * index onward fit within (budget - headroom). Returns 0 when the full
 * conversation already fits — meaning no compression is needed.
 *
 * Always keeps at least `minTail` recent messages in the tail so the agent
 * retains immediate context even when the whole history is over budget.
 */
export function measureTailFit(
  messages: UIMessage[],
  budget: number,
  minTail: number,
): number {
  const effectiveBudget = budget - SUMMARY_HEADROOM;
  let tailTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    tailTokens += Math.ceil(JSON.stringify(messages[i]).length / CHARS_PER_TOKEN);
    if (tailTokens > effectiveBudget) {
      // i+1 is the first index that makes the tail fit; clamp so that
      // at least minTail messages are always kept in the tail.
      const naiveSplit = i + 1;
      const maxAllowedSplit = Math.max(messages.length - minTail, 1);
      return Math.min(naiveSplit, maxAllowedSplit);
    }
  }

  return 0; // full conversation fits — nothing to compress
}

// ── Summary generation ───────────────────────────────────────────────────────

const SUMMARY_SYSTEM_PROMPT = `\
You are a precise summarizer. Condense the conversation below into a dense summary.
Preserve: the user's goal, any decisions made, specific values (names, IDs, numbers, URLs),
the current task state, and any open or pending actions.
Write in third person. Every sentence must carry information — no filler.`;

export const CTX_SNAPSHOT_ID = "gluon-ctx-snapshot";
const CTX_SNAPSHOT_PREFIX = "[Summarized]\n\n";

/**
 * Calls the summary model to produce a compact UIMessage that replaces the
 * old portion of the conversation. The message has role "system" and a fixed
 * id (`gluon-ctx-snapshot`) so callers can detect existing snapshots.
 */
export async function buildContextSummary(
  toSummarize: UIMessage[],
  modelId: string,
  env: AgentConfig["env"],
  maxTokens: number,
): Promise<UIMessage> {
  const transcript = toSummarize
    .map((m) => {
      const textParts = (m.parts ?? [])
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n");
      return `${m.role}: ${textParts || "(non-text content)"}`;
    })
    .join("\n\n");

  const model = resolveLanguageModel(modelId, env);
  const { text } = await generateText({
    model,
    system: SUMMARY_SYSTEM_PROMPT,
    prompt: transcript,
    maxTokens,
  });

  return {
    id: CTX_SNAPSHOT_ID,
    role: "system" as const,
    parts: [{ type: "text", text: CTX_SNAPSHOT_PREFIX + text }],
    createdAt: new Date(),
  } as UIMessage;
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export interface CompressContextResult {
  /** Messages ready to send to the agent (possibly with a summary prefix). */
  agentMessages: UIMessage[];
  /** True when compression was applied this call. */
  wasCompressed: boolean;
  /**
   * Index into the original `messages` array where the split occurred.
   * `messages[0..splitIndex)` were condensed; `messages[splitIndex..]` are
   * the recent tail. Always 0 when `wasCompressed` is false.
   */
  splitIndex: number;
}

export interface CompressContextOpts {
  /**
   * When `true`, bypass the budget check and compress regardless of
   * conversation size. The split keeps at least `minTailMessages` recent
   * messages. Useful for on-demand user-triggered summarization.
   */
  force?: boolean;
}

/**
 * Compresses the conversation history when it exceeds the configured token
 * budget. Old messages are replaced by a compact system summary; recent
 * messages are kept intact. The full history in the database is never
 * modified by this function — only the slice sent to the model is altered.
 *
 * Returns `wasCompressed: false` when the conversation fits within budget
 * or when context window config is absent (compression disabled).
 *
 * Pass `opts.force = true` to bypass the budget check and always compress
 * (e.g. when the user explicitly triggers on-demand summarization).
 */
export async function compressContext(
  messages: UIMessage[],
  config: AgentConfig,
  opts?: CompressContextOpts,
): Promise<CompressContextResult> {
  const cwConfig = config.contextWindow;

  const budget =
    cwConfig?.tokenBudget ?? inferTokenBudget(config.model);
  const minTail = cwConfig?.minTailMessages ?? 8;
  const summaryMaxTokens = cwConfig?.summaryMaxTokens ?? 1024;
  const summaryModelId = cwConfig?.summaryModel ?? config.model;

  let splitIndex: number;

  if (opts?.force) {
    // Forced compression: split so at least minTail messages are kept.
    // Require at least 2 messages total (one to summarize, one to keep).
    const forcedSplit = Math.max(messages.length - minTail, 1);
    if (forcedSplit <= 0 || messages.length < 2) {
      return { agentMessages: messages, wasCompressed: false, splitIndex: 0 };
    }
    splitIndex = forcedSplit;
  } else {
    const estimated = estimateContextSize(messages);
    if (estimated <= budget) {
      return { agentMessages: messages, wasCompressed: false, splitIndex: 0 };
    }

    splitIndex = measureTailFit(messages, budget, minTail);
    if (splitIndex === 0) {
      return { agentMessages: messages, wasCompressed: false, splitIndex: 0 };
    }
  }

  const summary = await buildContextSummary(
    messages.slice(0, splitIndex),
    summaryModelId,
    config.env,
    summaryMaxTokens,
  );

  return {
    agentMessages: [summary, ...messages.slice(splitIndex)],
    wasCompressed: true,
    splitIndex,
  };
}
