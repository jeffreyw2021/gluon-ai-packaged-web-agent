
import { createCommandsHandler } from "./commandsHandler";
import { createEventsHandler } from "./eventsHandler";
import { createThreadHandler } from "./threadHandler";
import { createChatCrudHandlers } from "./chatCrudHandlers";
import { createConfigHandler } from "./configHandler";

// Create handler instances once at module load time.
const commands = createCommandsHandler();
const events = createEventsHandler();
const thread = createThreadHandler();
const chats = createChatCrudHandlers();
const configHandler = createConfigHandler();

/**
 * Extracts the last path segment from the request URL.
 *
 * With a Next.js `[[...path]]` catch-all route at `/api/gluon-ai/[[...path]]`,
 * requests arrive as:
 *   GET /api/gluon-ai/events   → segment "events"
 *   GET /api/gluon-ai/thread   → segment "thread"
 *   GET /api/gluon-ai/chats    → segment "chats"
 *   POST /api/gluon-ai/commands → segment "commands"
 *   POST /api/gluon-ai/chats   → segment "chats"
 *   DELETE /api/gluon-ai/chats → segment "chats"
 */
function routeSegment(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export async function GET(req: Request): Promise<Response> {
  switch (routeSegment(req)) {
    case "events":
      return events.GET(req);
    case "thread":
      return thread.GET(req);
    case "chats":
      return chats.list(req);
    case "config":
      return configHandler.GET(req);
    default:
      return new Response("Not Found", { status: 404 });
  }
}

export async function POST(req: Request): Promise<Response> {
  switch (routeSegment(req)) {
    case "commands":
      return commands.POST(req);
    case "chats":
      return chats.create(req);
    default:
      return new Response("Not Found", { status: 404 });
  }
}

export async function DELETE(req: Request): Promise<Response> {
  switch (routeSegment(req)) {
    case "chats":
      return chats.delete(req);
    default:
      return new Response("Not Found", { status: 404 });
  }
}
