import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// ── Helpers ────────────────────────────────────────────────────────────────

function exists(p: string) {
  return fs.existsSync(p);
}

function read(p: string) {
  return fs.readFileSync(p, "utf-8");
}

function log(verb: "info" | "warn" | "run" | "skip", msg: string) {
  const icons: Record<string, string> = {
    info: "  ℹ️  ",
    warn: "  ⚠️  ",
    run: "  🔄 ",
    skip: "  ⏭  skip  ",
  };
  console.log((icons[verb] ?? "  ") + msg);
}

// ── Local file: dependency detection ──────────────────────────────────────

interface LocalDep {
  name: string;
  localPath: string; // resolved absolute path
}

function findLocalDeps(root: string): LocalDep[] {
  const pkgPath = path.join(root, "package.json");
  if (!exists(pkgPath)) return [];

  const pkg = JSON.parse(read(pkgPath)) as Record<string, unknown>;
  const allDeps: Record<string, string> = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };

  const results: LocalDep[] = [];
  for (const [name, version] of Object.entries(allDeps)) {
    if (version.startsWith("file:")) {
      const rel = version.slice(5); // strip "file:"
      results.push({ name, localPath: path.resolve(root, rel) });
    }
  }
  return results;
}

// ── Package manager detection ──────────────────────────────────────────────

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

function detectPackageManager(root: string): PackageManager {
  if (exists(path.join(root, "pnpm-workspace.yaml"))) return "pnpm";
  if (exists(path.join(root, "bun.lockb"))) return "bun";
  if (exists(path.join(root, "yarn.lock"))) return "yarn";
  return "npm";
}

// ── Install with --install-links ───────────────────────────────────────────

/**
 * Re-installs all `file:` dependencies using a physical copy instead of a
 * symlink, so Turbopack can resolve subpath exports within the project root.
 *
 * Only npm supports `--install-links`. pnpm / yarn users get a manual
 * instruction printed instead.
 */
export function reinstallLocalDepsWithLinks(root: string) {
  const pm = detectPackageManager(root);
  const deps = findLocalDeps(root);

  if (deps.length === 0) {
    log("skip", "no local file: dependencies found in package.json");
    return;
  }

  console.log(`\n  Local file: packages found:\n`);
  for (const d of deps) {
    console.log(`    ${d.name}  →  ${d.localPath}`);
  }

  if (pm !== "npm") {
    log(
      "warn",
      `--development copy-install is only automated for npm.\n` +
        `  For ${pm}, manually ensure the package is physically copied,\n` +
        `  not symlinked, e.g. via your workspace config.\n`,
    );
    return;
  }

  log("run", "npm install --install-links  (copies file: packages instead of symlinking)");
  execSync("npm install --install-links", { cwd: root, stdio: "inherit" });
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function installCommand(
  targetDir: string,
  opts: { development?: boolean } = {},
) {
  const root = path.resolve(targetDir);

  if (opts.development) {
    console.log(
      "\n─────────────────────────────────────────────────────────────",
    );
    console.log("  easya install --development");
    console.log(
      "  Copies local file: packages into node_modules (no symlink).\n" +
        "  Required for Turbopack to resolve subpath exports during local dev.",
    );
    console.log(
      "─────────────────────────────────────────────────────────────\n",
    );
    reinstallLocalDepsWithLinks(root);
  } else {
    const pm = detectPackageManager(root);
    const deps = findLocalDeps(root);

    console.log(
      "\n─────────────────────────────────────────────────────────────",
    );
    console.log("  easya install");
    console.log(
      "─────────────────────────────────────────────────────────────\n",
    );

    if (deps.length === 0) {
      log("info", "No file: dependencies found. Run your package manager manually:");
      console.log(`\n    npm install gluon-ai\n`);
      return;
    }

    // Normal symlink install
    const cmd =
      pm === "npm"
        ? `npm install`
        : pm === "pnpm"
          ? `pnpm install`
          : pm === "yarn"
            ? `yarn install`
            : `bun install`;

    log("run", cmd);
    execSync(cmd, { cwd: root, stdio: "inherit" });

    log(
      "info",
      `If you see Turbopack resolution errors, re-run with:\n\n` +
        `    npx gluon-ai install --development\n`,
    );
  }
}
