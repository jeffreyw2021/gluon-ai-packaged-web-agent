export const RUN_EVENT_BUFFER_KEY = (runId: string) =>
  `agent:chat:run:buffer:${runId}`;

export const RUN_STREAM_REDIS_TTL_SEC = 3600;

export const MAX_RUN_BUFFER_EVENTS = 2000;
