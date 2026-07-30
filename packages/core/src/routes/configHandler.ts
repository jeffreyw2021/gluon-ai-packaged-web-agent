
import { loadConfig } from "../config/loader";
import { apiSuccess, handleRouteError } from "../AgentError";
import type { ToolUI } from "../tool";

/** UI hints for built-in tools that aren't user-defined ToolDefinitions. */
const INTERNAL_TOOL_UI: Record<string, ToolUI> = {
  discover_tools: {
    executingLabel: "Checking tools",
    completedLabel: "Tools ready",
    icon: "Search",
  },
};

/**
 * GET /api/gluon-ai/config
 *
 * Returns client-safe values from `agent.config.json` that the React
 * provider needs at runtime (e.g. suggestedPrompts, toolUi). Never exposes
 * secrets or server-only fields.
 */
export function createConfigHandler() {
  return {
    GET: async (_req: Request): Promise<Response> => {
      try {
        const config = await loadConfig();

        // Collect UI hints from user-defined tools
        const toolUi: Record<string, ToolUI> = { ...INTERNAL_TOOL_UI };
        for (const [name, def] of Object.entries(config.tools)) {
          if (def.ui) toolUi[name] = def.ui;
        }

        return apiSuccess({
          suggestedPrompts: config.raw.suggestedPrompts ?? [],
          toolUi,
        });
      } catch (err) {
        return handleRouteError(err);
      }
    },
  };
}
