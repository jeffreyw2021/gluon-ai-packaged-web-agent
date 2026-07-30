import type { UIMessage } from "ai";
import type { RunActivityPhase } from "./RunActivityPhase";
import type { RunPhase } from "./RunPhase";
import type { ReasoningMode } from "./ReasoningMode";
import type { TokenUsage } from "./TokenUsage";

export type { ReasoningMode };

export interface SendOpts {
  messageId?: string;
  metadata?: Record<string, unknown>;
  /** Override the current reasoning mode for this one send. */
  reasoningMode?: ReasoningMode;
}

export interface ComposerState {
  inputText: string;
  setInputText: (text: string) => void;
}

export interface AgentChat {
  id: string;
  title: string;
  userId: string;
  activeJobRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSessionAdapter {
  activeChatId: string | null;
  messages: UIMessage[];
  runPhase: RunPhase;
  runActivity: RunActivityPhase | null;
  awaitingApprovalId: string | null;

  isChatLoading: boolean;
  isActiveChatLatched: boolean;
  isLocallyAborted: boolean;
  isStreaming: boolean;
  isGenerating: boolean;
  isSubmitting: boolean;

  /** Token counts for the most recently completed run. Null before any run completes or while a run is in progress. */
  lastRunUsage: TokenUsage | null;

  /** Current reasoning mode ("auto" | "thinking" | "simple"). */
  reasoningMode: ReasoningMode;
  setReasoningMode: (mode: ReasoningMode) => void;

  sendUserMessage(text: string, opts?: SendOpts): Promise<void>;
  stopGeneration(): Promise<void>;
  submitToolApproval(opts: {
    approvalId: string;
    approved: boolean;
    reason?: string;
  }): Promise<void>;
  submitClientToolOutput(toolCallId: string, output: unknown): Promise<void>;

  chats: AgentChat[] | undefined;
  busyChatIds: ReadonlySet<string>;
  unseenCompletedChatIds: ReadonlySet<string>;
  composer: ComposerState;
  selectChat(id: string): void;
  newChat(): void;
  deleteChat(id: string): void;
}
