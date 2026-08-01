import * as path from "node:path";

/**
 * `gluon-ai start` — boot the standalone Hono server + BullMQ worker.
 *
 * Called by CMD in the scaffolded Dockerfile.
 * Also works directly on bare metal / VMs via pm2: `pm2 start "gluon-ai start"`.
 *
 * __dirname in the compiled dist/cli.js is the dist/ folder, so "app.js"
 * resolves to the sibling dist/app.js produced by the `app` tsup entry.
 */
export function startCommand(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(path.resolve(__dirname, "app.js"));
}
