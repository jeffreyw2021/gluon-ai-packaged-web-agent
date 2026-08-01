"use client";

import React, { useCallback, type CSSProperties } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { MessageList } from "../messages/MessageList";
import { ChatInput } from "../input/ChatInput";
import { buildSendPayload } from "../lib/attachmentPayload";
import type { UseAttachmentsReturn } from "../hooks/useAttachments";
import type { MessageListComponentSlots } from "../messages/MessageList";
import type { ChatInputClassNames, ChatInputStyles } from "../input/ChatInput";

export interface AgentPanelClassNames {
  root?: string;
  sidebar?: string;
  main?: string;
  header?: string;
  body?: string;
  input?: ChatInputClassNames;
}

export interface AgentPanelStyles {
  root?: CSSProperties;
  sidebar?: CSSProperties;
  main?: CSSProperties;
  header?: CSSProperties;
  body?: CSSProperties;
  input?: ChatInputStyles;
}

export interface AgentPanelProps {
  /** Show/hide the sidebar slot (default true). */
  showSidebar?: boolean;
  /** Render a custom sidebar. */
  renderSidebar?: () => React.ReactNode;
  /** Render a custom header. */
  renderHeader?: () => React.ReactNode;
  /** Override message list sub-components. */
  messageComponents?: MessageListComponentSlots;
  /** Suggested prompts shown in empty state. */
  suggestedPrompts?: string[];
  /**
   * Pass the return value of `useAttachments()` to support file attachments.
   * When provided, the attachment payload is included in the sent message and
   * files are cleared after each send.
   *
   * @example
   * ```tsx
   * const attachments = useAttachments();
   * <AgentPanel attachments={attachments} />
   * ```
   */
  attachments?: UseAttachmentsReturn;
  className?: string;
  style?: CSSProperties;
  classNames?: AgentPanelClassNames;
  styles?: AgentPanelStyles;
}

/**
 * Headless AgentPanel orchestrator. Renders the structural skeleton
 * (`data-slot` attributes) — zero built-in styles.
 *
 * Slots: `data-slot="agent-panel"`, `"sidebar"`, `"main"`, `"header"`, `"body"`, `"input"`
 */
export function AgentPanel({
  showSidebar = true,
  renderSidebar,
  renderHeader,
  messageComponents,
  suggestedPrompts,
  attachments,
  className,
  style,
  classNames = {},
  styles = {},
}: AgentPanelProps) {
  const { adapter, actionBlocks, suggestedPrompts: ctxPrompts } = useAgentContext();
  const {
    messages,
    runPhase,
    runActivity,
    awaitingApprovalId,
    isChatLoading,
    composer,
    submitToolApproval,
    sendUserMessage,
    stopGeneration,
  } = adapter;

  const prompts = suggestedPrompts ?? ctxPrompts ?? undefined;
  const hasAttachments = (attachments?.attachments.length ?? 0) > 0;

  const handleSend = useCallback(() => {
    const text = composer.inputText.trim();
    const attachmentList = attachments?.attachments ?? [];
    const payload = buildSendPayload(text, attachmentList);
    if (!payload && attachmentList.length === 0) return;
    composer.setInputText("");
    attachments?.clearAll();
    void sendUserMessage(payload ?? text);
  }, [composer, sendUserMessage, attachments]);

  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      composer.setInputText(prompt);
      void sendUserMessage(prompt);
    },
    [composer, sendUserMessage],
  );

  return (
    <div
      data-slot="agent-panel"
      className={className ?? classNames.root}
      style={style ?? styles.root}
    >
      {showSidebar && renderSidebar && (
        <div data-slot="sidebar" className={classNames.sidebar} style={styles.sidebar}>
          {renderSidebar()}
        </div>
      )}

      <div data-slot="main" className={classNames.main} style={styles.main}>
        <div data-slot="header" className={classNames.header} style={styles.header}>
          {renderHeader ? renderHeader() : <span data-slot="title" />}
        </div>

        <div data-slot="body" className={classNames.body} style={styles.body}>
          {isChatLoading ? (
            <div data-slot="loading" aria-live="polite">Loading…</div>
          ) : (
            <MessageList
              messages={messages}
              runPhase={runPhase}
              runActivity={runActivity}
              awaitingApprovalId={awaitingApprovalId}
              onApprove={submitToolApproval}
              actionBlocks={actionBlocks}
              suggestedPrompts={prompts}
              onSuggestedPrompt={handleSuggestedPrompt}
              components={messageComponents}
            />
          )}
        </div>

        <div data-slot="input" className={classNames.input?.root} style={styles.input?.root}>
          <ChatInput
            value={composer.inputText}
            onChange={composer.setInputText}
            onSend={handleSend}
            onStop={() => void stopGeneration()}
            runPhase={runPhase}
            hasAttachments={hasAttachments}
            classNames={classNames.input}
            styles={styles.input}
          />
        </div>
      </div>
    </div>
  );
}
