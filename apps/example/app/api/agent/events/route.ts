import { createEventsHandler } from "easy-setup-web-agent/routes";

const handler = createEventsHandler();
export const GET = handler.GET;
export const dynamic = "force-dynamic";
