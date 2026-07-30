import { createChatCrudHandlers } from "easy-setup-web-agent/routes";

const handlers = createChatCrudHandlers();
export const GET = handlers.list;
export const POST = handlers.create;
export const DELETE = handlers.delete;
