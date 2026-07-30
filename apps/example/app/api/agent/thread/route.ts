import { createThreadHandler } from "easy-setup-web-agent/routes";

const handler = createThreadHandler();
export const GET = handler.GET;
