import * as fs from "node:fs";
import * as path from "node:path";
import { exists, log } from "./utils";
import type { ScanResult } from "./scanner";

/**
 * Scaffold a Next.js App Router catch-all route that streams responses from
 * the Gluon server without buffering. Uses an undici Agent with bodyTimeout:0
 * so SSE connections are never cut by the default 5-minute timeout.
 * Returns true if the route was created or already existed.
 */
export function scaffoldNextProxyRoute(root: string, port: number): boolean {
  const appRouterDir = exists(path.join(root, "src", "app"))
    ? "src/app"
    : "app";
  const routeDir = path.join(root, appRouterDir, "api", "gluon", "[[...path]]");
  const routePath = path.join(routeDir, "route.ts");

  if (exists(routePath)) {
    log("skip", `${appRouterDir}/api/gluon/[[...path]]/route.ts (already exists)`);
    return true;
  }

  const upstream = `http://localhost:${port}`;
  const template = `export const dynamic = "force-dynamic";

import { Agent } from "undici";

const UPSTREAM = process.env.GLUON_UPSTREAM_URL ?? "${upstream}";

// Shared agent with no body timeout so long-lived SSE connections are never
// cut by undici's default 5-minute bodyTimeout. The request AbortSignal still
// handles cleanup when the browser disconnects.
const noTimeoutAgent = new Agent({ bodyTimeout: 0 });

async function proxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/^\\/api\\/gluon/, "");
  const upstream = await fetch(\`\${UPSTREAM}\${pathname}\${url.search}\`, {
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
`;

  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(routePath, template, "utf-8");
  log("write", `${appRouterDir}/api/gluon/[[...path]]/route.ts`);
  return true;
}

/**
 * Apply same-origin proxy config automatically where possible, otherwise
 * print manual instructions.
 * Returns the basePath to use in GluonAgentPanel.
 */
export function applyProxyConfig(
  framework: ScanResult["hostFramework"],
  root: string,
  port: number,
): string {
  if (!framework) return `http://localhost:${port}`;

  let patched = false;

  if (framework === "nextjs") {
    patched = scaffoldNextProxyRoute(root, port);
  }

  if (patched) {
    return "/api/gluon";
  }

  console.log("  ── Same-origin proxy (recommended) ─────────────────────────\n");
  console.log(
    "  Point your frontend at /api/gluon (no CORS) instead of the\n" +
      `  container directly (http://localhost:${port}).\n`,
  );

  if (framework === "nextjs") {
    console.log(
      "  Create src/app/api/gluon/[[...path]]/route.ts with a streaming proxy.",
    );
    console.log("  See: https://github.com/gluon-ai/gluon-ai#nextjs-proxy\n");
  } else if (framework === "vite") {
    console.log("  In vite.config.ts → server.proxy:");
    console.log(`
    server: {
      proxy: { '/api/gluon': { target: 'http://localhost:${port}', changeOrigin: true } }
    }
`);
  } else if (framework === "remix") {
    console.log(
      "  Add a Remix resource route at app/routes/api.gluon.$.ts\n" +
        `  that proxies to http://localhost:${port}.\n`,
    );
  } else if (framework === "sveltekit") {
    console.log("  In vite.config.ts → server.proxy:");
    console.log(`
    server: {
      proxy: { '/api/gluon': { target: 'http://localhost:${port}', changeOrigin: true } }
    }
`);
  }

  return "/api/gluon";
}
