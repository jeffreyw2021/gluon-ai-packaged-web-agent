// Context provider — injects the current date/time into the agent's system prompt.
// Called fresh on every request so the value is always up to date.
//
// To add more context providers:
//   1. Create a new .ts file in agent/context/ that exports a default async function.
//   2. Add its path to the "context" array in agent.config.json.
//
// The return value is appended under a "## Context" section in the system prompt.

export default async function (): Promise<string> {
  const now = new Date();
  return `Current date and time: ${now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  })}`;
}
