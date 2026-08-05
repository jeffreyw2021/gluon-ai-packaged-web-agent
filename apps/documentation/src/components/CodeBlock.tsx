import { type ReactNode } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface CodeBlockProps {
  children: string;
  language?: string;
  filename?: string;
}

const customStyle = {
  ...atomOneDark,
  "hljs": {
    ...atomOneDark["hljs"],
    background: "var(--code-bg)",
    padding: "1.25rem 1.5rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    lineHeight: "1.65",
    border: "1px solid var(--border)",
    margin: "0.75rem 0 1.25rem",
    overflowX: "auto" as const,
  },
};

export function CodeBlock({ children, language = "typescript", filename }: CodeBlockProps) {
  return (
    <div style={{ position: "relative" }}>
      {filename && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--text-3)",
            fontFamily: "JetBrains Mono, monospace",
            background: "var(--code-bg)",
            border: "1px solid var(--border)",
            borderBottom: "none",
            borderRadius: "8px 8px 0 0",
            padding: "0.4rem 1rem",
            marginBottom: "-8px",
            marginTop: "0.75rem",
          }}
        >
          {filename}
        </div>
      )}
      <SyntaxHighlighter
        language={language}
        style={customStyle}
        customStyle={{
          borderRadius: filename ? "0 0 8px 8px" : "8px",
          marginTop: filename ? 0 : undefined,
        }}
      >
        {children.trimEnd()}
      </SyntaxHighlighter>
    </div>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code>{children}</code>;
}
