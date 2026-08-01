import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { GET, POST, DELETE } from "./routes/agentRouter";
import { startAgentWorker } from "./server/index";

const app = new Hono();
app.use("*", cors({ origin: process.env.GLUON_CORS_ORIGIN ?? "*" }));
app.get("/*", (c) => GET(c.req.raw));
app.post("/*", (c) => POST(c.req.raw));
app.delete("/*", (c) => DELETE(c.req.raw));

startAgentWorker();
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3001) }, (info) => {
  console.log(`[gluon] server running on http://localhost:${info.port}`);
});
