import type { UIMessage } from "ai";
import type { RunActivityPhase } from "./RunActivityPhase";
import type { RunPhase } from "./RunPhase";
import type { TokenUsage } from "./TokenUsage";

export interface RunStartedLiveEvent {
  type: "run.started";
  chatId: string;
  runId: string;
  seq: number;
}

export interface ThreadProjectionLiveEvent {
  type: "thread.projection";
  chatId: string;
  runId: string;
  seq: number;
  message: UIMessage;
}

export interface MessageTextDeltaLiveEvent {
  type: "message.text.delta";
  chatId: string;
  runId: string;
  seq: number;
  messageId: string;
  delta: string;
}

export interface MessageReasoningDeltaLiveEvent {
  type: "message.reasoning.delta";
  chatId: string;
  runId: string;
  seq: number;
  messageId: string;
  delta: string;
}

export interface RunPhaseLiveEvent {
  type: "run.phase";
  chatId: string;
  runId: string;
  seq: number;
  activity: RunActivityPhase;
  roundIndex?: number;
}

export interface RunAwaitingUserLiveEvent {
  type: "run.awaiting_user";
  chatId: string;
  runId: string;
  seq: number;
  approvalIds: string[];
}

export interface RunCompletedLiveEvent {
  type: "run.completed";
  chatId: string;
  runId: string;
  seq: number;
  usage?: TokenUsage;
}

export interface RunFailedLiveEvent {
  type: "run.failed";
  chatId: string;
  runId: string;
  seq: number;
  reason: string;
}

export interface RunCancelledLiveEvent {
  type: "run.cancelled";
  chatId: string;
  runId: string;
  seq: number;
}

export type LiveEvent =
  | RunStartedLiveEvent
  | RunPhaseLiveEvent
  | ThreadProjectionLiveEvent
  | MessageTextDeltaLiveEvent
  | MessageReasoningDeltaLiveEvent
  | RunAwaitingUserLiveEvent
  | RunCompletedLiveEvent
  | RunFailedLiveEvent
  | RunCancelledLiveEvent;

export interface ChatListDto {
  id: string;
  title: string;
  userId: string;
  activeJobRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatCreatedEvent {
  type: "chat.created";
  chat: ChatListDto;
}

export interface ChatUpdatedEvent {
  type: "chat.updated";
  chat: ChatListDto;
}

export interface ChatDeletedEvent {
  type: "chat.deleted";
  chatId: string;
}

export type UserChatListEvent =
  | ChatCreatedEvent
  | ChatUpdatedEvent
  | ChatDeletedEvent;

export interface StreamingSnapshotTransportEvent {
  type: "streaming.snapshot";
  chatId: string;
  runId: string;
  snapshot: StreamingSnapshotDto;
}

export type ChatTransportEvent = LiveEvent | UserChatListEvent | StreamingSnapshotTransportEvent;

export interface StreamingSnapshotDto {
  messageId: string;
  text: string;
  reasoningText?: string;
  updatedAt: string;
}

export interface ChatThreadDto {
  chatId: string;
  messages: UIMessage[];
  activeRunId: string | null;
  runPhase: RunPhase;
  streamingSnapshot?: StreamingSnapshotDto | null;
  runActivity?: RunActivityPhase | null;
}

export interface ChatCommandAck {
  ok: true;
  chatId: string;
  clientMessageId?: string;
  runId: string;
  acceptedAt: string;
}

export interface ChatCommandError {
  ok: false;
  code: string;
  message: string;
}

export type CommandAck = ChatCommandAck | ChatCommandError;
