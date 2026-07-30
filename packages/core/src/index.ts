// Public package entry — types + tool helpers only
// (React components live in ./react, server utils in ./server, route factories in ./routes)

export * from "./types/index";
export { AgentError, handleRouteError, apiSuccess } from "./AgentError";
export { defineTool } from "./tool";
export type {
  ToolDefinition,
  ToolUI,
  ActionBlockProps,
  ActionBlockComponent,
  ActionBlockRegistry,
} from "./tool";
