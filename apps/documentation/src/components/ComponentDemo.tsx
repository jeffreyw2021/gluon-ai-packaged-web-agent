import { type ReactNode, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface DemoTab {
  label: string;
  preview: ReactNode;
  code: string;
  language?: string;
}

interface ComponentDemoProps {
  tabs: DemoTab[];
  /** Override the minimum height of the preview/code split (default: 360). */
  minHeight?: number;
}

const codeStyle = {
  ...atomOneDark,
  "hljs": {
    ...atomOneDark["hljs"],
    background: "var(--code-bg)",
    padding: "1.25rem 1.5rem",
    fontSize: "0.775rem",
    lineHeight: "1.7",
    margin: 0,
    height: "100%",
    overflowX: "auto" as const,
  },
};

export function ComponentDemo({ tabs, minHeight = 360 }: ComponentDemoProps) {
  const [active, setActive] = useState(0);
  const tab = tabs[active];

  return (
    <div className="demo-panel">
      {tabs.length > 1 && (
        <div className="demo-tabs">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              className={`demo-tab ${i === active ? "active" : ""}`}
              onClick={() => setActive(i)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="demo-split" style={{ minHeight }}>
        <div className="demo-preview">
          {tab?.preview}
        </div>
        <div className="demo-code">
          <SyntaxHighlighter
            language={tab?.language ?? "tsx"}
            style={codeStyle}
            customStyle={{ margin: 0, height: "100%", background: "var(--code-bg)" }}
          >
            {tab?.code.trimEnd() ?? ""}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
