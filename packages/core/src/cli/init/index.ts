import * as path from "node:path";
import { execSync } from "node:child_process";
import { reinstallLocalDepsWithLinks } from "../install";
import { scanProject } from "./scanner";
import { PROVIDERS } from "./providers";
import { askQuestions } from "./prompts";
import { write, log } from "./utils";
import {
  agentConfigTemplate,
  agentPackageJsonTemplate,
  systemPromptTemplate,
  datetimeContextTemplate,
  webSearchToolTemplate,
  envExampleTemplate,
  dockerfileTemplate,
  dockerComposeTemplate,
} from "./templates";
import { applyProxyConfig } from "./proxy";
import { dockerComposeInfraTemplate, injectDevScript } from "./devMode";
import { ensurePrismaClient } from "./prisma";

export async function initCommand(
  targetDir: string,
  opts: { useDefaults?: boolean; development?: boolean } = {},
) {
  const root = path.resolve(targetDir);

  if (opts.development) {
    console.log(
      "\n  ── Development mode ────────────────────────────────────────\n",
    );
    console.log(
      "  Copying local file: packages into node_modules (--install-links).\n",
    );
    reinstallLocalDepsWithLinks(root);
    console.log();
  }

  const scan = scanProject(root);
  const answers = await askQuestions(scan, opts.useDefaults ?? false);
  const gluonDir = path.join(root, "gluon");

  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  Scaffolding gluon/ folder…");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  const sdkPkg = PROVIDERS[answers.providerIndex].sdkPackage || undefined;
  const sdkVer = PROVIDERS[answers.providerIndex].sdkVersion || undefined;

  // ── Files common to both modes ─────────────────────────────────────────

  write(path.join(gluonDir, "agent.config.json"), agentConfigTemplate(answers));
  write(
    path.join(gluonDir, "agent", "package.json"),
    agentPackageJsonTemplate(sdkPkg, sdkVer),
  );

  // Install agent dependencies so tool/context files can import them
  const agentDir = path.join(gluonDir, "agent");
  const agentInstallCmd =
    scan.packageManager === "pnpm"
      ? "pnpm install"
      : scan.packageManager === "yarn"
        ? "yarn install"
        : scan.packageManager === "bun"
          ? "bun install"
          : "npm install";
  log("info", `Installing agent dependencies via: ${agentInstallCmd}`);
  try {
    execSync(agentInstallCmd, { cwd: agentDir, stdio: "inherit" });
  } catch {
    log(
      "warn",
      `Could not install agent dependencies automatically.\nRun manually: cd gluon/agent && ${agentInstallCmd}`,
    );
  }

  write(
    path.join(gluonDir, "agent", "system-prompt.md"),
    systemPromptTemplate(),
  );
  write(
    path.join(gluonDir, "agent", "tools", "webSearch.ts"),
    webSearchToolTemplate(),
  );
  write(
    path.join(gluonDir, "agent", "context", "datetime.ts"),
    datetimeContextTemplate(),
  );
  write(path.join(root, ".env.example"), envExampleTemplate(answers));
  // Written only if absent so `node --env-file=.env` never crashes before the
  // user has filled in their key.
  write(path.join(root, ".env"), envExampleTemplate(answers));

  // ── Mode-specific files ───────────────────────────────────────────────

  if (answers.runMode === "docker") {
    write(
      path.join(gluonDir, "Dockerfile"),
      dockerfileTemplate(sdkPkg, sdkVer),
    );
    write(
      path.join(gluonDir, "docker-compose.yml"),
      dockerComposeTemplate(answers.port),
    );
  } else {
    write(
      path.join(gluonDir, "docker-compose.infra.yml"),
      dockerComposeInfraTemplate(),
    );
  }

  // ── Proxy config ──────────────────────────────────────────────────────

  const basePath = applyProxyConfig(scan.hostFramework, root, answers.port);

  // ── Dev script injection (Node.js process mode only) ──────────────────

  if (answers.runMode === "nodejs") {
    injectDevScript(root, scan.packageManager);

    // The provider SDK must be resolvable from the host project's node_modules
    // (not just gluon/agent/) because registry.ts uses require(pkg) from within
    // the gluon-ai package context, which walks up to the host node_modules.
    if (sdkPkg && sdkVer) {
      const sdkInstallCmd =
        scan.packageManager === "pnpm"
          ? `pnpm add ${sdkPkg}@${sdkVer}`
          : scan.packageManager === "yarn"
            ? `yarn add ${sdkPkg}@${sdkVer}`
            : scan.packageManager === "bun"
              ? `bun add ${sdkPkg}@${sdkVer}`
              : `npm install ${sdkPkg}@${sdkVer}`;
      log(
        "info",
        `Installing ${sdkPkg}@${sdkVer} in host project for AI provider registration…`,
      );
      try {
        execSync(sdkInstallCmd, { cwd: root, stdio: "inherit" });
      } catch {
        log(
          "warn",
          `Could not install ${sdkPkg} automatically.\nRun manually: ${sdkInstallCmd}`,
        );
      }
    }
  }

  // ── Prisma client generation ──────────────────────────────────────────
  // Run regardless of mode so `gluon-ai start` always has a generated client.
  // This is the canonical step — the postinstall script is a best-effort
  // fallback that npm may block; init always runs it explicitly.

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("  Generating Prisma client…");
  console.log("─────────────────────────────────────────────────────────────\n");

  // __dirname in dist/cli.js is the dist/ folder; one level up is the package root.
  const gluonPkgRoot = path.resolve(__dirname, "..");
  ensurePrismaClient(gluonPkgRoot);

  // ── Summary ───────────────────────────────────────────────────────────

  const provider = PROVIDERS[answers.providerIndex];
  const envKeyNote = provider.envKey ? provider.envKey : "your provider key";

  if (answers.runMode === "docker") {
    console.log(`
─────────────────────────────────────────────────────────────
  ✨ Setup complete!
─────────────────────────────────────────────────────────────

  Add these to your .env before starting (if not already set):

    ${envKeyNote}=...
    AGENT_DATABASE_URL=postgresql://gluon:gluon@localhost:5433/gluon
    REDIS_URL=redis://localhost:6379

  Then add to your frontend:
    <GluonAgentPanel basePath="${basePath}" />

  Customize: gluon/agent/system-prompt.md  and  gluon/agent/tools/
`);
    console.log(
      "  To add tools later:  npx gluon-ai add-tool <name>\n" +
        "  To upgrade Gluon:    edit gluon/Dockerfile → docker compose build gluon\n",
    );

    console.log("─────────────────────────────────────────────────────────────");
    console.log("  Starting Docker container…");
    console.log("─────────────────────────────────────────────────────────────\n");

    try {
      execSync(`docker compose -f gluon/docker-compose.yml up -d --build`, {
        cwd: root,
        stdio: "inherit",
      });
      console.log(`
  ✅ Container started. Health check:

     curl http://localhost:${answers.port}/config
`);
    } catch {
      console.log(`
  ⚠️  Docker start failed (Docker may not be running, or .env vars are missing).
     Once ready, start manually:

       docker compose -f gluon/docker-compose.yml up -d --build
`);
    }
  } else {
    console.log(`
─────────────────────────────────────────────────────────────
  ✨ Setup complete! (Node.js process mode)
─────────────────────────────────────────────────────────────

  1. Add these to your .env:

       ${envKeyNote}=...
       AGENT_DATABASE_URL=postgresql://gluon:gluon@localhost:5433/gluon
       REDIS_URL=redis://localhost:6379

  2. Start postgres + redis (optional, if you don't have them already):

       docker compose -f gluon/docker-compose.infra.yml up -d

  3. Run your app — gluon-ai start runs automatically alongside it:

       npm run dev

  Then add to your frontend:
    <GluonAgentPanel basePath="${basePath}" />

  Customize: gluon/agent/system-prompt.md  and  gluon/agent/tools/
`);
    console.log(
      "  To add tools later:  npx gluon-ai add-tool <name>\n" +
        "  To uninstall:        npm run gluon:uninstall\n",
    );
  }
}
