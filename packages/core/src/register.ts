/**
 * Next.js instrumentation hook entry point.
 *
 * Usage — add ONE line to your project's instrumentation.ts:
 *
 *   export { register } from "gluon-ai/instrumentation";
 *
 * Next.js calls register() once at server startup (Node.js runtime only).
 * This starts the BullMQ agent worker process.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // dist/server.js lives next to dist/instrumentation.mjs; Node.js resolves it
    // at runtime after gluon-ai is loaded from node_modules by serverExternalPackages.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – tsup marks "./server.js" external so this resolves at runtime, not build-time
    const { startAgentWorker } = await import("./server.js") as {
      startAgentWorker: () => void;
    };
    startAgentWorker();
  }
}
