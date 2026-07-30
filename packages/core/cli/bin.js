#!/usr/bin/env node
// gluon-ai CLI — `npx gluon-ai`

const { initCommand, installCommand, addToolCommand, addSkillCommand, uninstallCommand } = require("../dist/cli.js");

const HELP = `
gluon-ai — drop-in AI chat agent for Next.js

Commands:
  init [dir] [--default] [--development]
                         Interactive setup: scan project, prompt for env var names,
                         generate package Prisma client, push agent tables to DB,
                         scaffold the catch-all route + instrumentation.
                         --default     Skip all prompts and use auto-detected values.
                         --development Re-installs local file: packages with --install-links
                                       so Turbopack can resolve them within the project root.

  install [dir] [--development]
                         Run npm install. --development copies local file: packages
                         (--install-links) instead of symlinking — required for Turbopack
                         when testing the package locally before publishing.

  add-tool [name]        Scaffold a new tool file and register it in agent.config.json
  add-skill [name]       Scaffold a new skill .md file and register it in agent.config.json
  uninstall [dir]        Remove all scaffolded files and the npm package.
                         Agent DB tables (gluon_chat, gluon_chat_job_run) are not dropped.

Examples:
  npx gluon-ai init --default
  npx gluon-ai init --default --development   (local dev — copies instead of symlinks)
  npx gluon-ai install --development          (just the copy-install step)
  npx gluon-ai add-tool search_docs
  npx gluon-ai add-skill how-to-format-output
  npx gluon-ai uninstall
`;

async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "init": {
      const useDefaults = args.includes("--default") || args.includes("-y");
      const development = args.includes("--development") || args.includes("--dev");
      const targetDir = args.find((a) => !a.startsWith("-")) ?? ".";
      await initCommand(targetDir, { useDefaults, development });
      break;
    }
    case "install": {
      const development = args.includes("--development") || args.includes("--dev");
      const targetDir = args.find((a) => !a.startsWith("-")) ?? ".";
      await installCommand(targetDir, { development });
      break;
    }
    case "add-tool": {
      await addToolCommand(args[0]);
      break;
    }
    case "add-skill": {
      await addSkillCommand(args[0]);
      break;
    }
    case "uninstall": {
      const targetDir = args[0] ?? ".";
      await uninstallCommand(targetDir);
      break;
    }
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n  ✗ " + (err?.message ?? err));
  process.exit(1);
});
