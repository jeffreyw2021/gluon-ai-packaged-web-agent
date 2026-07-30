export function userChatChannel(userId: string): string {
  return `agent:chat:user:${userId}`;
}

export function chatRunChannel(runId: string): string {
  return `agent:chat:run:${runId}`;
}
