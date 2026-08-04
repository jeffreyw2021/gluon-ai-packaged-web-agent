import * as path from "node:path";
import { exists, read } from "./utils";

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

export interface ScanResult {
  root: string;
  packageManager: PackageManager;
  /** Detected host framework for printing the proxy snippet */
  hostFramework: "nextjs" | "vite" | "remix" | "sveltekit" | null;
  /** Whether gluon/ folder already exists */
  alreadyInitialized: boolean;
}

export function scanProject(root: string): ScanResult {
  let packageManager: PackageManager = "npm";
  const pkgPath = path.join(root, "package.json");
  if (exists(pkgPath)) {
    const pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
    if (typeof pkg.packageManager === "string") {
      const pm = pkg.packageManager;
      if (pm.startsWith("pnpm")) packageManager = "pnpm";
      else if (pm.startsWith("yarn")) packageManager = "yarn";
      else if (pm.startsWith("bun")) packageManager = "bun";
    }
  }
  if (exists(path.join(root, "pnpm-workspace.yaml"))) packageManager = "pnpm";
  if (exists(path.join(root, "yarn.lock"))) packageManager = "yarn";
  if (exists(path.join(root, "bun.lockb"))) packageManager = "bun";

  let hostFramework: ScanResult["hostFramework"] = null;
  if (
    exists(path.join(root, "next.config.ts")) ||
    exists(path.join(root, "next.config.js")) ||
    exists(path.join(root, "next.config.mjs"))
  ) {
    hostFramework = "nextjs";
  } else if (
    exists(path.join(root, "vite.config.ts")) ||
    exists(path.join(root, "vite.config.js"))
  ) {
    hostFramework = "vite";
  } else if (
    exists(path.join(root, "remix.config.js")) ||
    exists(path.join(root, "remix.config.ts"))
  ) {
    hostFramework = "remix";
  } else if (exists(path.join(root, "svelte.config.js"))) {
    hostFramework = "sveltekit";
  }

  return {
    root,
    packageManager,
    hostFramework,
    alreadyInitialized: exists(path.join(root, "gluon")),
  };
}
