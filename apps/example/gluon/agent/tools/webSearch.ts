import { defineTool } from "gluon-ai";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// ── Web search — OpenAI built-in web search ───────────────────────────────
// Uses OpenAI's native web_search tool via the Responses API.
// No extra API key needed — uses the same OPENAI_API_KEY as the agent.

export default defineTool({
  description:
    "Search the web for current, real-time information. Use for recent news, " +
    "current events, prices, or anything that may have changed since your training cutoff.",
  inputSchema: z.object({
    query: z.string().describe("The search query — be specific."),
  }),
  execute: async ({ query }) => {
    const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { text, sources } = await generateText({
      model: provider.responses("gpt-4o-mini"),
      tools: { web_search: provider.tools.webSearch() },
      prompt: query,
    });
    return {
      summary: text,
      citations: (sources ?? []).map((s) => ({ title: s.title ?? "", url: s.url })),
    };
  },
});
