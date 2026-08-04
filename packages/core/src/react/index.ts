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

export { useSlashCommands } from "./hooks/useSlashCommands";
export type { UseSlashCommandsReturn } from "./hooks/useSlashCommands";

// ── Layer 1: Drop-in composed panel ──────────────────────────────────────
// Wraps AgentProvider + all layers in a styled shell. One import, ready.
export { GluonAgentPanel } from "./panel/GluonAgentPanel";
export type { GluonAgentPanelProps } from "./panel/GluonAgentPanel";

// ── Layer 2: Styled atomic components ─────────────────────────────────────
// Short-named, default-styled fine-grained controls. Wired to AgentProvider.
// Can be used standalone or composed into custom region layouts.

// Top-bar components
export { NewChatButton } from "./styled/NewChatButton";
export type { NewChatButtonProps } from "./styled/NewChatButton";

export { ModeSwitch } from "./styled/ModeSwitch";
export type { ModeSwitchProps } from "./styled/ModeSwitch";

export { ChatSelect } from "./styled/ChatSelect";
export type { ChatSelectProps, ChatSelectStyles } from "./styled/ChatSelect";

export { ChatSelectMenu } from "./styled/ChatSelectMenu";
export type { ChatSelectMenuProps } from "./styled/ChatSelectMenu";

export { ChatSelectMenuItem } from "./styled/ChatSelectMenuItem";
export type { ChatSelectMenuItemProps } from "./styled/ChatSelectMenuItem";

// Message-list components
export { EmptyView } from "./styled/EmptyView";
export type { EmptyViewProps } from "./styled/EmptyView";

export { SuggestedPromptButton } from "./styled/SuggestedPromptButton";
export type { SuggestedPromptButtonProps } from "./styled/SuggestedPromptButton";

// Input-bar components
export { AttachButton } from "./styled/AttachButton";
export type { AttachButtonProps } from "./styled/AttachButton";

export { SlashCommandMenu } from "./styled/SlashCommandMenu";
export type { SlashCommandMenuProps } from "./styled/SlashCommandMenu";

export { ChatInput } from "./styled/ChatInput";
export type { ChatInputProps, ChatInputHandle } from "./styled/ChatInput";

export { MicButton } from "./styled/MicButton";
export type { MicButtonProps } from "./styled/MicButton";

export { TranscriptionIndicator } from "./styled/TranscriptionIndicator";
export type { TranscriptionIndicatorProps } from "./styled/TranscriptionIndicator";

export { SendButton } from "./styled/SendButton";
export type { SendButtonProps } from "./styled/SendButton";

// ── Layer 3: Compose regions ─────────────────────────────────────────────
// Self-contained region components built from Layer 2 styled components.
// Provide region-level layout, slot overrides, and dark-mode prop passthrough.
export { AgentPanel } from "./panel/AgentPanel";
export type { AgentPanelProps, AgentPanelClassNames, AgentPanelStyles } from "./panel/AgentPanel";

export { ChatTopBar } from "./panel/ChatTopBar";
export type { ChatTopBarProps, ChatTopBarStyles } from "./panel/ChatTopBar";

export { ChatMessageList } from "./panel/ChatMessageList";
export type { ChatMessageListProps } from "./panel/ChatMessageList";

export { ChatInputBar } from "./panel/ChatInputBar";
export type { ChatInputBarProps, ChatInputBarStyles } from "./panel/ChatInputBar";

// ── Chat list panels ──────────────────────────────────────────────────────
export { ChatList } from "./panel/ChatList";
export type { ChatListProps } from "./panel/ChatList";

export { ChatListItem } from "./panel/ChatListItem";
export type { ChatListItemProps } from "./panel/ChatListItem";

// ── Layer 4: Headless primitives ──────────────────────────────────────────
// Behavior-only; zero built-in styles. Compose with your own CSS.
// Colliding names from Layer 2 carry a "Headless" prefix.

export { HeadlessChatInput } from "./input/ChatInput";
export type {
  ChatInputProps as HeadlessChatInputProps,
  ChatInputClassNames as HeadlessChatInputClassNames,
  ChatInputStyles as HeadlessChatInputStyles,
  ChatInputHandle as HeadlessChatInputHandle,
} from "./input/ChatInput";

export { HeadlessSlashCommandMenu } from "./input/SlashCommandMenu";
export type {
  SlashCommandMenuProps as HeadlessSlashCommandMenuProps,
  SlashCommand,
} from "./input/SlashCommandMenu";

export { HeadlessSendButton } from "./buttons/SendButton";
export type { SendButtonProps as HeadlessSendButtonProps } from "./buttons/SendButton";

export { HeadlessAttachButton } from "./buttons/AttachButton";
export type { AttachButtonProps as HeadlessAttachButtonProps } from "./buttons/AttachButton";

export { StopButton } from "./buttons/StopButton";
export type { StopButtonProps } from "./buttons/StopButton";

export { RecordButton } from "./buttons/RecordButton";
export type { RecordButtonProps } from "./buttons/RecordButton";

export { TranscribeButton } from "./buttons/TranscribeButton";
export type { TranscribeButtonProps } from "./buttons/TranscribeButton";

// ── Message primitives ────────────────────────────────────────────────────
export { MessageList } from "./messages/MessageList";
export type { MessageListProps, MessageListComponentSlots, MessageListEmptyProps } from "./messages/MessageList";

export { UserMessage } from "./messages/UserMessage";
export type { UserMessageProps } from "./messages/UserMessage";

export { SystemMessage } from "./messages/SystemMessage";
export type { SystemMessageProps } from "./messages/SystemMessage";

export { AssistantMessage } from "./messages/AssistantMessage";
export type { AssistantMessageProps, AssistantMessageSlots } from "./messages/AssistantMessage";

export { ThoughtWindow } from "./messages/thoughts/ThoughtWindow";
export type { ThoughtWindowProps } from "./messages/thoughts/ThoughtWindow";

export { ConfirmationBlock } from "./messages/ConfirmationBlock";
export type { ConfirmationBlockProps, ConfirmationOption } from "./messages/ConfirmationBlock";

export { ActionBlockSlot } from "./messages/ActionBlockSlot";
export type { ActionBlockSlotProps } from "./messages/ActionBlockSlot";

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
