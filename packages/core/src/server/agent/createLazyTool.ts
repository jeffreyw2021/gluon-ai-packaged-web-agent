import { tool } from "ai";
import type { z } from "zod";

export function createLazyTool(
  description: string,
  inputSchema: z.ZodTypeAny,
  load: () => Promise<unknown>,
  options?: {
    needsApproval?: boolean | ((input: unknown) => boolean | Promise<boolean>);
  },
) {
  let cached: unknown = null;

  return tool({
    description,
    inputSchema,
    ...(options?.needsApproval !== undefined
      ? { needsApproval: options.needsApproval as (input: unknown) => boolean }
      : {}),
    execute: async (input: unknown, execOptions: unknown) => {
      cached ??= await load();
      if (typeof (cached as { execute?: unknown }).execute !== "function") {
        throw new Error("Lazy tool module missing execute");
      }
      return (cached as { execute: (i: unknown, o: unknown) => unknown }).execute(input, execOptions);
    },
  });
}
