"use client";

import React from "react";
import type { ActionBlockProps } from "easy-setup-web-agent";

interface WeatherOutput {
  city?: string;
  country?: string;
  temperatureCelsius?: number;
  temperatureFahrenheit?: number;
  conditions?: string;
  humidity?: string;
  windSpeedKmh?: number;
}

const CONDITION_ICONS: Record<string, string> = {
  Sunny: "☀️",
  Cloudy: "☁️",
  "Partly cloudy": "⛅",
  Rainy: "🌧️",
  Windy: "💨",
};

export default function WeatherBlock({ toolOutput }: ActionBlockProps<unknown, WeatherOutput>) {
  const data = toolOutput;
  if (!data?.city) return null;

  const icon = CONDITION_ICONS[data.conditions ?? ""] ?? "🌍";

  return (
    <div
      style={{
        margin: "8px 0",
        padding: "14px 16px",
        borderRadius: 12,
        background: "linear-gradient(135deg, #667eea20, #764ba220)",
        border: "1px solid #667eea33",
        minWidth: 200,
        maxWidth: 320,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 32 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>
            {data.city}
            {data.country && data.country !== "Unknown" ? `, ${data.country}` : ""}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>{data.conditions}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatChip label="Temperature" value={`${data.temperatureCelsius}°C / ${data.temperatureFahrenheit}°F`} />
        <StatChip label="Humidity" value={data.humidity ?? "—"} />
        <StatChip label="Wind" value={`${data.windSpeedKmh} km/h`} />
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.7)",
        borderRadius: 8,
        padding: "6px 10px",
      }}
    >
      <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{value}</div>
    </div>
  );
}
