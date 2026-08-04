import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { exists, log } from "./utils";

/**
 * Ensures the Prisma client bundled with gluon-ai is generated.
 * Runs `npx prisma@6 generate` pinned to Prisma 6 to stay compatible with the
 * bundled schema format (Prisma 7+ dropped `url = env(...)` in schema files).
 * Safe to call multiple times — skips if the client is already generated.
 */
export function ensurePrismaClient(pkgRoot: string): void {
  const generatedIndexPath = path.join(
    pkgRoot,
    "prisma",
    "generated",
    "index.js",
  );
  if (exists(generatedIndexPath)) {
    log("skip", "Prisma client (already generated)");
    return;
  }

  const schemaPath = path.join(pkgRoot, "prisma", "schema.prisma");
  if (!exists(schemaPath)) {
    log("warn", "prisma/schema.prisma not found — skipping Prisma generate");
    return;
  }

  log("info", "Generating Prisma client (prisma@6)…");
  const result = spawnSync(
    "npx",
    ["--yes", "prisma@6", "generate", "--schema", schemaPath],
    {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        AGENT_DATABASE_URL:
          process.env.AGENT_DATABASE_URL ||
          "postgresql://placeholder:5432/agent",
      },
    },
  );

  if (result.status !== 0) {
    log(
      "warn",
      "Could not generate Prisma client — run `npx prisma@6 generate` manually if needed",
    );
  }
}
