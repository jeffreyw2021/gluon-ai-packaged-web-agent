
import { tool } from "ai";
import { z } from "zod";

const confirmationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  style: z.enum(["confirm", "cancel", "neutral"]).optional(),
});

export const requestConfirmation = tool({
  description:
    "Request confirmation from the user before proceeding with an action. " +
    "Use when you need explicit approval before executing a potentially impactful or irreversible operation. " +
    "The user will be presented with the question and options; the conversation will pause until they respond.",
  inputSchema: z.object({
    action: z.literal("CONFIRMATION_REQUEST"),
    id: z.string().describe("Unique id for this confirmation request"),
    title: z
      .string()
      .describe(
        "One short question in plain language — not a multi-field checklist",
      ),
    description: z.string().optional(),
    options: z
      .array(confirmationOptionSchema)
      .min(1)
      .describe("Buttons shown to the user"),
    allowCustomInput: z.boolean().optional(),
    pendingTool: z
      .string()
      .describe("Tool you will run after approval"),
  }),
});
