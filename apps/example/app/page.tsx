"use client";

import React from "react";
import { AgentPanel } from "easy-setup-web-agent/react";

export default function HomePage() {
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <AgentPanel style={{ flex: 1 }} />
    </div>
  );
}
