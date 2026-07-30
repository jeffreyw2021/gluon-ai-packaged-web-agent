import { defineConfig } from "tsup";

const serverExternal = [
  "next",
  "react",
  "react-dom",
  "server-only",
  "@prisma/client",
  "bullmq",
  "ioredis",
  "redis",
  // Optional auth peer-deps — resolved from the user's node_modules at runtime
  "next-auth",
  "@clerk/nextjs",
  "@clerk/nextjs/server",
];

const clientExternal = ["next", "react", "react-dom", "server-only"];

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: clientExternal,
  },
  {
    entry: { react: "src/react/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    external: clientExternal,
    esbuildOptions(options) {
      options.banner = { js: '"use client";' };
    },
  },
  {
    entry: { routes: "src/routes/index.ts" },
    // CJS-only: routes are always required via serverExternalPackages in Next.js
    format: ["cjs"],
    dts: true,
    sourcemap: true,
    external: serverExternal,
  },
  {
    entry: { tool: "src/tool.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    external: clientExternal,
  },
  {
    entry: { server: "src/server/index.ts" },
    // CJS-only: server code uses __dirname for dynamic Prisma require path
    format: ["cjs"],
    dts: true,
    sourcemap: true,
    external: serverExternal,
  },
  {
    entry: { instrumentation: "src/register.ts" },
    // Build both ESM and CJS — Next.js instrumentation.ts is processed as ESM by Turbopack
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    external: serverExternal,
  },
  {
    entry: { cli: "src/cli/index.ts" },
    format: ["cjs"],
    dts: true,
    sourcemap: false,
    external: [...serverExternal, "node:fs", "node:path"],
  },
]);
