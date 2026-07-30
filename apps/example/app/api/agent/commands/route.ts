import { createCommandsHandler } from "easy-setup-web-agent/routes";

const handler = createCommandsHandler();
export const POST = handler.POST;
