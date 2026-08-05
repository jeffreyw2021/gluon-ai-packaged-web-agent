import React, { Component, useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AgentProvider,
  GluonAgentPanel,
  ChatTopBar,
  ChatMessageList,
  ChatInputBar,
  ModeSwitch,
  NewChatButton,
  ChatSelect,
  ChatSelectMenu,
  EmptyView,
  SuggestedPromptButton,
  ChatInput,
  AttachButton,
  MicButton,
  SendButton,
  SlashCommandMenu,
  TranscriptionIndicator,
  HeadlessChatInput,
  HeadlessSendButton,
  HeadlessAttachButton,
  useAgentContext,
  useChatList,
  useAttachments,
  useRecorder,
  useSpeechTranscriber,
} from "gluon-ai/react";
import { ComponentDemo } from "../components/ComponentDemo";
import {
  DEMO_CONVERSATION_MESSAGES,
  DEMO_GLUON_BASE_PATH,
  DEMO_MSG_LIST_CHAT_ID,
  installDemoGluonApi,
  seedDemoChats,
  seedDemoThread,
  uninstallDemoGluonApi,
} from "../demo/mockGluonApi";
import { UI_LAYERS } from "../nav";

/* ─────────────────────────────────────────────────────────────────────────
   Shared infrastructure
   ───────────────────────────────────────────────────────────────────────── */

/**
 * All demos pass darkMode={true} to match the documentation site's dark theme.
 * If the site ever gains a light-mode toggle, wire `darkMode` from a ThemeContext here.
 */
const DARK = true;

const DEMO_PROMPTS = ["What can you do?", "Latest AI news?", "Help me research"];

/** Wraps a demo with the real AgentProvider (404s gracefully, shows empty state) */
function DemoProvider({ children }: { children: ReactNode }) {
  return (
    <AgentProvider basePath="/api/gluon" suggestedPrompts={DEMO_PROMPTS}>
      {children}
    </AgentProvider>
  );
}

/** Catches render errors so a broken demo doesn't break the page */
class DemoErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-3)", fontSize: "0.8rem" }}>
          Demo unavailable in static context
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Individual live demo components
   ───────────────────────────────────────────────────────────────────────── */

function GluonAgentPanelDemo() {
  useEffect(() => {
    installDemoGluonApi();
    return () => uninstallDemoGluonApi();
  }, []);

  return (
    <DemoErrorBoundary>
      <div style={{ width: 360, height: 740, overflow: "hidden", borderRadius: 14, boxShadow: "0 4px 32px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <GluonAgentPanel
          basePath={DEMO_GLUON_BASE_PATH}
          darkMode={DARK}
          suggestedPrompts={DEMO_PROMPTS}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </DemoErrorBoundary>
  );
}

function ChatTopBarDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <ChatTopBar darkMode={DARK} showReasoningPills showChatHistory />
        </div>
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

const MSG_LIST_FRAME: React.CSSProperties = {
  width: 360,
  height: 680,
  overflow: "hidden",
  background: "#0a0a0a",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  flexDirection: "column",
};

/** Selects a seeded chat once the adapter is ready. */
function SelectDemoChat({ chatId, children }: { chatId: string; children: ReactNode }) {
  const { adapter } = useAgentContext();
  useEffect(() => {
    if (adapter.activeChatId !== chatId) adapter.selectChat(chatId);
  }, [adapter, chatId]);
  return <>{children}</>;
}

function ChatMessageListConversationDemo() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    installDemoGluonApi();
    seedDemoThread(DEMO_MSG_LIST_CHAT_ID, DEMO_CONVERSATION_MESSAGES, "Demo chat");
    setReady(true);
    return () => uninstallDemoGluonApi();
  }, []);

  if (!ready) {
    return <div style={MSG_LIST_FRAME} />;
  }

  return (
    <AgentProvider basePath={DEMO_GLUON_BASE_PATH} suggestedPrompts={DEMO_PROMPTS}>
      <DemoErrorBoundary>
        <SelectDemoChat chatId={DEMO_MSG_LIST_CHAT_ID}>
          <div style={MSG_LIST_FRAME}>
            <ChatMessageList darkMode={DARK} />
          </div>
        </SelectDemoChat>
      </DemoErrorBoundary>
    </AgentProvider>
  );
}

function ChatMessageListEmptyDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <div style={MSG_LIST_FRAME}>
          <ChatMessageList darkMode={DARK} style={{ paddingBottom: 10 }} />
        </div>
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

function ChatInputBarDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <ChatInputBar darkMode={DARK} />
        </div>
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

function ModeSwitchDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <ModeSwitch darkMode={DARK} />
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

function NewChatButtonDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <NewChatButton darkMode={DARK} />
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

function ChatSelectDemo() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    installDemoGluonApi();
    seedDemoChats();
    setReady(true);
    return () => uninstallDemoGluonApi();
  }, []);
  if (!ready) return <div style={{ width: "100%", maxWidth: 280, height: 40 }} />;
  return (
    <AgentProvider basePath={DEMO_GLUON_BASE_PATH}>
      <DemoErrorBoundary>
        <div style={{ width: "100%", maxWidth: 280 }}>
          <ChatSelect darkMode={DARK} />
        </div>
      </DemoErrorBoundary>
    </AgentProvider>
  );
}

/* ── ChatSelectMenu standalone ── */

const MOCK_CHAT_LIST = [
  { id: "mc1", title: "AI model releases this week", userId: "demo", activeJobRunId: null, createdAt: "", updatedAt: "" },
  { id: "mc2", title: "Coding models deep dive",     userId: "demo", activeJobRunId: null, createdAt: "", updatedAt: "" },
  { id: "mc3", title: "What can you do?",             userId: "demo", activeJobRunId: null, createdAt: "", updatedAt: "" },
  { id: "mc4", title: "Comparing open-weight models", userId: "demo", activeJobRunId: null, createdAt: "", updatedAt: "" },
];

function ChatSelectMenuDemo() {
  const [activeId, setActiveId] = useState("mc1");
  return (
    <DemoErrorBoundary>
      <div style={{ padding: "24px 0", display: "flex", justifyContent: "center" }}>
        <ChatSelectMenu
          chats={MOCK_CHAT_LIST}
          activeChatId={activeId}
          onSelect={(id) => setActiveId(id)}
          onDelete={() => {}}
          darkMode={DARK}
          style={{ width: 300 }}
        />
      </div>
    </DemoErrorBoundary>
  );
}

/* ── SuggestedPromptButton ── */

function SuggestedPromptButtonDemo() {
  return (
    <DemoErrorBoundary>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "24px 0", width: "100%", maxWidth: 340 }}>
        {DEMO_PROMPTS.map((p) => (
          <SuggestedPromptButton key={p} label={p} darkMode={DARK} onClick={() => {}} />
        ))}
      </div>
    </DemoErrorBoundary>
  );
}

function EmptyViewDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <div style={MSG_LIST_FRAME}>
          <EmptyView darkMode={DARK} suggestedPrompts={DEMO_PROMPTS} />
        </div>
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

function ChatInputStandaloneDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <ChatInput
            darkMode={DARK}
            placeholder="Type a message…"
          />
        </div>
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

/* ── AttachButton ── */

function AttachButtonDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "32px 0" }}>
          <AttachButton darkMode={DARK} />
          <span style={{ fontSize: "0.78rem", color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace" }}>
            click → native file picker
          </span>
        </div>
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

/* ── MicButton ── */

function MicButtonDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "32px 0" }}>
          <MicButton darkMode={DARK} />
          <span style={{ fontSize: "0.78rem", color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace" }}>
            idle → red (listening) on click
          </span>
        </div>
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

/* ── SendButton ── */

function SendButtonDemoInner() {
  const { adapter } = useAgentContext();
  const { composer } = adapter;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360, padding: "20px 0" }}>
      <textarea
        value={composer.inputText}
        onChange={(e) => composer.setInputText(e.target.value)}
        placeholder="Type a message to activate the send button…"
        rows={3}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13,
          color: "#e5e5e5",
          resize: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace" }}>
          empty = idle · text = ready · sending = stop □
        </span>
        <SendButton darkMode={DARK} />
      </div>
    </div>
  );
}

function SendButtonDemo() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    installDemoGluonApi();
    setReady(true);
    return () => uninstallDemoGluonApi();
  }, []);
  if (!ready) return <div />;
  return (
    <AgentProvider basePath={DEMO_GLUON_BASE_PATH} suggestedPrompts={DEMO_PROMPTS}>
      <DemoErrorBoundary>
        <SendButtonDemoInner />
      </DemoErrorBoundary>
    </AgentProvider>
  );
}

/* ── SlashCommandMenu ── */

const DEMO_SLASH_COMMANDS = [
  { id: "summarize", label: "Summarize", description: "Condense the conversation into a context snapshot." },
  { id: "clear",    label: "Clear",     description: "Start a fresh chat session." },
];

function SlashCommandMenuDemo() {
  const [highlighted, setHighlighted] = useState(0);
  return (
    <DemoErrorBoundary>
      <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", maxWidth: 320 }}>
        <SlashCommandMenu
          commands={DEMO_SLASH_COMMANDS}
          highlightedIndex={highlighted}
          onSelect={() => {}}
          darkMode={DARK}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {DEMO_SLASH_COMMANDS.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => setHighlighted(i)}
              style={{
                padding: "2px 10px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "JetBrains Mono, monospace",
                background: highlighted === i ? "var(--text-1)" : "var(--surface-2)",
                color: highlighted === i ? "var(--bg)" : "var(--text-3)",
                border: "1px solid var(--border-2)",
                transition: "all 0.1s",
              }}
            >
              hover {i}
            </button>
          ))}
        </div>
      </div>
    </DemoErrorBoundary>
  );
}

/* ── TranscriptionIndicator ── */

function TranscriptionIndicatorDemoContent() {
  const transcriber = useSpeechTranscriber();
  return (
    <div style={{ width: "100%", maxWidth: 360, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
      <TranscriptionIndicator transcriber={transcriber} darkMode={DARK} />
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 14px 12px" }}>
        <MicButton transcriber={transcriber} darkMode={DARK} />
      </div>
    </div>
  );
}

function TranscriptionIndicatorDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <TranscriptionIndicatorDemoContent />
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

/* ── Session hooks ── */

function SessionHooksDemoInner() {
  const { adapter } = useAgentContext();
  const { messages, isStreaming, reasoningMode, setReasoningMode } = adapter;
  const { chats } = useChatList();

  const label: React.CSSProperties = {
    color: "var(--text-3)",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.7rem",
    minWidth: 150,
  };
  const value: React.CSSProperties = {
    color: "var(--text-1)",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.7rem",
  };
  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "6px 14px",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div style={{ width: "100%", maxWidth: 440, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={row}>
        <span style={label}>messages</span>
        <span style={value}>{messages.length}</span>
      </div>
      <div style={row}>
        <span style={label}>isStreaming</span>
        <span style={{ ...value, color: isStreaming ? "#4ade80" : "var(--text-3)" }}>
          {String(isStreaming)}
        </span>
      </div>
      <div style={row}>
        <span style={label}>chats</span>
        <span style={value}>{chats?.length ?? 0}</span>
      </div>
      <div style={{ ...row, borderBottom: "none", flexWrap: "wrap", gap: 8 }}>
        <span style={label}>reasoningMode</span>
        <div style={{ display: "flex", gap: 4 }}>
          {(["simple", "auto", "thinking"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setReasoningMode(m)}
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "JetBrains Mono, monospace",
                background: reasoningMode === m ? "var(--text-1)" : "var(--surface-2)",
                color: reasoningMode === m ? "var(--bg)" : "var(--text-3)",
                border: "1px solid var(--border-2)",
                transition: "all 0.12s",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionHooksDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <SessionHooksDemoInner />
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

/* ── Input hooks ── */

function InputHooksDemoInner() {
  const { adapter } = useAgentContext();
  const { composer } = adapter;
  const attachments = useAttachments();

  return (
    <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 20, fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-3)", padding: "0 2px 2px" }}>
        <span>text.length: <span style={{ color: "var(--text-1)" }}>{composer.inputText.length}</span></span>
        <span>attachments: <span style={{ color: "var(--text-1)" }}>{attachments.attachments.length}</span></span>
      </div>
      <textarea
        value={composer.inputText}
        onChange={(e) => composer.setInputText(e.target.value)}
        placeholder="Type here… (composer.inputText / composer.setInputText)"
        style={{
          width: "100%",
          height: 80,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: 12,
          color: "var(--text-1)",
          resize: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => attachments.openPicker()}
          style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid var(--border-2)", background: "var(--surface-2)", fontSize: 11, color: "var(--text-2)", cursor: "pointer", fontFamily: "inherit" }}
        >
          Attach file
        </button>
        <HeadlessSendButton
          style={{ padding: "5px 16px", borderRadius: 5, background: "var(--text-1)", color: "var(--bg)", border: "none", fontSize: 11, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}
        >
          Send
        </HeadlessSendButton>
      </div>
    </div>
  );
}

function InputHooksDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <InputHooksDemoInner />
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

/* ── Voice hooks ── */

function VoiceHooksDemo() {
  const recorder = useRecorder();
  const transcriber = useSpeechTranscriber();

  const label: React.CSSProperties = {
    color: "var(--text-3)",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.7rem",
    minWidth: 150,
    flexShrink: 0,
  };
  const val: React.CSSProperties = {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.7rem",
    color: "var(--text-1)",
    wordBreak: "break-word",
  };
  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "6px 14px",
    borderBottom: "1px solid var(--border)",
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: "0.65rem",
    fontFamily: "JetBrains Mono, monospace",
    color: "var(--accent)",
    padding: "4px 14px",
    background: "var(--surface-2)",
    borderBottom: "1px solid var(--border)",
  };
  const btnBase: React.CSSProperties = {
    padding: "3px 10px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    fontFamily: "inherit",
    transition: "background 0.15s",
  };

  return (
    <div style={{ width: "100%", maxWidth: 420, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "visible" }}>
      {/* useRecorder */}
      <div style={sectionLabel}>useRecorder</div>
      <div style={row}>
        <span style={label}>isRecording</span>
        <span style={{ ...val, color: recorder.isRecording ? "#ef4444" : "var(--text-3)" }}>{String(recorder.isRecording)}</span>
      </div>
      <div style={row}>
        <span style={label}>duration</span>
        <span style={val}>{recorder.duration}s</span>
      </div>
      <div style={row}>
        <span style={label}>audioBlob</span>
        <span style={{ ...val, color: recorder.audioBlob ? "var(--text-1)" : "var(--text-3)" }}>
          {recorder.audioBlob ? `${recorder.audioBlob.size} bytes` : "null"}
        </span>
      </div>
      <div style={{ ...row, justifyContent: "flex-end", borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => recorder.isRecording ? recorder.stop() : recorder.start()}
          style={{ ...btnBase, background: recorder.isRecording ? "#ef4444" : "var(--text-1)", color: recorder.isRecording ? "#fff" : "var(--bg)" }}
        >
          {recorder.isRecording ? "● Stop" : "Record"}
        </button>
        {recorder.audioBlob && (
          <button onClick={recorder.clear} style={{ ...btnBase, background: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border-2)" }}>
            Clear
          </button>
        )}
      </div>

      {/* useSpeechTranscriber */}
      <div style={sectionLabel}>useSpeechTranscriber</div>
      <div style={row}>
        <span style={label}>listening</span>
        <span style={{ ...val, color: transcriber.listening ? "#4ade80" : "var(--text-3)" }}>{String(transcriber.listening)}</span>
      </div>
      <div style={row}>
        <span style={label}>transcript</span>
        <span style={{ ...val, maxWidth: 200 }}>{transcriber.transcript || "–"}</span>
      </div>
      <div style={{ ...row, borderBottom: "none" }}>
        <span style={label}>interim</span>
        <span style={{ ...val, color: "var(--text-3)", maxWidth: 200 }}>{transcriber.interimTranscript || "–"}</span>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "8px 14px", justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            if (transcriber.listening) {
              transcriber.stop();
            } else {
              transcriber.reset();
              transcriber.start();
            }
          }}
          style={{ ...btnBase, background: transcriber.listening ? "#ef4444" : "var(--text-1)", color: transcriber.listening ? "#fff" : "var(--bg)" }}
        >
          {transcriber.listening ? "● Stop" : "Start listening"}
        </button>
        {transcriber.transcript && (
          <button onClick={transcriber.reset} style={{ ...btnBase, background: "var(--surface-2)", color: "var(--text-3)", border: "1px solid var(--border-2)" }}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Headless message primitives ── */

function HeadlessMessagesDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <div style={{ width: "100%", maxWidth: 440, height: 300, overflow: "hidden", background: "#0a0a0a", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
          <ChatMessageList darkMode={DARK} autoScroll />
        </div>
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

/* ── Headless input primitives ── */

function HeadlessInputDemoInner() {
  const { adapter } = useAgentContext();
  const { composer, sendUserMessage, runPhase } = adapter;

  return (
    <div style={{ width: "100%", maxWidth: 440, border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}>
        HeadlessChatInput — you control all styles
      </div>
      <HeadlessChatInput
        value={composer.inputText}
        onChange={composer.setInputText}
        onSend={async () => { await sendUserMessage(composer.inputText); }}
        runPhase={runPhase}
        placeholder="Type here…"
        style={{
          display: "block",
          width: "100%",
          resize: "none",
          minHeight: 64,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "8px 10px",
          fontSize: 12,
          color: "var(--text-1)",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
        renderSubmitButton={({ canSend }) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, paddingTop: 6 }}>
            <HeadlessAttachButton
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-3)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Attach
            </HeadlessAttachButton>
            <HeadlessSendButton
              style={{
                padding: "4px 14px",
                borderRadius: 4,
                background: canSend ? "var(--text-1)" : "var(--surface-2)",
                color: canSend ? "var(--bg)" : "var(--text-3)",
                border: "1px solid var(--border)",
                fontSize: 11,
                cursor: canSend ? "pointer" : "default",
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
            >
              Send
            </HeadlessSendButton>
          </div>
        )}
      />
    </div>
  );
}

function HeadlessInputDemo() {
  return (
    <DemoProvider>
      <DemoErrorBoundary>
        <HeadlessInputDemoInner />
      </DemoErrorBoundary>
    </DemoProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Component registry
   ───────────────────────────────────────────────────────────────────────── */

interface DemoSection {
  /** Optional heading shown above this demo panel. */
  heading?: string;
  Demo: React.ComponentType;
  code: string;
  /** Override the demo split min-height (default: 360). */
  minHeight?: number;
}

interface ComponentEntry {
  title: string;
  layer: string;
  description: string;
  /** Single-demo entries. Ignored when `demos` is set. */
  Demo?: React.ComponentType;
  code?: string;
  minHeight?: number;
  /** Multiple stacked demos (e.g. conversation + empty state). */
  demos?: DemoSection[];
  props?: { name: string; type: string; description: string }[];
}

const REGISTRY: Record<string, ComponentEntry> = {
  GluonAgentPanel: {
    title: "GluonAgentPanel",
    layer: "Layer 1 — Drop-in",
    description: "Zero-config panel. Bundles AgentProvider + ChatTopBar + ChatMessageList + ChatInputBar in a single pre-styled import. This live demo mocks the API: send a message or click a prompt to see thinking, then a streamed reply. Try /summarize for the summarize flow.",
    Demo: GluonAgentPanelDemo,
    minHeight: 780,
    code: `import { GluonAgentPanel } from "gluon-ai/react";

export default function Page() {
  return (
    <GluonAgentPanel
      basePath="/api/gluon"
      darkMode
      suggestedPrompts={[
        "What can you do?",
        "Latest AI news?",
        "Help me research",
      ]}
      actionBlocks={{ my_tool: MyToolBlock }}
    />
  );
}`,
    props: [
      { name: "basePath", type: "string", description: "Base URL of your Gluon API route, e.g. /api/gluon." },
      { name: "darkMode", type: "boolean", description: "Forces dark theme regardless of system preference." },
      { name: "frostedGlass", type: "boolean", description: "Renders the panel with a translucent, blurred background." },
      { name: "suggestedPrompts", type: "string[]", description: "Prompt chips shown in the empty state." },
      { name: "actionBlocks", type: "Record<string, ComponentType>", description: "Map of tool name → React component for custom tool UI." },
      { name: "style / className", type: "CSSProperties / string", description: "Root element style and class overrides." },
    ],
  },

  ChatTopBar: {
    title: "ChatTopBar",
    layer: "Layer 2 — Compose Regions",
    description: "Sticky top bar with reasoning-mode pills, chat history selector, and new-chat button. All state is read/written from the nearest AgentProvider automatically.",
    Demo: ChatTopBarDemo,
    code: `import { AgentProvider, ChatTopBar } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  <ChatTopBar
    darkMode
    showReasoningPills
    showChatHistory
    onNewChat={() => console.log("new chat")}
    slots={{ newChatButton: <MyButton /> }}
  />
</AgentProvider>`,
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "showReasoningPills", type: "boolean", description: "Renders the Simple / Auto / Think mode switcher." },
      { name: "showChatHistory", type: "boolean", description: "Renders the chat history dropdown." },
      { name: "onNewChat", type: "() => void", description: "Callback fired when the new-chat button is clicked." },
      { name: "slots.newChatButton", type: "ReactNode", description: "Replace the default new-chat button with your own." },
    ],
  },

  ChatMessageList: {
    title: "ChatMessageList",
    layer: "Layer 2 — Compose Regions",
    description: "Scrollable message thread with auto-scroll, skeletons, and granular slot overrides for every bubble type. Below: a seeded conversation ending with a Summarized marker, then the empty state.",
    demos: [
      {
        heading: "With messages",
        Demo: ChatMessageListConversationDemo,
        minHeight: 720,
        code: `import { AgentProvider, ChatMessageList } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  {/* Messages come from the active chat thread */}
  <ChatMessageList darkMode />
</AgentProvider>`,
      },
      {
        heading: "Empty state",
        Demo: ChatMessageListEmptyDemo,
        minHeight: 720,
        code: `import { AgentProvider, ChatMessageList } from "gluon-ai/react";

<AgentProvider
  basePath="/api/gluon"
  suggestedPrompts={[
    "What can you do?",
    "Latest AI news?",
    "Help me research",
  ]}
>
  {/* No active messages → EmptyView */}
  <ChatMessageList darkMode />
</AgentProvider>`,
      },
    ],
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "autoScroll", type: "boolean", description: "Scrolls to the bottom when new content streams in." },
      { name: "emptyView", type: "ReactNode", description: "Rendered when there are no messages." },
      { name: "skeleton", type: "ReactNode", description: "Rendered while the first messages load." },
      { name: "slots.userMessage", type: "(props) => ReactNode", description: "Replace the user bubble." },
      { name: "slots.assistantMessage", type: "(props) => ReactNode", description: "Replace the assistant bubble." },
      { name: "slots.thoughtWindow", type: "(props) => ReactNode", description: "Replace the tool-progress panel." },
    ],
  },

  ChatInputBar: {
    title: "ChatInputBar",
    layer: "Layer 2 — Compose Regions",
    description: "Full-width input footer with file attachment, voice recording, and a swappable send button. Type and interact — it wires to the AgentProvider above.",
    Demo: ChatInputBarDemo,
    code: `import { AgentProvider, ChatInputBar } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  <ChatInputBar
    darkMode
    slots={{ sendButton: <MySendButton /> }}
  />
</AgentProvider>`,
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "slots.sendButton", type: "ReactNode", description: "Replace the default send button." },
    ],
  },

  ModeSwitch: {
    title: "ModeSwitch",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled reasoning-mode pill toggle used by ChatTopBar. Reads and writes reasoningMode from the nearest AgentProvider automatically — no props needed beyond darkMode.",
    Demo: ModeSwitchDemo,
    code: `import { AgentProvider, ModeSwitch } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  <ModeSwitch darkMode />
</AgentProvider>`,
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "style / className", type: "—", description: "Layout overrides on the pill container." },
    ],
  },

  NewChatButton: {
    title: "NewChatButton",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled button used by ChatTopBar. Calls useChatList().newChat() on click automatically. Click it to start a new chat session.",
    Demo: NewChatButtonDemo,
    code: `import { AgentProvider, NewChatButton } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  <NewChatButton darkMode />
</AgentProvider>`,
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "onClick", type: "() => void", description: "Override the default newChat behavior." },
    ],
  },

  ChatSelect: {
    title: "ChatSelect",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled trigger button used by ChatTopBar that opens a ChatSelectMenu dropdown. Click to reveal the seeded chat sessions below. Reads the chat list from AgentProvider automatically.",
    Demo: ChatSelectDemo,
    code: `import { AgentProvider, ChatSelect } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  <ChatSelect darkMode />
</AgentProvider>`,
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "maxVisible", type: "number", description: "Max sessions shown before scrolling (default: 8)." },
    ],
  },

  ChatSelectMenu: {
    title: "ChatSelectMenu",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled scrollable list of chat history rows. Each row is a ChatSelectMenuItem. Composed inside ChatSelect or rendered standalone by passing chats, activeChatId, onSelect, and onDelete directly.",
    Demo: ChatSelectMenuDemo,
    code: `import { AgentProvider, ChatSelectMenu } from "gluon-ai/react";

// Used standalone — supply your own chats data
<ChatSelectMenu
  chats={chats}
  activeChatId={activeChatId}
  onSelect={(id) => setActiveChat(id)}
  onDelete={(id) => deleteChat(id)}
  darkMode
/>`,
    props: [
      { name: "chats", type: "AgentChat[] | undefined", description: "List of chat sessions to display." },
      { name: "activeChatId", type: "string | null", description: "Currently selected chat ID (highlighted row)." },
      { name: "onSelect", type: "(id: string) => void", description: "Called when the user clicks a row." },
      { name: "onDelete", type: "(id: string) => void", description: "Called when the user deletes a row." },
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "components.item", type: "ComponentType<ChatSelectMenuItemProps>", description: "Replace the default row component." },
    ],
  },

  EmptyView: {
    title: "EmptyView",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled empty-state shown by ChatMessageList when there are no messages. Renders a column of SuggestedPromptButton chips from suggestedPrompts. Click a chip — it populates the composer.",
    Demo: EmptyViewDemo,
    minHeight: 720,
    code: `import { AgentProvider, EmptyView } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  <EmptyView
    darkMode
    suggestedPrompts={[
      "What can you do?",
      "Latest AI news?",
      "Help me research",
    ]}
  />
</AgentProvider>`,
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "suggestedPrompts", type: "string[]", description: "Prompt chips to display. Falls back to agent config." },
      { name: "maxSuggestedPrompts", type: "number", description: "Caps the number of chips shown." },
    ],
  },

  SuggestedPromptButton: {
    title: "SuggestedPromptButton",
    layer: "Layer 3 — Styled Atomic",
    description: "Individual prompt chip button used by EmptyView. Renders a truncated label with an arrow icon. Place standalone or in a row — no AgentProvider required.",
    Demo: SuggestedPromptButtonDemo,
    code: `import { SuggestedPromptButton } from "gluon-ai/react";

<SuggestedPromptButton
  label="What can you do?"
  darkMode
  onClick={() => sendPrompt("What can you do?")}
/>`,
    props: [
      { name: "label", type: "string", description: "The prompt text displayed on the chip." },
      { name: "onClick", type: "() => void", description: "Called when the chip is clicked." },
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "style / className", type: "—", description: "Root element overrides." },
    ],
  },

  ChatInput: {
    title: "ChatInput",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled twin of HeadlessChatInput. Frosted-glass textarea that wires composer state from AgentProvider automatically. Type to interact — the renderSubmitButton slot is where you compose AttachButton, MicButton, and SendButton.",
    Demo: ChatInputStandaloneDemo,
    code: `import { AgentProvider, ChatInput } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  <ChatInput
    darkMode
    placeholder="Ask anything…"
    renderSubmitButton={() => (
      // Compose AttachButton / MicButton / SendButton here
      <div style={{ display: "flex", gap: 4, padding: "0 10px 10px" }}>
        {/* See AttachButton, MicButton, SendButton pages */}
      </div>
    )}
  />
</AgentProvider>`,
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "placeholder", type: "string", description: "Textarea placeholder text." },
      { name: "renderSubmitButton", type: "() => ReactNode", description: "Action row slot — rendered below the textarea." },
      { name: "onSend", type: "() => void", description: "Override the default send behavior." },
      { name: "hideTextarea", type: "boolean", description: "Hide the textarea (e.g. while mic is listening)." },
    ],
  },

  AttachButton: {
    title: "AttachButton",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled twin of HeadlessAttachButton. Paperclip icon button that opens a native file picker. Reads useAttachments() from context automatically; pass onFiles to override. Click to open the picker.",
    Demo: AttachButtonDemo,
    code: `import { AgentProvider, AttachButton } from "gluon-ai/react";

<AgentProvider basePath="/api/gluon">
  <AttachButton
    darkMode
    accept="image/*,.pdf"
    onFiles={(files) => console.log(files)}
  />
</AgentProvider>`,
    props: [
      { name: "onFiles", type: "(files: File[]) => void", description: "Override the default attachment handler." },
      { name: "accept", type: "string", description: "File types to accept (default: '*')." },
      { name: "multiple", type: "boolean", description: "Allow multiple file selection (default: true)." },
      { name: "disabled", type: "boolean", description: "Disables the button." },
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
    ],
  },

  MicButton: {
    title: "MicButton",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled twin of TranscribeButton (headless). Mic icon that toggles the Web Speech API via useSpeechTranscriber. Share a transcriber instance with TranscriptionIndicator to display live text. Renders null when speech recognition is unsupported.",
    Demo: MicButtonDemo,
    code: `import { AgentProvider, MicButton, TranscriptionIndicator, useSpeechTranscriber } from "gluon-ai/react";

function VoiceInput() {
  const transcriber = useSpeechTranscriber();

  return (
    <>
      <TranscriptionIndicator transcriber={transcriber} darkMode />
      <MicButton transcriber={transcriber} darkMode />
    </>
  );
}`,
    props: [
      { name: "transcriber", type: "UseSpeechTranscriberReturn", description: "Share with TranscriptionIndicator for live display. Omit to use an internal instance." },
      { name: "onTranscribed", type: "(text: string) => void", description: "Called with the final transcript. Defaults to appending to composer." },
      { name: "lang", type: "string", description: "BCP-47 language tag (default: 'en-US')." },
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
    ],
  },

  SendButton: {
    title: "SendButton",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled twin of HeadlessSendButton. Arrow-right icon that sends the composer text; switches to a stop (square) icon while a run is active. Type in the box below to see idle → ready, then click to see the stop state during streaming.",
    Demo: SendButtonDemo,
    code: `import { AgentProvider, SendButton } from "gluon-ai/react";

// Reads composer.inputText and runPhase from AgentProvider automatically
<AgentProvider basePath="/api/gluon">
  <SendButton darkMode />
</AgentProvider>`,
    props: [
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "text", type: "string", description: "Override the text to send (default: composer.inputText)." },
      { name: "disabled", type: "boolean", description: "Force idle state (e.g. while mic is listening)." },
      { name: "attachments", type: "Pick<UseAttachmentsReturn, ...>", description: "Include file content and clear attachments on send." },
    ],
  },

  SlashCommandMenu: {
    title: "SlashCommandMenu",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled twin of HeadlessSlashCommandMenu. Floating card with /-badged command rows. Position via the style prop (e.g. position: absolute, bottom: 100%). Keyboard nav and open/close state are driven by the parent (ChatInputBar).",
    Demo: SlashCommandMenuDemo,
    code: `import { SlashCommandMenu } from "gluon-ai/react";

// Typically used via ChatInputBar's built-in slash handling.
// To control manually:
<SlashCommandMenu
  commands={[
    { id: "summarize", label: "Summarize", description: "Condense earlier messages." },
  ]}
  highlightedIndex={0}
  onSelect={(cmd) => execute(cmd)}
  darkMode
  style={{ position: "absolute", bottom: "100%", left: 0, width: 280 }}
/>`,
    props: [
      { name: "commands", type: "SlashCommand[]", description: "List of command objects to display." },
      { name: "highlightedIndex", type: "number", description: "Index of the keyboard-highlighted row." },
      { name: "onSelect", type: "(cmd: SlashCommand) => void", description: "Called when a row is clicked or entered." },
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "style / className", type: "—", description: "Position and size overrides for the card." },
    ],
  },

  TranscriptionIndicator: {
    title: "TranscriptionIndicator",
    layer: "Layer 3 — Styled Atomic",
    description: "Styled twin of LiveTranscript. Renders a pulsing red dot and the live speech text while the mic is active. Share a useSpeechTranscriber() instance with MicButton. Click the mic below to activate.",
    Demo: TranscriptionIndicatorDemo,
    code: `import {
  AgentProvider,
  MicButton,
  TranscriptionIndicator,
  useSpeechTranscriber,
} from "gluon-ai/react";

function VoiceComposer() {
  const transcriber = useSpeechTranscriber();

  return (
    <>
      <TranscriptionIndicator transcriber={transcriber} darkMode />
      <MicButton transcriber={transcriber} darkMode />
    </>
  );
}`,
    props: [
      { name: "transcriber", type: "UseSpeechTranscriberReturn", description: "The transcriber instance from useSpeechTranscriber() — share with MicButton." },
      { name: "darkMode", type: "boolean", description: "Dark color palette." },
      { name: "style / className", type: "—", description: "Root element overrides." },
    ],
  },

  "hooks-session": {
    title: "Session hooks",
    layer: "Layer 4 — Headless",
    description: "Live hook state — click the mode buttons below to see reasoningMode change in real time. useAgentContext · useAgentAdapter · useChatList · useReasoningMode",
    Demo: SessionHooksDemo,
    code: `"use client";
import {
  AgentProvider,
  useAgentContext,
  useChatList,
} from "gluon-ai/react";

function MyChat() {
  const { adapter } = useAgentContext();
  const { messages, isStreaming, reasoningMode, setReasoningMode } = adapter;
  const { chats, newChat } = useChatList();

  return (
    <div>
      <p>Messages: {messages.length}</p>
      <p>Streaming: {String(isStreaming)}</p>
      <button onClick={newChat}>New Chat</button>
      {(["simple", "auto", "thinking"] as const).map((m) => (
        <button key={m} onClick={() => setReasoningMode(m)}>
          {m}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <AgentProvider basePath="/api/gluon">
      <MyChat />
    </AgentProvider>
  );
}`,
  },

  "hooks-input": {
    title: "Input hooks",
    layer: "Layer 4 — Headless",
    description: "Live composer state — type in the textarea and watch text.length update. Attach a file and watch the count. The Send button wires to the real adapter.",
    Demo: InputHooksDemo,
    code: `"use client";
import {
  AgentProvider,
  useAgentContext,
  useAttachments,
  HeadlessSendButton,
} from "gluon-ai/react";

function MyComposer() {
  const { adapter } = useAgentContext();
  const { composer } = adapter;
  const attachments = useAttachments();

  return (
    <div>
      <textarea
        value={composer.inputText}
        onChange={(e) => composer.setInputText(e.target.value)}
        placeholder="Ask anything…"
      />
      <p>Attached: {attachments.attachments.length} files</p>
      <button onClick={attachments.openPicker}>Attach</button>
      <HeadlessSendButton>Send</HeadlessSendButton>
    </div>
  );
}`,
  },

  "hooks-voice": {
    title: "Voice hooks",
    layer: "Layer 4 — Headless",
    description: "Two independent hooks. useRecorder captures audio via MediaRecorder (click Record). useSpeechTranscriber uses the Web Speech API for live speech-to-text (click Start listening).",
    Demo: VoiceHooksDemo,
    code: `"use client";
import { useRecorder, useSpeechTranscriber } from "gluon-ai/react";

function VoiceInput() {
  // MediaRecorder — captures audio blob
  const recorder = useRecorder();
  // Web Speech API — live speech-to-text
  const transcriber = useSpeechTranscriber();

  return (
    <div>
      {/* Recording */}
      <p>isRecording: {String(recorder.isRecording)}</p>
      <p>duration: {recorder.duration}s</p>
      <p>audioBlob: {recorder.audioBlob?.size ?? "null"} bytes</p>
      <button onClick={() => recorder.isRecording ? recorder.stop() : recorder.start()}>
        {recorder.isRecording ? "Stop" : "Record"}
      </button>

      {/* Live transcription */}
      <p>listening: {String(transcriber.listening)}</p>
      <p>transcript: {transcriber.transcript}</p>
      <button onClick={() => {
        if (transcriber.listening) {
          transcriber.stop();
        } else {
          transcriber.reset();
          transcriber.start();
        }
      }}>
        {transcriber.listening ? "Stop" : "Start listening"}
      </button>
    </div>
  );
}`,
  },

  "headless-messages": {
    title: "Message primitives",
    layer: "Layer 4 — Headless",
    description: "Fully unstyled message list and bubble components — MessageList, UserMessage, AssistantMessage, ThoughtWindow, ConfirmationBlock, ActionBlockSlot. The preview shows ChatMessageList (Layer 2) which composes these primitives with default styles.",
    Demo: HeadlessMessagesDemo,
    code: `"use client";
import {
  MessageList,
  UserMessage,
  AssistantMessage,
  ThoughtWindow,
  ActionBlockSlot,
} from "gluon-ai/react";

function MyThread() {
  return (
    <MessageList
      slots={{
        userMessage: (props) => (
          <UserMessage {...props} className="my-user-bubble" />
        ),
        assistantMessage: (props) => (
          <AssistantMessage
            {...props}
            slots={{
              thoughtWindow: (p) => <ThoughtWindow {...p} />,
              textContent: (p) => (
                <div className="prose">{p.text}</div>
              ),
            }}
          />
        ),
      }}
    />
  );
}`,
  },

  "headless-input": {
    title: "Input primitives",
    layer: "Layer 4 — Headless",
    description: "Unstyled input building blocks. The demo shows HeadlessChatInput + HeadlessSendButton + HeadlessAttachButton with custom styles applied. Type and click Send.",
    Demo: HeadlessInputDemo,
    code: `"use client";
import {
  AgentProvider,
  HeadlessChatInput,
  HeadlessSendButton,
  HeadlessAttachButton,
  useAgentContext,
} from "gluon-ai/react";

function BareInput() {
  const { adapter } = useAgentContext();
  const { composer, sendUserMessage, runPhase } = adapter;

  return (
    <HeadlessChatInput
      value={composer.inputText}
      onChange={composer.setInputText}
      onSend={async () => sendUserMessage(composer.inputText)}
      runPhase={runPhase}
      placeholder="Type here…"
      className="my-textarea"
      renderSubmitButton={({ canSend }) => (
        <>
          <HeadlessAttachButton className="my-attach-btn">
            Attach
          </HeadlessAttachButton>
          <HeadlessSendButton className="my-send-btn">
            Send
          </HeadlessSendButton>
        </>
      )}
    />
  );
}`,
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   Props table
   ───────────────────────────────────────────────────────────────────────── */

function PropsTable({ props }: { props: { name: string; type: string; description: string }[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", marginTop: "1.5rem" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border-2)" }}>
          {["Prop", "Type", "Description"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "0.4rem 0.75rem", color: "var(--text-3)", fontWeight: 500, fontSize: "0.75rem" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.map((p) => (
          <tr key={p.name} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "0.5rem 0.75rem", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem", color: "var(--text-1)", whiteSpace: "nowrap" }}>{p.name}</td>
            <td style={{ padding: "0.5rem 0.75rem", fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>{p.type}</td>
            <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-2)" }}>{p.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

export function UIComponentDetail() {
  const { component } = useParams<{ component: string }>();
  const navigate = useNavigate();
  const entry = component ? REGISTRY[component] : undefined;

  if (!entry) {
    return (
      <div style={{ paddingTop: "2rem" }}>
        <p style={{ color: "var(--text-3)" }}>Component not found.</p>
        <button className="nav-link" onClick={() => navigate("/ui-components")}>
          ← Back to UI Components
        </button>
      </div>
    );
  }

  const layerEntry = UI_LAYERS.find((l) =>
    l.components.some((c) => c.path === `/ui-components/${component}`)
  );

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-3)", marginBottom: "1.5rem" }}>
        <button
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 0, fontSize: "inherit" }}
          onClick={() => navigate("/ui-components")}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)")}
        >
          UI Components
        </button>
        <span>/</span>
        {layerEntry && (
          <>
            <span>{layerEntry.label}</span>
            <span>/</span>
          </>
        )}
        <span style={{ color: "var(--text-1)" }}>{entry.title}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginBottom: "0.4rem", fontFamily: "JetBrains Mono, monospace" }}>{entry.layer}</div>
        <h1 style={{ marginBottom: "0.5rem" }}>{entry.title}</h1>
        <p style={{ color: "var(--text-2)", maxWidth: 680 }}>{entry.description}</p>
      </div>

      {/* Live demo(s) */}
      {(entry.demos ?? (entry.Demo && entry.code
        ? [{ Demo: entry.Demo, code: entry.code, minHeight: entry.minHeight }]
        : [])
      ).map((demo, i) => (
        <div key={demo.heading ?? i} style={{ marginBottom: entry.demos && i < entry.demos.length - 1 ? "2rem" : 0 }}>
          {demo.heading && (
            <h2 style={{ fontSize: "0.95rem", marginBottom: "0.75rem", color: "var(--text-1)" }}>
              {demo.heading}
            </h2>
          )}
          <ComponentDemo
            tabs={[{ label: "Preview", preview: <demo.Demo />, code: demo.code }]}
            minHeight={demo.minHeight}
          />
        </div>
      ))}

      {/* Props table */}
      {entry.props && entry.props.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Props</h2>
          <PropsTable props={entry.props} />
        </div>
      )}
    </>
  );
}
