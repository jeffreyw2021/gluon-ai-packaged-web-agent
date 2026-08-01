"use client";

// ── Provider & context ────────────────────────────────────────────────────
export { AgentProvider, useAgentContext } from "./provider/AgentProvider";
export type { AgentProviderProps, AgentContextValue } from "./provider/AgentProvider";

// ── Master session hook ───────────────────────────────────────────────────
export { useAgentAdapter } from "./adapter/useAgentAdapter";
export type { UseAgentAdapterOptions } from "./adapter/useAgentAdapter";

// ── Focused hooks ─────────────────────────────────────────────────────────
export { useChatInput } from "./hooks/useChatInput";
export type { UseChatInputOptions, UseChatInputReturn } from "./hooks/useChatInput";

export { useReasoningMode } from "./hooks/useReasoningMode";
export type { ReasoningMode, UseReasoningModeReturn } from "./hooks/useReasoningMode";

export { useChatList } from "./hooks/useChatList";
export type { UseChatListReturn } from "./hooks/useChatList";

export { useRecorder } from "./hooks/useRecorder";
export type { UseRecorderReturn } from "./hooks/useRecorder";

export { useSpeechTranscriber } from "./hooks/useSpeechTranscriber";
export type {
  UseSpeechTranscriberReturn,
  SpeechTranscriberOptions,
} from "./hooks/useSpeechTranscriber";

export { useAttachments } from "./hooks/useAttachments";
export type { UseAttachmentsReturn, Attachment } from "./hooks/useAttachments";

export { useFileExtraction } from "./hooks/useFileExtraction";
export type { UseFileExtractionReturn } from "./hooks/useFileExtraction";

export { useComposerActions } from "./hooks/useComposerActions";
export type { UseComposerActionsOptions, UseComposerActionsReturn } from "./hooks/useComposerActions";

// ── Panel orchestrator ────────────────────────────────────────────────────
export { AgentPanel } from "./panel/AgentPanel";
export type { AgentPanelProps, AgentPanelClassNames, AgentPanelStyles } from "./panel/AgentPanel";

// ── Layer 2: self-contained pre-wired panel components ───────────────────
// Each component calls its own hooks from AgentProvider and can be used
// independently — no data props required, only customisation props.
export { ChatTopBar } from "./panel/ChatTopBar";
export type { ChatTopBarProps } from "./panel/ChatTopBar";

export { ChatMessageList } from "./panel/ChatMessageList";
export type { ChatMessageListProps } from "./panel/ChatMessageList";

export { ChatInputBar } from "./panel/ChatInputBar";
export type { ChatInputBarProps } from "./panel/ChatInputBar";

// ── Layer 3: drop-in composed panel ──────────────────────────────────────
// Wraps AgentProvider + Layer 2 stack in a styled shell. One import, ready.
export { GluonAgentPanel } from "./panel/GluonAgentPanel";
export type { GluonAgentPanelProps } from "./panel/GluonAgentPanel";

// ── Chat list ─────────────────────────────────────────────────────────────
export { ChatList } from "./panel/ChatList";
export type { ChatListProps } from "./panel/ChatList";

export { ChatListItem } from "./panel/ChatListItem";
export type { ChatListItemProps } from "./panel/ChatListItem";

// ── Message primitives ────────────────────────────────────────────────────
export { MessageList } from "./messages/MessageList";
export type { MessageListProps, MessageListComponentSlots, MessageListEmptyProps } from "./messages/MessageList";

export { UserMessage } from "./messages/UserMessage";
export type { UserMessageProps } from "./messages/UserMessage";

export { AssistantMessage } from "./messages/AssistantMessage";
export type { AssistantMessageProps, AssistantMessageSlots } from "./messages/AssistantMessage";

export { ThoughtWindow } from "./messages/thoughts/ThoughtWindow";
export type { ThoughtWindowProps } from "./messages/thoughts/ThoughtWindow";

export { ConfirmationBlock } from "./messages/ConfirmationBlock";
export type { ConfirmationBlockProps, ConfirmationOption } from "./messages/ConfirmationBlock";

export { ActionBlockSlot } from "./messages/ActionBlockSlot";
export type { ActionBlockSlotProps } from "./messages/ActionBlockSlot";

// ── Chat input ────────────────────────────────────────────────────────────
export { ChatInput } from "./input/ChatInput";
export type { ChatInputProps, ChatInputClassNames, ChatInputStyles, ChatInputHandle } from "./input/ChatInput";

// ── Headless buttons ──────────────────────────────────────────────────────
export { SendButton } from "./buttons/SendButton";
export type { SendButtonProps } from "./buttons/SendButton";

export { StopButton } from "./buttons/StopButton";
export type { StopButtonProps } from "./buttons/StopButton";

export { AttachButton } from "./buttons/AttachButton";
export type { AttachButtonProps } from "./buttons/AttachButton";

export { RecordButton } from "./buttons/RecordButton";
export type { RecordButtonProps } from "./buttons/RecordButton";

export { TranscribeButton } from "./buttons/TranscribeButton";
export type { TranscribeButtonProps } from "./buttons/TranscribeButton";

// ── Display primitives ────────────────────────────────────────────────────
export { RecordingIndicator } from "./display/RecordingIndicator";
export type { RecordingIndicatorProps, RecordingIndicatorRenderProps } from "./display/RecordingIndicator";

export { LiveTranscript } from "./display/LiveTranscript";
export type { LiveTranscriptProps, LiveTranscriptRenderProps } from "./display/LiveTranscript";

export { AttachmentChip } from "./display/AttachmentChip";
export type { AttachmentChipProps, AttachmentChipRenderProps } from "./display/AttachmentChip";

// ── Attachment payload utilities ──────────────────────────────────────────────
export { buildSendPayload, parseAttachmentMeta, stripAttachmentBlock } from "./lib/attachmentPayload";
export type { AttachmentChipMeta } from "./lib/attachmentPayload";

// ── Realtime internals (advanced use) ─────────────────────────────────────
export { applyLiveEvent, INITIAL_LIVE_RUN_STATE } from "./realtime/applyLiveEvent";
export type { LiveRunState } from "./realtime/applyLiveEvent";

export { openLiveEventSource } from "./realtime/liveEventSource";
export type { SseConnectionOptions } from "./realtime/liveEventSource";
