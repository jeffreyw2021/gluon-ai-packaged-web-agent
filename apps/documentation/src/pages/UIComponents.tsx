import { useNavigate } from "react-router-dom";
import { UI_LAYERS } from "../nav";

const LAYER_DESCRIPTIONS: Record<string, string> = {
  "layer-1": "One import, zero config. Bundles all regions and state in a single pre-styled panel.",
  "layer-2": "Compose individual regions — top bar, message list, and input bar — inside your own AgentProvider.",
  "layer-3": "Styled twins of every headless primitive. Each component has its own page and live demo.",
  "layer-4": "Fully unstyled hooks and primitives. Bring your own markup, styles, and design system.",
};

export function UIComponents() {
  const navigate = useNavigate();

  return (
    <>
      <h1>UI Components</h1>
      <p>
        <code>gluon-ai/react</code> ships four layers of UI — from a zero-config drop-in panel
        to fully unstyled headless primitives. Pick the layer that matches how much control you need,
        then drill into any component from the sidebar or the cards below.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "2rem" }}>
        {UI_LAYERS.map((layer, li) => (
          <div
            key={layer.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            {/* Layer header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.875rem 1.25rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--bg)",
                  border: "1px solid var(--border-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--accent)",
                  fontFamily: "JetBrains Mono, monospace",
                  flexShrink: 0,
                }}
              >
                {li + 1}
              </span>
              <div>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)" }}>
                  {layer.label}
                </span>
                {LAYER_DESCRIPTIONS[layer.id] && (
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 400 }}>
                    {LAYER_DESCRIPTIONS[layer.id]}
                  </p>
                )}
              </div>
            </div>

            {/* Component list */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0", padding: 0 }}>
              {layer.components.map((comp, ci) => (
                <button
                  key={comp.path}
                  onClick={() => navigate(comp.path)}
                  style={{
                    flex: "1 1 200px",
                    minWidth: 160,
                    background: "transparent",
                    border: "none",
                    borderTop: ci > 0 ? "none" : "none",
                    borderRight: "1px solid var(--border)",
                    borderBottom: "none",
                    cursor: "pointer",
                    padding: "0.75rem 1.25rem",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    transition: "background 0.1s",
                    color: "var(--text-1)",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                  }
                >
                  <span style={{ fontSize: "0.82rem", fontFamily: "JetBrains Mono, monospace" }}>
                    {comp.label}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6h8M7 3l3 3-3 3" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
