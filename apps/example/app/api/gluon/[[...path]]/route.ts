export const dynamic = "force-dynamic";

const UPSTREAM = process.env.GLUON_UPSTREAM_URL ?? "http://localhost:3001";

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
