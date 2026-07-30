#!/usr/bin/env node
/**
 * Generates the package's own Prisma client (prisma/generated/) after installation.
 *
 * Reads db.provider from agent.config.json (if present) and copies the matching
 * prisma/templates/schema.<provider>.prisma → prisma/schema.prisma before
 * running `prisma generate`.
 *
 * Soft-fails if `prisma` CLI is not available — run `npx gluon-ai init` to
 * finish setup.
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const pkgRoot = path.join(__dirname, "..");
const schemaPath = path.join(pkgRoot, "prisma", "schema.prisma");
const templatesDir = path.join(pkgRoot, "prisma", "templates");
const generatedIndexPath = path.join(pkgRoot, "prisma", "generated", "index.js");

// Skip if already generated (e.g. after npm publish includes generated output)
if (fs.existsSync(generatedIndexPath)) {
  process.exit(0);
}

// ── Pick the right schema template ──────────────────────────────────────────

function resolveDbProvider() {
  // Walk up from the package root looking for agent.config.json in the host project.
  // Typical install paths: <project>/node_modules/gluon-ai/  or pnpm virtual store.
  const candidates = [
    path.join(process.cwd(), "agent.config.json"),
    path.join(pkgRoot, "..", "..", "agent.config.json"),     // npm/yarn flat
    path.join(pkgRoot, "..", "..", "..", "agent.config.json"), // pnpm virtual store depth
  ];

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const cfg = JSON.parse(fs.readFileSync(p, "utf-8"));
      const provider = cfg?.db?.provider;
      if (provider && typeof provider === "string") return provider;
    } catch {
      // ignore malformed config
    }
  }
  return "postgresql";
}

const provider = resolveDbProvider();
const templateFile = path.join(templatesDir, `schema.${provider}.prisma`);

if (fs.existsSync(templateFile)) {
  fs.copyFileSync(templateFile, schemaPath);
} else {
  // Fall back to the default postgresql schema if the template is missing
  const fallback = path.join(templatesDir, "schema.postgresql.prisma");
  if (fs.existsSync(fallback)) {
    fs.copyFileSync(fallback, schemaPath);
  }
}

if (!fs.existsSync(schemaPath)) {
  console.warn(
    "[gluon-ai] prisma/schema.prisma not found, skipping Prisma generate.",
  );
  process.exit(0);
}

// ── Generate the Prisma client ────────────────────────────────────────────────

const placeholderUrl =
  provider === "sqlite"
    ? "file:./agent.db"
    : provider === "mysql"
      ? "mysql://placeholder:3306/agent"
      : "postgresql://placeholder:5432/agent";

const result = spawnSync(
  "npx",
  ["--yes", "prisma", "generate", "--schema", schemaPath],
  {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      // A placeholder URL satisfies Prisma's URL validation during generate;
      // no real connection is made during code generation.
      AGENT_DATABASE_URL: process.env.AGENT_DATABASE_URL || placeholderUrl,
    },
  },
);

if (result.status !== 0) {
  console.warn(
    "\n[gluon-ai] Could not auto-generate Prisma client.\n" +
      "Run `npx gluon-ai init` after setting up your database to finish setup.\n",
  );
}
