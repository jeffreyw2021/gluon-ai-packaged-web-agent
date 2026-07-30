"use client";

import React, { useState } from "react";
import { AgentPanel } from "easy-setup-web-agent/react";

export default function HomePage() {
  const [mode, setMode] = useState<"minimal" | "fullscreen" | "sideBySide">("fullscreen");

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Mode switcher demo */}
      <div
        style={{
          padding: "8px 16px",
          background: "#f9f9f9",
          borderBottom: "1px solid #eee",
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontSize: 13,
        }}
      >
        <span style={{ color: "#666", marginRight: 4 }}>Panel mode:</span>
        {(["minimal", "fullscreen", "sideBySide"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: mode === m ? "#111" : "#ddd",
              background: mode === m ? "#111" : "#fff",
              color: mode === m ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "sideBySide" ? (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div
            style={{
              flex: 1,
              padding: 24,
              overflowY: "auto",
              borderRight: "1px solid #eee",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20, color: "#111" }}>Your App Content</h2>
            <p style={{ color: "#666", marginTop: 12 }}>
              In side-by-side mode the agent panel sits alongside your content. Resize the
              window to see how it adapts.
            </p>
          </div>
          <div style={{ width: 400, flexShrink: 0 }}>
            <AgentPanel
              mode="sideBySide"
              showHistory
              style={{ height: "100%" }}
            />
          </div>
        </div>
      ) : mode === "fullscreen" ? (
        <AgentPanel
          mode="fullscreen"
          showHistory
          onRequestCollapse={() => setMode("minimal")}
          style={{ flex: 1 }}
        />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#999", fontSize: 14 }}>
            Click the chat bubble in the bottom right ↘
          </div>
          <AgentPanel
            mode="minimal"
            onRequestExpand={() => setMode("fullscreen")}
          />
        </div>
      )}
    </div>
  );
}
