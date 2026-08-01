
import { generateText, type UIMessage } from "ai";
import { getLanguageModel, normalizeModelId } from "../model/resolveModel";
import { chatRepository } from "../db/repositories/chatRepository";
import { getDb } from "../db/adapterRegistry";
import { redisLiveBus } from "../live/RedisLiveBus";

// ── Context extraction ────────────────────────────────────────────────────────

/**
 * Build a compact conversation context string from stored messages for
 * feeding to the title model. Includes the first user + assistant exchange,
 * capped at 600 chars so the prompt stays cheap.
 */
function extractContextText(messages: UIMessage[]): string {
  const lines: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    const text = (msg.parts ?? [])
      .filter((p) => p.type === "text" && "text" in p)
      .map((p) => ("text" in p ? String(p.text) : ""))
      .join(" ")
      .trim();
    if (text) lines.push(`${msg.role}: ${text}`);
    // First exchange (one user + one assistant) is enough context
    if (lines.length >= 4) break;
  }
  return lines.join("\n").slice(0, 600);
}

// ── Title generation ──────────────────────────────────────────────────────────

const TITLE_SYSTEM_PROMPT =
  "You output only a short chat thread title — at most 5 words. " +
  "No quotes, no colon prefix, no trailing punctuation.";

async function generateTitle(
  contextText: string,
  modelId: string,
): Promise<string | null> {
  const normalizedId = normalizeModelId(modelId);
  const model = getLanguageModel(normalizedId);
  const { text } = await generateText({
    model,
    system: TITLE_SYSTEM_PROMPT,
    prompt: contextText,
    maxOutputTokens: 20,
  });
  const title = text?.trim().split(/\s+/).slice(0, 5).join(" ");
  return title || null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ScheduleChatTitleOptions {
  /** Model ID to use for title generation (e.g. "openai/gpt-4o-mini"). */
  modelId?: string;
}

/**
 * Fire-and-forget title generation triggered after a job completes.
 * - Skips if the chat already has a custom title.
 * - Uses a small non-streaming LLM call with the first exchange as context.
 * - Persists the generated title and publishes a `chat.updated` SSE event.
 */
export function scheduleChatTitleGeneration(
  chatId: string,
  userId: string,
  options: ScheduleChatTitleOptions = {},
): void {
  void (async () => {
    const titleRow = await chatRepository.findTitleForChat(chatId);
    if (titleRow?.title !== "New Chat") return;

    const raw = await getDb().chat.loadMessages(chatId);
    const messages = (Array.isArray(raw) ? raw : []) as UIMessage[];

    const contextText = extractContextText(messages);
    if (!contextText.trim()) return;

    const modelId = options.modelId ?? "openai/gpt-4o-mini";

    const title = await generateTitle(contextText, modelId).catch(
      (err) => {
        console.error("[titleService] generation failed:", err);
        return null;
      },
    );
    if (!title) return;

    await chatRepository.updateTitle(chatId, title);

    await redisLiveBus.publishUserChatListEvent(userId, {
      type: "chat.updated",
      chat: {
        id: chatId,
        title,
        userId,
        activeJobRunId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  })().catch((err) => {
    console.error("[scheduleChatTitleGeneration] failed:", err);
  });
}
