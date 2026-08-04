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

const SKILL_TEMPLATE = (name: string) =>
  `# ${name}

This skill gives the agent guidance on how to handle a specific task or domain.

## When to use this skill

Describe when the agent should apply the knowledge in this file.

## Instructions

Add your instructions, examples, and guidance here. The agent will read this
file when it invokes the \`load_skill\` tool.

## Examples

- Example task 1
- Example task 2
`;

export async function addSkillCommand(skillNameArg?: string) {
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
  console.log("  easya add-skill — scaffold a new skill file");
  console.log(
    "─────────────────────────────────────────────────────────────\n",
  );

  const rawName =
    skillNameArg ?? (await ask("Skill name (kebab-case, e.g. how-to-search)"));
  const skillName = rawName.trim().toLowerCase().replace(/\s+/g, "-");
  if (!skillName || !/^[a-z][a-z0-9-]*$/.test(skillName)) {
    console.error("  ✗ Skill name must be kebab-case.\n");
    process.exit(1);
  }

  const relPath = `./agent/skills/${skillName}.md`;
  const absPath = path.resolve(`agent/skills/${skillName}.md`);

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as {
    skills?: string[];
  };
  config.skills = config.skills ?? [];

  if (fs.existsSync(absPath)) {
    console.log(`\n  ⏭  skip  ${relPath} (already exists)`);
  } else {
    const title = skillName
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, SKILL_TEMPLATE(title), "utf-8");
    console.log(`\n  ✅ wrote ${relPath}`);
  }

  if (!config.skills.includes(relPath)) {
    config.skills.push(relPath);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    console.log(`  ✅ registered "${skillName}" in agent.config.json\n`);
  } else {
    console.log(
      `  ⏭  "${skillName}" already registered in agent.config.json\n`,
    );
  }

  console.log(`  Next: open ${relPath} and write your skill instructions.\n`);
}
