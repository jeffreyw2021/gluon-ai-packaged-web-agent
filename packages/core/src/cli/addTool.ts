import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function ask(question: string, defaultVal = ""): Promise<string> {
  const rl = readline.createInterface({ input, output });
  const ans = await rl.question(
    `  ${question}${defaultVal ? ` [${defaultVal}]` : ""}: `,
  );
  rl.close();
  return ans.trim() || defaultVal;
}

function slugToLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TOOL_TEMPLATE = (
  toolName: string,
  description: string,
  displayLabel: string,
) =>
  `import { defineTool } from "gluon-ai";
import { z } from "zod";

export default defineTool({
  description: "${description}",
  displayLabel: "${displayLabel}",
  inputSchema: z.object({
    // TODO: define your input fields
    query: z.string().describe("The query to process"),
  }),
  execute: async ({ query }) => {
    // TODO: implement ${toolName} logic
    return { result: \`Processed: \${query}\` };
  },
  // Set to true (or a function) to require user confirmation before running
  needsApproval: false,
});
`;

export async function addToolCommand(toolNameArg?: string) {
  const configPath = path.resolve("agent.config.json");
  if (!fs.existsSync(configPath)) {
    console.error(
      "\n  ✗ agent.config.json not found. Run `npx gluon-ai init` first.\n",
    );
    process.exit(1);
  }

  console.log(
    "\n─────────────────────────────────────────────────────────────",
  );
  console.log("  easya add-tool — scaffold a new tool");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  const toolName =
    toolNameArg ?? (await ask("Tool name (snake_case, e.g. search_docs)"));
  if (!toolName || !/^[a-z][a-z0-9_]*$/.test(toolName)) {
    console.error(
      "  ✗ Tool name must be snake_case and start with a letter.\n",
    );
    process.exit(1);
  }

  const defaultLabel = slugToLabel(toolName);
  const description = await ask(
    "Short description for the AI model",
    `A tool called ${defaultLabel}`,
  );
  const displayLabel = await ask(
    "Display label shown in the UI while running",
    defaultLabel,
  );

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as {
    tools?: Record<string, string>;
  };
  config.tools = config.tools ?? {};

  const relPath = `./agent/tools/${toolName}.ts`;
  const absPath = path.resolve(`agent/tools/${toolName}.ts`);

  if (fs.existsSync(absPath)) {
    console.log(`\n  ⏭  skip  ${relPath} (already exists)`);
  } else {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(
      absPath,
      TOOL_TEMPLATE(toolName, description, displayLabel),
      "utf-8",
    );
    console.log(`\n  ✅ wrote ${relPath}`);
  }

  if (!config.tools[toolName]) {
    config.tools[toolName] = relPath;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    console.log(`  ✅ registered "${toolName}" in agent.config.json\n`);
  } else {
    console.log(
      `  ⏭  "${toolName}" already registered in agent.config.json\n`,
    );
  }

  console.log(`  Next: open ${relPath} and implement the execute function.\n`);
}
