// Unified catch-all handler — re-export these from a single Next.js route file:
//
//   // src/app/api/gluon-ai/[[...path]]/route.ts
//   export { GET, POST, DELETE } from "gluon-ai/routes";
//   export const dynamic = "force-dynamic";
//
// The router dispatches by the last URL path segment (events, thread, chats, commands).
export { GET, POST, DELETE } from "./agentRouter";

// Individual handler factories are also exported for advanced use cases
// where you want to mount routes yourself.
export { createCommandsHandler } from "./commandsHandler";
export { createEventsHandler } from "./eventsHandler";
export { createThreadHandler } from "./threadHandler";
export { createChatCrudHandlers } from "./chatCrudHandlers";
