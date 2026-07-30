// Start the BullMQ worker when the Next.js server boots.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAgentWorker } = await import("easy-setup-web-agent/server");
    startAgentWorker();
  }
}
