export const STREAMING_SNAPSHOT_KEY = (runId: string) =>
  `agent:chat:stream:snap:${runId}`;

export const STREAMING_ACTIVITY_KEY = (runId: string) =>
  `agent:chat:stream:activity:${runId}`;
