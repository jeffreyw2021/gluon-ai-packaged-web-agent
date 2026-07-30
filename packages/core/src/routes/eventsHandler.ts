
import { loadConfig } from "../config/loader";
import { subscribeLiveEvents } from "../server/live/subscribeLiveEvents";
import { chatJobRunRepository } from "../server/db/repositories/chatJobRunRepository";
import { readStreamingSnapshot } from "../server/thread/StreamingCheckpointStore";
import { AgentError, handleRouteError } from "../AgentError";

export function createEventsHandler() {
  return {
    GET: async (req: Request): Promise<Response> => {
      try {
        const config = await loadConfig();
        const userId = await config.auth.getUserId(req);
        if (!userId) {
          throw AgentError.unauthorized("Authentication required");
        }

        const url = new URL(req.url);
        const chatId = url.searchParams.get("chatId");
        const runId = url.searchParams.get("runId");
        const cursor = url.searchParams.get("cursor") ?? undefined;

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            const writeEvent = (data: unknown) => {
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
                );
              } catch {
                // client disconnected
              }
            };

            try {
              const sub = await subscribeLiveEvents({
                scope: runId ? "run" : "user",
                userId,
                runId: runId ?? undefined,
                replay: cursor,
              });

              req.signal.addEventListener("abort", () => {
                sub.close().catch(() => undefined);
                controller.close();
              });

              writeEvent({ type: "connected", userId });

              if (chatId) {
                const activeRun = await chatJobRunRepository.findActiveForChat(chatId);
                if (activeRun) {
                  const snapshot = await readStreamingSnapshot(activeRun.id);
                  if (snapshot) {
                    writeEvent({ type: "streaming.snapshot", chatId, runId: activeRun.id, snapshot });
                  }
                }
              }

              // Drain the async iterable
              for await (const event of sub.events) {
                writeEvent(event);
              }
              controller.close();
            } catch (err) {
              writeEvent({ type: "error", message: err instanceof Error ? err.message : "SSE init failed" });
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-store",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      } catch (err) {
        return handleRouteError(err);
      }
    },
  };
}
