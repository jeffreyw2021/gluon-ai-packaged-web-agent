"use client";

import React, { useCallback, type CSSProperties } from "react";
import { useAgentContext } from "../provider/AgentProvider";
import { MessageList } from "../messages/MessageList";
import { ChatInput } from "../input/ChatInput";
import { buildSendPayload } from "../lib/attachmentPayload";
import type { UseAttachmentsReturn } from "../hooks/useAttachments";
import type { MessageListComponentSlots } from "../messages/MessageList";
import type { ChatInputClassNames, ChatInputStyles } from "../input/ChatInput";

export type AgentPanelMode = "minimal" | "fullscreen" | "sideBySide";

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
  mode?: AgentPanelMode;
  /** Called when the user should trigger expand (e.g. click on minimal dock). */
  onRequestExpand?: () => void;
  onRequestCollapse?: () => void;
  /** Show/hide the sidebar slot (default true in fullscreen/sideBySide). */
  showSidebar?: boolean;
  /** Render a custom sidebar instead of nothing. */
  renderSidebar?: () => React.ReactNode;
  /** Render a custom header instead of the default title row. */
  renderHeader?: () => React.ReactNode;
  /** Override message list sub-components. */
  messageComponents?: MessageListComponentSlots;
  /** Suggested prompts shown in empty state. */
  suggestedPrompts?: string[];
  /**
   * Pass the return value of `useAttachments()` to support file attachments.
   * When provided, the attachment payload is included in the sent message and
   * files are cleared after each send. `hasAttachments` is also forwarded to
   * `ChatInput` so the send button is enabled when files are attached.
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
 * (`data-slot` attributes) based on `mode` — zero built-in styles.
 *
 * Slots: `data-slot="agent-panel"`, `"sidebar"`, `"main"`, `"header"`, `"body"`, `"input"`
 *
 * In `minimal` mode the panel renders a compact dock with only the input.
 * In `fullscreen` / `sideBySide` it renders sidebar + main column.
 */
export function AgentPanel({
  mode = "fullscreen",
  onRequestExpand,
  onRequestCollapse,
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

  const prompts = suggestedPrompts ?? ctxPrompts;
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

  if (mode === "minimal") {
    return (
      <div
        data-slot="agent-panel"
        data-mode="minimal"
        className={className ?? classNames.root}
        style={style ?? styles.root}
        onClick={onRequestExpand}
        role={onRequestExpand ? "button" : undefined}
        tabIndex={onRequestExpand ? 0 : undefined}
        aria-label={onRequestExpand ? "Expand chat" : undefined}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          data-slot="input"
          className={classNames.input?.root}
          style={styles.input?.root}
        >
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
    );
  }

  return (
    <div
      data-slot="agent-panel"
      data-mode={mode}
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
          {renderHeader ? (
            renderHeader()
          ) : (
            <>
              <span data-slot="title" />
              {onRequestCollapse && (
                <button
                  type="button"
                  aria-label="Collapse"
                  onClick={onRequestCollapse}
                />
              )}
            </>
          )}
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
