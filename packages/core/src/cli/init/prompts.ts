import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { PROVIDERS, type Answers } from "./providers";
import type { ScanResult } from "./scanner";

export async function askQuestions(
  scan: ScanResult,
  useDefaults: boolean,
): Promise<Answers> {
  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  gluon-ai — setup");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  if (scan.alreadyInitialized) {
    console.log(
      "  ⚠️  gluon/ folder already exists. Re-running init will\n" +
        "      skip existing files and only add what's missing.\n",
    );
  }

  console.log(`  Detected: package manager ${scan.packageManager}\n`);

  const defaults: Answers = {
    providerIndex: 0,
    model: "openai/gpt-4o-mini",
    port: 3001,
    runMode: "nodejs",
  };

  if (useDefaults) {
    console.log("  Using all defaults (--default flag set):\n");
    console.log(`    AI provider : ${PROVIDERS[defaults.providerIndex].label}`);
    console.log(`    Model       : ${defaults.model}`);
    console.log(`    Port        : ${defaults.port}`);
    console.log(`    Run mode    : Node.js process\n`);
    return defaults;
  }

  const rl = readline.createInterface({ input, output });

  function prompt(question: string, defaultVal: string): Promise<string> {
    return rl
      .question(`  ${question} [${defaultVal}]: `)
      .then((ans) => ans.trim() || defaultVal);
  }

  console.log("  Which AI provider will you use?");
  PROVIDERS.forEach((p, i) => {
    const envNote = p.envKey ? `  (${p.envKey})` : "";
    console.log(`    ${i + 1}  ${p.label}${envNote}`);
  });
  const providerChoice = await prompt("Choice", "1");
  const providerIndex = Math.max(
    0,
    Math.min(PROVIDERS.length - 1, parseInt(providerChoice, 10) - 1 || 0),
  );

  const defaultModel = PROVIDERS[providerIndex].defaultModel;
  const model = await prompt("Model", defaultModel);

  const portStr = await prompt("Gluon server port", "3001");
  const port = parseInt(portStr, 10) || 3001;

  console.log("\n  How do you want to run Gluon?");
  console.log(
    "    1  Node.js process  (gluon-ai start injected into npm run dev)",
  );
  console.log("    2  Docker  (bundled docker-compose with postgres + redis)");
  const runModeChoice = await prompt("Choice", "1");
  const runMode: Answers["runMode"] =
    runModeChoice.trim() === "2" ? "docker" : "nodejs";

  rl.close();

  return { providerIndex, model, port, runMode };
}
