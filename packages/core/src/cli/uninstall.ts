import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { execSync } from "node:child_process";

// ── Helpers ────────────────────────────────────────────────────────────────

function exists(p: string) {
  return fs.existsSync(p);
}

function read(p: string) {
  return fs.readFileSync(p, "utf-8");
}

// ── Dev-server detection ───────────────────────────────────────────────────

/**
 * Returns true if a Next.js dev server appears to be running in the given
 * project root. Checks for a `.next/dev-server.json` lock-file or an open
 * TCP listener on port 3000/3001 (best-effort, not guaranteed).
 */
function isDevServerRunning(root: string): boolean {
  // Next.js writes this file while the dev server is alive
  const lockFile = path.join(root, ".next", "trace");
  if (exists(lockFile)) {
    try {
      // If the file was modified in the last 10 seconds, a server is likely running
      const stat = fs.statSync(lockFile);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < 10_000) return true;
    } catch {
      // ignore
    }
  }

  // Fallback: try lsof to check if port 3000 is in use
  try {
    execSync("lsof -ti :3000", { stdio: "pipe" });
    return true; // command succeeded → port is open
  } catch {
    return false;
  }
}

function log(
  verb: "remove" | "strip" | "skip" | "info" | "warn",
  msg: string,
) {
  const icons: Record<string, string> = {
    remove: "  🗑  removed  ",
    strip: "  ✂️  stripped ",
    skip: "  ⏭  skip     ",
    info: "  ℹ️  ",
    warn: "  ⚠️  ",
  };
  console.log((icons[verb] ?? "  ") + msg);
}

function removeFile(p: string) {
  if (!exists(p)) {
    log("skip", `${p} (not found)`);
    return;
  }
  fs.rmSync(p, { force: true });
  log("remove", p);
}

/** Remove a directory only if it is empty after deleting known files. */
function removeEmptyDir(p: string) {
  if (!exists(p)) return;
  try {
    fs.rmdirSync(p); // fails if non-empty
    log("remove", `${p}/ (empty dir)`);
  } catch {
    // still has user files — leave it
    log("skip", `${p}/ (not empty, keeping)`);
  }
}

// ── Detect project ─────────────────────────────────────────────────────────

interface UninstallContext {
  root: string;
  appRouterDir: string;
  apiAgentDir: string;
  agentConfigPath: string;
  agentDirPath: string;
  instrPath: string | null;
  prismaSchemaPath: string | null;
  envExamplePath: string;
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
}

function detectContext(root: string): UninstallContext {
  const appRouterDir = exists(path.join(root, "src", "app"))
    ? "src/app"
    : "app";
  // Resolve the API route directory — check new path first, then legacy names
  const gluonDir = path.join(root, appRouterDir, "api", "gluon");
  const gluonAiDir = path.join(root, appRouterDir, "api", "gluon-ai");
  const legacyAgentDir = path.join(root, appRouterDir, "api", "agent");
  const apiAgentDir = exists(gluonDir)
    ? gluonDir
    : exists(gluonAiDir)
      ? gluonAiDir
      : legacyAgentDir;

  // instrumentation.ts location
  let instrPath: string | null = null;
  const srcInstr = path.join(root, "src", "instrumentation.ts");
  const rootInstr = path.join(root, "instrumentation.ts");
  if (exists(srcInstr)) instrPath = srcInstr;
  else if (exists(rootInstr)) instrPath = rootInstr;

  // prisma schema
  let prismaSchemaPath: string | null = null;
  for (const loc of [
    path.join(root, "prisma", "schema.prisma"),
    path.join(root, "schema.prisma"),
  ]) {
    if (exists(loc)) {
      prismaSchemaPath = loc;
      break;
    }
  }

  // env example
  const envExamplePath = path.join(root, ".env.example");

  // package manager
  let packageManager: UninstallContext["packageManager"] = "npm";
  if (exists(path.join(root, "pnpm-workspace.yaml"))) packageManager = "pnpm";
  else if (exists(path.join(root, "yarn.lock"))) packageManager = "yarn";
  else if (exists(path.join(root, "bun.lockb"))) packageManager = "bun";

  return {
    root,
    appRouterDir,
    apiAgentDir,
    agentConfigPath: path.join(root, "agent.config.json"),
    agentDirPath: path.join(root, "agent"),
    instrPath,
    prismaSchemaPath,
    envExamplePath,
    packageManager,
  };
}

// ── .env.example cleanup ────────────────────────────────────────────────────

const ENV_EXAMPLE_MARKER = "# gluon-ai env vars";

function stripEnvExample(ctx: UninstallContext) {
  if (!exists(ctx.envExamplePath)) {
    log("skip", ".env.example (not found)");
    return;
  }
  const content = read(ctx.envExamplePath);
  const markerIdx = content.indexOf(ENV_EXAMPLE_MARKER);
  if (markerIdx === -1) {
    log("skip", ".env.example (agent vars not found)");
    return;
  }
  // Walk back to strip the preceding blank line(s)
  let cutAt = markerIdx;
  while (cutAt > 0 && content[cutAt - 1] === "\n") cutAt--;
  const stripped = content.slice(0, cutAt).trimEnd() + "\n";
  fs.writeFileSync(ctx.envExamplePath, stripped, "utf-8");
  log("strip", ".env.example (removed agent env vars section)");
}

// ── instrumentation.ts cleanup ─────────────────────────────────────────────

/** What the current instrumentationTemplate() writes */
const INSTR_RE_EXPORT = `export { register } from "gluon-ai/instrumentation";`;

/** What legacy versions (pre-instrumentation-subpath) wrote */
const INSTR_LEGACY = `export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./agent/worker");
  }
}`;

function stripOrRemoveInstrumentation(ctx: UninstallContext) {
  if (!ctx.instrPath) {
    log("skip", "instrumentation.ts (not found)");
    return;
  }
  const content = read(ctx.instrPath);

  // Current format: single re-export line → delete the whole file
  if (content.trim() === INSTR_RE_EXPORT.trim()) {
    removeFile(ctx.instrPath);
    return;
  }

  // Legacy format: full register() function → delete if it's all we wrote
  if (content.trim() === INSTR_LEGACY.trim()) {
    removeFile(ctx.instrPath);
    return;
  }

  // Mixed file — surgically remove our line(s)
  let stripped = content;
  // Remove re-export line
  stripped = stripped.replace(
    /^export \{ register \} from "gluon-ai\/instrumentation";\n?/m,
    "",
  );
  // Remove legacy register block
  stripped = stripped.replace(
    /\s*if \(process\.env\.NEXT_RUNTIME === "nodejs"\) \{\s*await import\("\.\/agent\/worker"\);\s*\}/g,
    "",
  );
  // Remove empty register function left over
  stripped = stripped.replace(
    /export async function register\(\) \{\s*\}/g,
    "",
  );

  if (!stripped.trim()) {
    removeFile(ctx.instrPath);
    return;
  }

  fs.writeFileSync(ctx.instrPath, stripped.trimEnd() + "\n", "utf-8");
  log("strip", `${ctx.instrPath} (removed agent register export)`);
}

// ── next.config cleanup ────────────────────────────────────────────────────

function stripNextConfig(ctx: UninstallContext) {
  const candidates = ["next.config.ts", "next.config.js", "next.config.mjs"].map(
    (f) => path.join(ctx.root, f),
  );
  const configPath = candidates.find(exists);
  if (!configPath) {
    log("skip", "next.config (not found)");
    return;
  }
  let content = read(configPath);
  let changed = false;

  // Strip serverExternalPackages entry (added by old in-process init versions)
  if (content.includes("gluon-ai")) {
    content = content.replace(
      /\n\s*\/\/ Lets Turbopack resolve subpath exports via Node instead of bundling\.\n\s*serverExternalPackages: \["gluon-ai"\],/g,
      "",
    );
    content = content.replace(/,\s*"gluon-ai"/g, "");
    content = content.replace(/"gluon-ai",\s*/g, "");
    content = content.replace(/\n\s*serverExternalPackages:\s*\[\s*\],?/g, "");
    changed = true;
  }

  // Strip async rewrites() referencing /api/gluon (added by old containerized
  // init versions — new init uses a Route Handler instead)
  if (content.includes("/api/gluon")) {
    const before = content;
    content = content.replace(
      /,?\s*\n\s*async rewrites\(\) \{\n\s+return \[.*?\/api\/gluon.*?\];\s*\n\s+\},?/s,
      "",
    );
    if (content !== before) changed = true;
  }

  if (!changed) {
    log("skip", `${configPath} (no gluon config found)`);
    return;
  }

  // Normalize nextConfig object — collapse any resulting `= {\n}` → `= {}`
  content = content.replace(/(const nextConfig[^=]*=\s*\{)\s*\n(\s*\})/g, "$1$2");

  fs.writeFileSync(configPath, content, "utf-8");
  log("strip", `${configPath} (removed gluon config entries)`);
}

// ── package.json — strip Node.js process mode dev-script injection ─────────

/**
 * Reverses what injectDevScript() did during Node.js process mode init:
 *   - Restores original dev command from dev:app
 *   - Removes gluon:start and dev:app scripts
 *   - Removes gluon:uninstall script
 *   - Removes concurrently from devDependencies
 */
function stripDevScriptInjection(ctx: UninstallContext) {
  const pkgPath = path.join(ctx.root, "package.json");
  if (!exists(pkgPath)) {
    log("skip", "package.json dev script injection (not found)");
    return;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
  } catch {
    log("skip", "package.json dev script injection (could not parse)");
    return;
  }

  const scripts = (pkg.scripts ?? {}) as Record<string, string>;

  // Only act if we injected this (marker: gluon:start exists)
  if (!scripts["gluon:start"]) {
    log("skip", "package.json dev script injection (not present)");
    return;
  }

  // Restore original dev command from dev:app
  if (scripts["dev:app"]) {
    scripts["dev"] = scripts["dev:app"];
    delete scripts["dev:app"];
    log("strip", "package.json — restored dev script from dev:app");
  } else {
    // dev:app not found (edge case), best effort: strip concurrently wrapper
    log("warn", "dev:app not found — could not restore original dev script automatically");
    delete scripts["dev"];
  }

  delete scripts["gluon:start"];

  pkg.scripts = scripts;

  // Remove concurrently from devDependencies if present
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
  if (devDeps["concurrently"]) {
    delete devDeps["concurrently"];
    pkg.devDependencies = devDeps;
    log("strip", "package.json — removed concurrently from devDependencies");
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}

// ── package.json — remove gluon:uninstall script ──────────────────────────

function stripUninstallScript(ctx: UninstallContext) {
  const pkgPath = path.join(ctx.root, "package.json");
  if (!exists(pkgPath)) {
    log("skip", "package.json (not found)");
    return;
  }
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
  } catch {
    log("skip", "package.json (could not parse)");
    return;
  }
  const scripts = pkg.scripts as Record<string, string> | undefined;
  if (!scripts?.["gluon:uninstall"]) {
    log("skip", "package.json gluon:uninstall script (not found)");
    return;
  }
  delete scripts["gluon:uninstall"];
  // Remove scripts block entirely if it is now empty
  if (Object.keys(scripts).length === 0) delete pkg.scripts;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  log("strip", "package.json — removed scripts.gluon:uninstall");
}

// ── Package uninstall ──────────────────────────────────────────────────────

function uninstallPackage(ctx: UninstallContext) {
  const pkgPath = path.join(ctx.root, "package.json");
  if (!exists(pkgPath)) {
    log("skip", "package.json (not found)");
    return;
  }
  const pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;

  if (!deps["gluon-ai"] && !devDeps["gluon-ai"]) {
    log("skip", "npm uninstall (gluon-ai not listed in package.json)");
    return;
  }

  const cmds: Record<string, string> = {
    pnpm: "pnpm remove gluon-ai",
    yarn: "yarn remove gluon-ai",
    bun: "bun remove gluon-ai",
    npm: "npm uninstall gluon-ai",
  };
  const cmd = cmds[ctx.packageManager];
  log("info", `Running: ${cmd}`);
  try {
    execSync(cmd, { cwd: ctx.root, stdio: "inherit" });
  } catch {
    log("warn", `Package uninstall command failed — you may need to run it manually:\n     ${cmd}`);
  }
}

// ── allowScripts cleanup ───────────────────────────────────────────────────

/**
 * Remove gluon-ai and @prisma/client entries from the npm allowScripts block
 * that gets written when the user runs `npm install-scripts approve`.
 */
function stripAllowScripts(ctx: UninstallContext) {
  const pkgPath = path.join(ctx.root, "package.json");
  if (!exists(pkgPath)) return;

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
  } catch {
    return;
  }

  const allowScripts = pkg.allowScripts as Record<string, boolean> | undefined;
  if (!allowScripts) {
    log("skip", "package.json allowScripts (not present)");
    return;
  }

  let changed = false;
  for (const key of Object.keys(allowScripts)) {
    if (key.startsWith("gluon-ai@") || key.startsWith("@prisma/client@")) {
      delete allowScripts[key];
      changed = true;
    }
  }

  if (!changed) {
    log("skip", "package.json allowScripts (no gluon entries found)");
    return;
  }

  if (Object.keys(allowScripts).length === 0) {
    delete pkg.allowScripts;
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  log("strip", "package.json — removed gluon allowScripts entries");
}

// ── .next cache ────────────────────────────────────────────────────────────

function clearNextCache(ctx: UninstallContext) {
  const nextDir = path.join(ctx.root, ".next");
  if (!exists(nextDir)) {
    log("skip", ".next cache (not found)");
    return;
  }
  fs.rmSync(nextDir, { recursive: true, force: true });
  log("remove", ".next cache (cleared to avoid stale instrumentation references)");
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function uninstallCommand(targetDir: string) {
  const root = path.resolve(targetDir);
  const ctx = detectContext(root);
  const rl = readline.createInterface({ input, output });

  // ── Dev-server guard ────────────────────────────────────────────────────
  if (isDevServerRunning(root)) {
    console.log(`
  ⚠️  A Next.js dev server appears to be running on port 3000.

  Stop it first (Ctrl+C in the dev terminal), then re-run:

    npx gluon-ai uninstall

  If you uninstall while the server is running, it will immediately
  rewrite the .next cache and leave stale references to deleted files.
`);
    rl.close();
    process.exit(1);
  }

  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  gluon-ai uninstall — remove gluon-ai from project");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  console.log("  This will:\n");
  console.log("    • Delete  gluon/  directory (agent config, tools, docker files)");
  console.log(`    • Delete  ${ctx.appRouterDir}/api/gluon/  (streaming proxy route)`);
  console.log("    • Strip   agent env vars from .env.example");
  console.log("    • Strip   gluon config entries from next.config");
  console.log("    • Strip   gluon:start / dev:app / gluon:uninstall from package.json scripts");
  console.log("    • Uninstall gluon-ai npm package");
  console.log("    • Strip   gluon allowScripts entries from package.json");
  console.log("    • Clear   .next build cache\n");
  console.log(
    "  Note: Agent database tables (gluon_chat, gluon_chat_job_run) are NOT\n" +
      "  dropped automatically — they live in your database independently.\n",
  );

  const answer = await rl
    .question("  Proceed? (y/N): ")
    .then((a) => a.trim().toLowerCase());
  rl.close();

  if (answer !== "y" && answer !== "yes") {
    console.log("\n  Aborted — nothing was changed.\n");
    return;
  }

  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  Removing…");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  // 1. gluon/ docker folder (agent config, Dockerfile, docker-compose, tools)
  const gluonDockerDir = path.join(root, "gluon");
  if (exists(gluonDockerDir)) {
    fs.rmSync(gluonDockerDir, { recursive: true, force: true });
    log("remove", "gluon/ (docker folder)");
  } else {
    log("skip", "gluon/ (not found)");
  }

  // 2. Legacy root-level agent files (pre-containerization installs)
  removeFile(ctx.agentConfigPath);
  removeFile(path.join(ctx.agentDirPath, "auth", "getUserId.ts"));
  removeEmptyDir(path.join(ctx.agentDirPath, "auth"));
  removeFile(path.join(ctx.agentDirPath, "tools", "webSearch.ts"));
  removeFile(path.join(ctx.agentDirPath, "tools", "helloWorld.ts"));
  removeEmptyDir(path.join(ctx.agentDirPath, "tools"));
  removeFile(path.join(ctx.agentDirPath, "package.json"));
  removeFile(path.join(ctx.agentDirPath, "worker.ts"));
  removeEmptyDir(ctx.agentDirPath);

  // 3. API route files — handle both new (api/gluon/) and legacy layouts
  const catchAllRoute = path.join(ctx.apiAgentDir, "[[...path]]", "route.ts");
  if (exists(catchAllRoute)) {
    removeFile(catchAllRoute);
    removeEmptyDir(path.join(ctx.apiAgentDir, "[[...path]]"));
  } else {
    // Legacy: four separate route files from earlier package versions
    const legacyRouteFiles = [
      "commands/route.ts",
      "events/route.ts",
      "thread/route.ts",
      "chats/route.ts",
    ];
    for (const rel of legacyRouteFiles) {
      removeFile(path.join(ctx.apiAgentDir, rel));
      removeEmptyDir(path.join(ctx.apiAgentDir, path.dirname(rel)));
    }
  }
  removeEmptyDir(ctx.apiAgentDir);

  // 4. .env.example
  stripEnvExample(ctx);

  // 5. instrumentation.ts (legacy in-process installs only)
  stripOrRemoveInstrumentation(ctx);

  // 6. next.config — strip rewrites or serverExternalPackages
  stripNextConfig(ctx);

  // 7. package.json — strip Node.js process mode dev injection (gluon:start, dev:app, concurrently)
  stripDevScriptInjection(ctx);

  // 7b. package.json — remove gluon:uninstall convenience script
  stripUninstallScript(ctx);

  // 8. .next cache
  clearNextCache(ctx);

  // 9. npm uninstall (last — so all files are gone first)
  uninstallPackage(ctx);

  // 10. Strip stale allowScripts entries left by npm install-scripts approve
  stripAllowScripts(ctx);

  console.log(`
─────────────────────────────────────────────────────────────
  ✅ Uninstall complete.

  The agent database tables are NOT dropped automatically.
  To remove them manually:

    DROP TABLE "gluon_chat_job_run", "gluon_chat";  (SQL)
─────────────────────────────────────────────────────────────
`);
}
