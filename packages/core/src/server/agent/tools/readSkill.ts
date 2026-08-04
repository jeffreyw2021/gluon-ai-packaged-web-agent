
import { tool } from "ai";
import { z } from "zod";

export function createLoadSkillTool(skills: string[]) {
  return tool({
    description:
      "Load a skill document to learn how to use a specific capability or follow a workflow. " +
      "Call this before using domain-specific tools for the first time in a conversation.",
    inputSchema: z.object({
      index: z
        .number()
        .int()
        .min(0)
        .describe("Zero-based index of the skill to read (see skill list in system prompt)"),
    }),
    execute: async ({ index }) => {
      const skill = skills[index];
      if (!skill) {
        return { error: `Skill at index ${index} not found. Available indices: 0-${skills.length - 1}` };
      }
      return { content: skill };
    },
  });
}
