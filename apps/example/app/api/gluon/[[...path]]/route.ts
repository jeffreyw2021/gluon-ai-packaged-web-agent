export const dynamic = "force-dynamic";

import { Agent } from "undici";

const UPSTREAM = process.env.GLUON_UPSTREAM_URL ?? "http://localhost:3001";

// Shared agent with no body timeout so long-lived SSE connections are never
// cut by undici's default 5-minute bodyTimeout. The request AbortSignal still
// handles cleanup when the browser disconnects.
const noTimeoutAgent = new Agent({ bodyTimeout: 0 });

async function proxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\/api\/gluon/, "");
  const upstream = await fetch(`${UPSTREAM}${pathname}${url.search}`, {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    // @ts-expect-error — duplex required for streaming request bodies in Node.js
    duplex: "half",
    signal: req.signal,
    dispatcher: noTimeoutAgent,
  });
  // Pipe upstream.body as a ReadableStream — never buffers, so SSE deltas
  // flow to the browser in real time instead of appearing all at once.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as DELETE,
  proxy as PUT,
  proxy as PATCH,
};
