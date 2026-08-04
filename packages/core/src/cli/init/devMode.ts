import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { exists, read, log } from "./utils";
import type { PackageManager } from "./scanner";

/**
 * A docker-compose file that only starts postgres + redis (no gluon container).
 * Used in Node.js process mode so the user can get infra up with one command
 * while running gluon-ai itself as a plain Node process.
 */
export function dockerComposeInfraTemplate(): string {
  return `# Infrastructure only — postgres + redis for Gluon
# Gluon itself runs as a Node.js process alongside your app (via npm run dev).
# Start infra: docker compose -f gluon/docker-compose.infra.yml up -d
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: gluon
      POSTGRES_PASSWORD: gluon
      POSTGRES_DB: gluon
    ports:
      - "5433:5432"          # 5433 on host to avoid clashes with local postgres
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gluon"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:8-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  pg_data:
  redis_data:
`;
}

/**
 * Modifies the host project's package.json to run gluon-ai start alongside
 * the existing dev script using concurrently.
 *
 * Before: "dev": "next dev"
 * After:  "dev:app": "next dev"
 *         "gluon:start": "gluon-ai start"
 *         "dev": "concurrently -n gluon,app -c blue,green \"npm run gluon:start\" \"npm run dev:app\""
 *
 * The original dev command is preserved under "dev:app" so uninstall can
 * restore it cleanly.
 */
export function injectDevScript(root: string, pm: PackageManager): void {
  const pkgPath = path.join(root, "package.json");
  if (!exists(pkgPath)) {
    log("warn", "package.json not found — skipping dev script injection");
    return;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
  } catch {
    log("warn", "Could not parse package.json — skipping dev script injection");
    return;
  }

  const scripts = (pkg.scripts ?? {}) as Record<string, string>;
  const originalDev = scripts["dev"];

  if (!originalDev) {
    log("warn", "No 'dev' script found in package.json — skipping injection");
    return;
  }

  if (
    scripts["gluon:start"] ||
    originalDev.includes("gluon-ai start") ||
    originalDev.includes("gluon:start")
  ) {
    log("skip", "package.json dev script (gluon already injected)");
    return;
  }

  scripts["dev:app"] = originalDev;
  scripts["gluon:start"] =
    "node --env-file=.env ./node_modules/.bin/gluon-ai start";
  scripts["gluon:uninstall"] = "npx gluon-ai uninstall";
  scripts["dev"] = `concurrently -n gluon,app -c blue,green "npm run gluon:start" "npm run dev:app"`;

  pkg.scripts = scripts;

  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  if (!devDeps["concurrently"]) {
    devDeps["concurrently"] = "latest";
    pkg.devDependencies = devDeps;
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  log("write", "package.json — injected gluon:start into dev script");

  const installCmd =
    pm === "pnpm"
      ? "pnpm add -D concurrently"
      : pm === "yarn"
        ? "yarn add -D concurrently"
        : pm === "bun"
          ? "bun add -D concurrently"
          : "npm install --save-dev concurrently";

  log("info", `Installing concurrently via: ${installCmd}`);
  try {
    execSync(installCmd, { cwd: root, stdio: "inherit" });
  } catch {
    log(
      "warn",
      `Could not install concurrently automatically.\nRun manually: ${installCmd}`,
    );
  }
}
