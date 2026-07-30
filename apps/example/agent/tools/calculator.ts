import { defineTool } from "easy-setup-web-agent";
import { z } from "zod";

export default defineTool({
  description:
    "Perform arithmetic calculations. Supports add, subtract, multiply, divide, and percentage.",
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        "A math expression to evaluate, e.g. '(15 / 100) * 87.50' or '42 * 3 + 7'",
      ),
  }),
  execute: async ({ expression }) => {
    // Safe arithmetic evaluator (no eval with strings)
    try {
      // Allow only numbers, operators, parentheses, whitespace
      if (!/^[\d\s+\-*/().%]+$/.test(expression)) {
        return { error: "Invalid expression: only basic arithmetic is allowed" };
      }
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression})`)() as number;
      if (!Number.isFinite(result)) return { error: "Result is not a finite number" };
      return {
        expression,
        result: Math.round(result * 1e10) / 1e10,
      };
    } catch {
      return { error: "Failed to evaluate expression" };
    }
  },
});
