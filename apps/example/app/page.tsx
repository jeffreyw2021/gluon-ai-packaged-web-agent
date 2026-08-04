"use client";

import dynamic from "next/dynamic";

const GluonAgentPanel = dynamic(
  () => import("gluon-ai/react").then((m) => m.GluonAgentPanel),
  { ssr: false },
);

export default function WorkspacePage() {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        background: "#fafafa",
      }}
    >
      {/* left content area */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }} />

      {/* right panel */}
      <div style={{ width: 420, flexShrink: 0, height: "100%" }}>
        <GluonAgentPanel basePath="/api/gluon" />
      </div>
    </div>
  );
}
