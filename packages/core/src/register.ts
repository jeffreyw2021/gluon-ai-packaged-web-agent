/**
 * Next.js instrumentation hook entry point.
 *
 * Usage — add ONE line to your project's instrumentation.ts:
 *
 *   export { register } from "gluon-ai/instrumentation";
 *
 * Next.js calls register() once at server startup (Node.js runtime only).
 * This starts the BullMQ agent worker process.
 *
 * Implementation note: we intentionally use createRequire() + the CJS server
 * bundle (dist/server.js) instead of a bare ESM dynamic import of the worker.
 * The ESM worker chunk contains many top-level `import "server-only"` statements.
 * When Turbopack's module runtime traces those imports it applies its browser
 * export conditions, which causes server-only to throw — even though we are
 * running on the Node.js server.  CJS require() bypasses that analysis path.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    // dist/server.js is the CJS-only bundle that contains startAgentWorker.
    // Resolved relative to this file (dist/instrumentation.*).
    const { startAgentWorker } = req("./server.js") as {
      startAgentWorker: () => void;
    };
    startAgentWorker();
  }
}
