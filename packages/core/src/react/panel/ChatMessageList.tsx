"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAgentContext } from "../provider/AgentProvider";
import { MessageList } from "../messages/MessageList";
import { UserMessage } from "../messages/UserMessage";
import { AssistantMessage } from "../messages/AssistantMessage";
import { EmptyView } from "../styled/EmptyView";
import type { MessageListProps } from "../messages/MessageList";
import type { UserMessageProps } from "../messages/UserMessage";
import type { AssistantMessageProps } from "../messages/AssistantMessage";
import type { ThoughtWindowProps } from "../messages/thoughts/ThoughtWindow";
import {
  FileText,
  Globe,
  Workflow,
  Search,
} from "lucide-react";

// ── Scoped styles ──────────────────────────────────────────────────────────

const MESSAGE_LIST_CSS = `
  @keyframes breathe {
    0%, 100% { opacity: 0.52; }
    50%       { opacity: 1; }
  }
  @keyframes metallic-sweep {
    0%   { transform: translate(-28%, -28%); }
    100% { transform: translate(28%, 28%); }
  }
  @keyframes gluon-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  .agent-panel-breathe {
    animation: breathe 2.6s ease-in-out infinite;
  }
  .gluon-ml-skel-block {
    animation: gluon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  [data-gluon-msglist] {
    --gluon-ml-fg: #171717;
    --gluon-ml-fg-secondary: #404040;
    --gluon-ml-fg-muted: #525252;
    --gluon-ml-fg-subtle: #737373;
    --gluon-ml-bubble: rgba(0,0,0,0.07);
    --gluon-ml-skel: #e5e5e5;
    --gluon-ml-icon: #737373;
    --gluon-ml-loader-base: #d4d4d4;
    --gluon-ml-loader-active: #525252;
    --gluon-ml-sweep: linear-gradient(118deg, transparent 0%, transparent 34%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.22) 46%, rgba(248,252,255,0.52) 50%, rgba(255,255,255,0.22) 54%, rgba(255,255,255,0.05) 60%, transparent 66%, transparent 100%);
  }
  [data-gluon-msglist][data-dark] {
    --gluon-ml-fg: #f5f5f5;
    --gluon-ml-fg-secondary: #e5e5e5;
    --gluon-ml-fg-muted: #c9c9c9;
    --gluon-ml-fg-subtle: #909090;
    --gluon-ml-bubble: rgba(255,255,255,0.1);
    --gluon-ml-skel: #404040;
    --gluon-ml-icon: #909090;
    --gluon-ml-loader-base: #525252;
    --gluon-ml-loader-active: #d4d4d4;
    --gluon-ml-sweep: linear-gradient(118deg, transparent 0%, transparent 34%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.14) 46%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0.14) 54%, rgba(255,255,255,0.04) 60%, transparent 66%, transparent 100%);
  }

  [data-gluon-msglist]::-webkit-scrollbar { display: none; }
  .gluon-ml-thought-scroll::-webkit-scrollbar { display: none; }

  .gluon-ml-thought-header {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    width: fit-content;
    max-width: 100%;
    color: var(--gluon-ml-fg-subtle);
    user-select: none;
    transition: color 0.15s ease;
  }
  .gluon-ml-thought-header:hover { color: var(--gluon-ml-fg-secondary); }

  .gluon-ml-prompt-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(255,255,255,0.6);
    border: 1px solid rgba(0,0,0,0.08);
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
    box-sizing: border-box;
  }
  .gluon-ml-prompt-btn:hover {
    background: rgba(0,0,0,0.04);
    border-color: rgba(0,0,0,0.13);
  }
  [data-gluon-msglist][data-dark] .gluon-ml-prompt-btn {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.1);
  }
  [data-gluon-msglist][data-dark] .gluon-ml-prompt-btn:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.16);
  }
  .gluon-ml-prompt-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: var(--gluon-ml-fg-muted);
    line-height: 1.375;
    transition: color 0.15s ease;
  }
  .gluon-ml-prompt-btn:hover .gluon-ml-prompt-text { color: var(--gluon-ml-fg); }
  .gluon-ml-prompt-icon {
    flex-shrink: 0;
    color: var(--gluon-ml-fg-subtle);
    transition: color 0.15s ease;
  }
  .gluon-ml-prompt-btn:hover .gluon-ml-prompt-icon { color: var(--gluon-ml-fg-secondary); }

  /* ── Markdown output (assistant messages) ─────────────────────────── */
  .gluon-md {
    width: 100%;
    font-size: 14px;
    line-height: 1.65;
    color: #1a1a1a;
    word-break: break-word;
  }
  [data-gluon-msglist][data-dark] .gluon-md { color: #ebebeb; }
  .gluon-md p {
    font-size: 14px;
    line-height: 1.65;
    margin-bottom: 0.5rem;
    white-space: normal;
  }
  .gluon-md p:last-child { margin-bottom: 0; }
  .gluon-md ul {
    margin-bottom: 0.5rem;
    margin-top: 0;
    list-style-type: disc;
    list-style-position: outside;
    padding-inline-start: 1.5em;
  }
  .gluon-md ol {
    margin-bottom: 0.5rem;
    margin-top: 0;
    list-style-type: decimal;
    list-style-position: outside;
    padding-inline-start: 2.5em;
  }
  .gluon-md li > ul,
  .gluon-md li > ol { margin-top: 0.25rem; margin-bottom: 0.25rem; }
  .gluon-md li {
    font-size: 14px;
    line-height: 1.65;
    margin-bottom: 0.125rem;
    display: list-item;
    padding-inline-start: 0;
  }
  .gluon-md h1, .gluon-md h2, .gluon-md h3,
  .gluon-md h4, .gluon-md h5, .gluon-md h6 {
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    line-height: 1.3;
  }
  .gluon-md h1 { font-size: 20px; }
  .gluon-md h2 { font-size: 18px; }
  .gluon-md h3 { font-size: 16px; }
  .gluon-md code {
    background-color: rgba(0,0,0,0.05);
    border-radius: 4px;
    padding: 0.1em 0.3em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
  }
  .gluon-md pre {
    background-color: rgba(0,0,0,0.05);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }
  [data-gluon-msglist][data-dark] .gluon-md code,
  [data-gluon-msglist][data-dark] .gluon-md pre {
    background-color: rgba(255,255,255,0.08);
  }
  .gluon-md pre code {
    background-color: transparent;
    padding: 0;
    font-size: inherit;
  }
  .gluon-md hr {
    border: none;
    border-top: 1px solid rgba(0,0,0,0.08);
    margin: 0.75rem 0;
  }
  [data-gluon-msglist][data-dark] .gluon-md hr {
    border-top-color: rgba(255,255,255,0.1);
  }
  .gluon-md table {
    font-size: 14px;
    display: block;
    width: max-content;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    margin: 0.75rem 0;
    border-radius: 6px;
    border: 1px solid rgba(0,0,0,0.08);
  }
  [data-gluon-msglist][data-dark] .gluon-md table {
    border-color: rgba(255,255,255,0.1);
  }
  .gluon-md th {
    padding: 0.375rem 0.75rem;
    text-align: left;
    font-weight: 600;
    white-space: nowrap;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    border-right: 1px solid rgba(0,0,0,0.08);
    background-color: rgba(0,0,0,0.025);
  }
  [data-gluon-msglist][data-dark] .gluon-md th {
    border-bottom-color: rgba(255,255,255,0.1);
    border-right-color: rgba(255,255,255,0.1);
    background-color: rgba(255,255,255,0.04);
  }
  .gluon-md th:last-child { border-right: none; }
  .gluon-md td {
    padding: 0.375rem 0.75rem;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    border-right: 1px solid rgba(0,0,0,0.08);
    vertical-align: top;
  }
  [data-gluon-msglist][data-dark] .gluon-md td {
    border-bottom-color: rgba(255,255,255,0.1);
    border-right-color: rgba(255,255,255,0.1);
  }
  .gluon-md td:last-child { border-right: none; }
  .gluon-md tr:last-child td { border-bottom: none; }
  .gluon-md strong { font-weight: 600; }
  .gluon-md em { font-style: italic; }
  .gluon-md blockquote {
    border-left: 3px solid rgba(0,0,0,0.12);
    margin: 0.5rem 0;
    padding: 0.25rem 0 0.25rem 0.875rem;
    color: #737373;
  }
  [data-gluon-msglist][data-dark] .gluon-md blockquote {
    border-left-color: rgba(255,255,255,0.18);
    color: #a3a3a3;
  }
  .gluon-md blockquote p { color: inherit; }
  .gluon-md a {
    color: #404040;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .gluon-md a:hover { color: #171717; }
  [data-gluon-msglist][data-dark] .gluon-md a { color: #d4d4d4; }
  [data-gluon-msglist][data-dark] .gluon-md a:hover { color: #f5f5f5; }
` as const;

// ── Rotating verb hook ─────────────────────────────────────────────────────

const STREAM_VERBS = [
  "thinking",
  "reasoning",
  "considering",
  "planning",
  "branching",
] as const;
const VERB_ROTATE_MS = 7200;

function useRotatingVerb(enabled: boolean): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(
      () => setI((v) => (v + 1) % STREAM_VERBS.length),
      VERB_ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [enabled]);
  return STREAM_VERBS[i];
}

// ── Animated thinking label ────────────────────────────────────────────────

function ThinkingLabel({ verb }: { verb: string }) {
  return (
    <span
      className="agent-panel-breathe"
      style={{
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: 500,
          fontStyle: "italic",
          textTransform: "capitalize",
          color: "var(--gluon-ml-fg-muted)",
          lineHeight: 1,
          paddingBottom: "0.125rem",
          paddingRight: "0.25rem",
          display: "inline-block",
        }}
      >
        {verb}
      </span>
      <span
        style={{
          position: "absolute",
          pointerEvents: "none",
          inset: "-120%",
          background: "var(--gluon-ml-sweep)",
          mixBlendMode: "overlay",
          animation: "metallic-sweep 2.8s linear infinite",
        }}
      />
    </span>
  );
}

// ── Diagonal scan loader ───────────────────────────────────────────────────

function DiagonalScanLoader() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      width="15"
      height="15"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <defs>
        <circle id="dsb" r="2.4" fill="var(--gluon-ml-loader-base)" />
        <circle id="dsl" r="3.1" />
      </defs>
      <style>{`
        .ds{fill:var(--gluon-ml-loader-active);opacity:0;animation:ds-k 2200ms cubic-bezier(0.25,1,0.5,1) infinite both;}
        @keyframes ds-k{0%{opacity:0;}8%{opacity:1;}36%{opacity:0.05;}100%{opacity:0;}}
        @media(prefers-reduced-motion:reduce){.ds{animation:none;opacity:0.45;}}
        .d00{animation-delay:0ms;}
        .d01,.d10{animation-delay:183ms;}
        .d02,.d11,.d20{animation-delay:367ms;}
        .d03,.d12,.d21,.d30{animation-delay:550ms;}
        .d04,.d13,.d22,.d31,.d40{animation-delay:733ms;}
        .d14,.d23,.d32,.d41{animation-delay:917ms;}
        .d24,.d33,.d42{animation-delay:1100ms;}
        .d34,.d43{animation-delay:1283ms;}
        .d44{animation-delay:1467ms;}
      `}</style>
      {[6, 17, 28, 39, 50].flatMap((x) =>
        [6, 17, 28, 39, 50].map((y) => (
          <use key={`${x}-${y}`} href="#dsb" x={x} y={y} />
        )),
      )}
      <use className="ds d00" href="#dsl" x="6" y="6" />
      <use className="ds d01" href="#dsl" x="17" y="6" />
      <use className="ds d02" href="#dsl" x="28" y="6" />
      <use className="ds d03" href="#dsl" x="39" y="6" />
      <use className="ds d04" href="#dsl" x="50" y="6" />
      <use className="ds d10" href="#dsl" x="6" y="17" />
      <use className="ds d11" href="#dsl" x="17" y="17" />
      <use className="ds d12" href="#dsl" x="28" y="17" />
      <use className="ds d13" href="#dsl" x="39" y="17" />
      <use className="ds d14" href="#dsl" x="50" y="17" />
      <use className="ds d20" href="#dsl" x="6" y="28" />
      <use className="ds d21" href="#dsl" x="17" y="28" />
      <use className="ds d22" href="#dsl" x="28" y="28" />
      <use className="ds d23" href="#dsl" x="39" y="28" />
      <use className="ds d24" href="#dsl" x="50" y="28" />
      <use className="ds d30" href="#dsl" x="6" y="39" />
      <use className="ds d31" href="#dsl" x="17" y="39" />
      <use className="ds d32" href="#dsl" x="28" y="39" />
      <use className="ds d33" href="#dsl" x="39" y="39" />
      <use className="ds d34" href="#dsl" x="50" y="39" />
      <use className="ds d40" href="#dsl" x="6" y="50" />
      <use className="ds d41" href="#dsl" x="17" y="50" />
      <use className="ds d42" href="#dsl" x="28" y="50" />
      <use className="ds d43" href="#dsl" x="39" y="50" />
      <use className="ds d44" href="#dsl" x="50" y="50" />
    </svg>
  );
}

// ── Tool row ──────────────────────────────────────────────────────────────

const TOOL_ICON_REGISTRY: Record<
  string,
  ComponentType<{ size?: number; strokeWidth?: number; style?: CSSProperties }>
> = { Globe, Search, FileText };

function ToolIcon({ icon }: { icon?: string }) {
  const Icon =
    icon && TOOL_ICON_REGISTRY[icon] ? TOOL_ICON_REGISTRY[icon] : Workflow;
  return (
    <Icon size={15} strokeWidth={1.5} style={{ color: "var(--gluon-ml-icon)", flexShrink: 0 }} />
  );
}

function ToolRow({
  toolName,
  state,
  isLast,
}: {
  toolName: string;
  state: string;
  isLast?: boolean;
}) {
  const { toolUi } = useAgentContext();
  const isRunning = state === "call" || state === "partial-call";
  const ui = toolUi[toolName];
  const fallback = toolName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginBottom: isLast ? 0 : 10,
      }}
    >
      {isRunning ? <DiagonalScanLoader /> : <ToolIcon icon={ui?.icon} />}
      <span
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--gluon-ml-fg-muted)",
          flex: 1,
          minWidth: 0,
        }}
      >
        {isRunning
          ? (ui?.executingLabel ?? fallback)
          : (ui?.completedLabel ?? fallback)}
      </span>
    </div>
  );
}

// ── ThoughtWindow ─────────────────────────────────────────────────────────

function StyledThoughtWindow({
  activity,
  reasoningText,
  toolInvocations,
}: ThoughtWindowProps) {
  const isActive = activity !== null;
  const hasContent =
    !!reasoningText || (toolInvocations && toolInvocations.length > 0);

  const verb = useRotatingVerb(isActive);
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevExpandedRef = useRef(expanded);

  const scrollToBottom = () => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  useEffect(() => {
    if (shouldAutoScroll && expanded) scrollToBottom();
  }, [reasoningText, toolInvocations, shouldAutoScroll, expanded]);

  useEffect(() => {
    if (expanded && !prevExpandedRef.current) {
      scrollToBottom();
      setShouldAutoScroll(true);
    }
    prevExpandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = el;
      setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!isActive && !hasContent) return null;

  return (
    <div style={{ marginBottom: 10, width: "100%", minWidth: 0 }}>
      <div
        className="gluon-ml-thought-header"
        onClick={() => setExpanded((v) => !v)}
      >
        {isActive ? (
          <ThinkingLabel verb={verb} />
        ) : (
          <span
            style={{
              fontSize: "13px",
              fontStyle: "italic",
              color: "var(--gluon-ml-fg-subtle)",
              textTransform: "capitalize",
              lineHeight: 1,
            }}
          >
            reasoning completed
          </span>
        )}
      </div>

      {hasContent && (
        <div
          style={{
            overflow: "hidden",
            transition: "max-height 250ms ease-in-out, opacity 250ms ease-in-out",
            maxHeight: expanded ? 300 : 0,
            opacity: expanded ? 1 : 0,
          }}
        >
          <div
            ref={scrollRef}
            className="gluon-ml-thought-scroll"
            style={{
              marginTop: 8,
              overflowY: "auto",
              overflowX: "hidden",
              maxHeight: "11rem",
              scrollbarWidth: "none",
            }}
          >
            {toolInvocations?.map((inv, idx) => (
              <ToolRow
                key={inv.toolCallId}
                toolName={inv.toolName}
                state={inv.state}
                isLast={idx === toolInvocations.length - 1 && !reasoningText}
              />
            ))}
            {reasoningText && (
              <p
                style={{
                  fontSize: "12px",
                  lineHeight: 1.625,
                  color: "var(--gluon-ml-fg-muted)",
                  whiteSpace: "pre-wrap",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  margin: toolInvocations?.length ? "8px 0 0" : "0",
                }}
              >
                {reasoningText}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AssistantMessage ──────────────────────────────────────────────────────

function AssistantTextContent({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="gluon-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

// ── UserMessage ───────────────────────────────────────────────────────────

function StyledUserMessage({ message, style }: UserMessageProps) {
  return (
    <UserMessage
      message={message}
      style={{ display: "flex", justifyContent: "flex-end", ...style }}
    >
      {(text, attachments) => (
        <div
          style={{
            maxWidth: "88%",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-end",
          }}
        >
          {attachments.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                justifyContent: "flex-end",
              }}
            >
              {attachments.map((a) => (
                <div
                  key={a.filename}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  padding: "6px 10px",
                  borderRadius: 12,
                  background: "var(--gluon-ml-bubble)",
                  fontSize: "12px",
                  color: "var(--gluon-ml-fg-secondary)",
                  maxWidth: 180,
                  }}
                >
                  <FileText
                    size={12}
                    style={{ flexShrink: 0, color: "var(--gluon-ml-fg-muted)" }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {a.filename}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--gluon-ml-fg-subtle)",
                      textTransform: "uppercase",
                    }}
                  >
                    {a.displayType}
                  </span>
                </div>
              ))}
            </div>
          )}
          {text.trim() && (
            <div
              style={{
                borderRadius: 16,
                background: "var(--gluon-ml-bubble)",
                padding: "10px 14px",
                fontSize: "14px",
                lineHeight: 1.625,
                color: "var(--gluon-ml-fg)",
                whiteSpace: "pre-wrap",
              }}
            >
              {text}
            </div>
          )}
        </div>
      )}
    </UserMessage>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────

const skelBase: CSSProperties = {
  borderRadius: 4,
  background: "var(--gluon-ml-skel)",
};

function ChatLoadingSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        paddingTop: 8,
        gap: 40,
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          className="gluon-ml-skel-block"
          style={{ ...skelBase, height: 28, width: 176, borderRadius: 8 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
        <div className="gluon-ml-skel-block" style={{ ...skelBase, height: 12, width: "60%" }} />
        <div className="gluon-ml-skel-block" style={{ ...skelBase, height: 12, width: "90%" }} />
        <div className="gluon-ml-skel-block" style={{ ...skelBase, height: 12, width: "75%" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          className="gluon-ml-skel-block"
          style={{ ...skelBase, height: 28, width: 128, borderRadius: 8 }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
        <div className="gluon-ml-skel-block" style={{ ...skelBase, height: 12, width: "80%" }} />
        <div className="gluon-ml-skel-block" style={{ ...skelBase, height: 12, width: "55%" }} />
      </div>
    </div>
  );
}

// ── ChatMessageList ───────────────────────────────────────────────────────

export interface ChatMessageListStyles {
  root?: CSSProperties;
}

export interface ChatMessageListProps {
  /**
   * Inline style merged onto the outermost scroll container.
   * Any key here overrides the matching default style.
   */
  style?: CSSProperties;
  /**
   * Additional CSS class names applied to the outermost element.
   * Use this to target the component or override styles via CSS.
   */
  className?: string;
  /**
   * Per-slot style overrides for named internal elements.
   */
  styles?: ChatMessageListStyles;
  /**
   * Replaces the default empty state entirely.
   * Pass any ReactNode; it is rendered when there are no messages.
   * Omit to keep the default "How can I help?" view.
   */
  emptyView?: ReactNode;
  /**
   * Override individual message slot renderers.
   * Any slot left out keeps its default styled component.
   */
  slots?: {
    userMessage?: ComponentType<UserMessageProps>;
    assistantMessage?: ComponentType<AssistantMessageProps>;
    /**
     * Replaces the thought window (reasoning / tool progress panel).
     * Ignored when `slots.assistantMessage` is also provided.
     */
    thoughtWindow?: ComponentType<ThoughtWindowProps>;
    /**
     * Replaces only the text renderer inside the default assistant message
     * bubble. Ignored when `slots.assistantMessage` is also provided.
     */
    textContent?: ComponentType<{ text: string }>;
  };
  /**
   * Replaces the loading skeleton shown while the thread is fetching.
   * Pass any ReactNode. Omit to keep the default pulse skeleton.
   * Pass null to render nothing while loading.
   */
  skeleton?: ReactNode;
  /**
   * When `true`, the list smoothly scrolls to the bottom whenever a new
   * message arrives or agent activity changes.
   * Defaults to `false`.
   */
  autoScroll?: boolean;
  /**
   * When `true`, applies the dark-mode color palette.
   * Defaults to `false`.
   */
  darkMode?: boolean;
}

/**
 * Self-contained message list for the agent chat UI.
 *
 * Must be rendered inside `<AgentProvider>`. All data is sourced automatically
 * from context — no data props required.
 *
 * Pass `style` to override the scroll container's styles.
 * Pass `styles.root` for the same effect via the styles object.
 */
export function ChatMessageList({
  style,
  className,
  styles,
  emptyView,
  slots,
  skeleton,
  autoScroll = false,
  darkMode = false,
}: ChatMessageListProps) {
  const {
    adapter,
    toolUi: _toolUi,
  } = useAgentContext();

  const {
    messages,
    runPhase,
    runActivity,
    isChatLoading,
    awaitingApprovalId,
    submitToolApproval,
  } = adapter;

  const _isEmpty = messages.length === 0 && !isChatLoading;

  const rootStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingTop: "1rem",
    // Keep a small container pad; MessageList's end spacer (afterLast) provides
    // the main breathing room below the final message.
    paddingBottom: _isEmpty ? 0 : "0.5rem",
    paddingLeft: _isEmpty ? "0.625rem" : "1rem",
    paddingRight: _isEmpty ? "0.625rem" : "1rem",
    scrollbarWidth: "none",
    boxSizing: "border-box",
    ...styles?.root,
    ...style,
  };

  const ThoughtWindowComponent = slots?.thoughtWindow ?? StyledThoughtWindow;

  const AssistantMessageComponent = useMemo<
    ComponentType<AssistantMessageProps>
  >(() => {
    if (slots?.assistantMessage) return slots.assistantMessage;
    const TextContent = slots?.textContent ?? AssistantTextContent;
    function StyledAssistantMessageWithSlots(props: AssistantMessageProps) {
      return (
        <AssistantMessage
          {...props}
          components={{ ThoughtWindow: ThoughtWindowComponent, TextContent }}
        />
      );
    }
    return StyledAssistantMessageWithSlots;
  }, [slots?.assistantMessage, slots?.textContent, ThoughtWindowComponent]);

  const skeletonContent =
    skeleton !== undefined ? skeleton : <ChatLoadingSkeleton />;

  const isEmpty = messages.length === 0 && !isChatLoading;

  return (
    <>
      <style>{MESSAGE_LIST_CSS}</style>
      <div
        data-gluon-msglist=""
        {...(darkMode ? { "data-dark": "" } : {})}
        className={`gluon-msglist${className ? ` ${className}` : ""}`}
        style={rootStyle}
      >
        {isChatLoading ? (
          skeletonContent
        ) : isEmpty ? (
          // Handle empty state here so we can pass suggestedPrompts=null (loading)
          // directly to EmptyView without losing the null → undefined collapse in MessageList.
          emptyView !== undefined ? (
            <>{emptyView}</>
          ) : (
            <EmptyView darkMode={darkMode} />
          )
        ) : (
          <MessageList
            messages={messages}
            runPhase={runPhase}
            runActivity={runActivity}
            awaitingApprovalId={awaitingApprovalId ?? null}
            onApprove={submitToolApproval ?? (() => Promise.resolve())}
            autoScroll={autoScroll}
            // minHeight (not height): list must grow with content so the end
            // spacer contributes to scrollHeight and isn't clipped.
            style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
            components={{
              UserMessage: (slots?.userMessage ??
                StyledUserMessage) as ComponentType<UserMessageProps>,
              AssistantMessage: AssistantMessageComponent,
              ThoughtWindow: ThoughtWindowComponent,
            }}
          />
        )}
      </div>
    </>
  );
}
