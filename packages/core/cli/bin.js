#!/usr/bin/env node
// gluon-ai CLI — `npx gluon-ai`

const { initCommand, startCommand, installCommand, addToolCommand, addSkillCommand, uninstallCommand } = require("../dist/cli.js");

const HELP = `
gluon-ai — framework-agnostic AI agent backend

Commands:
  start                  Boot the Gluon server (Hono + BullMQ worker).
                         Used as CMD in the scaffolded Dockerfile.
                         Also works directly: pm2 start "gluon-ai start"

  init [dir] [--default] Interactive setup: scaffold gluon/ folder with Dockerfile,
                         docker-compose.yml, agent.config.json, and agent/ files.
                         --default     Skip all prompts and use defaults.

  install [dir] [--development]
                         Run npm install. --development copies local file: packages
                         (--install-links) instead of symlinking.

  add-tool [name]        Scaffold a new tool file and register it in agent.config.json
  add-skill [name]       Scaffold a new skill .md file and register it in agent.config.json
  uninstall [dir]        Remove all scaffolded files and the npm package.
                         Agent DB tables (gluon_chat, gluon_chat_job_run) are not dropped.

Examples:
  gluon-ai start
  npx gluon-ai init
  npx gluon-ai init --default
  npx gluon-ai add-tool search_docs
  npx gluon-ai add-skill how-to-format-output
  npx gluon-ai uninstall
`;

async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "start": {
      startCommand();
      break;
    }
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
