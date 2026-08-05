import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV, type NavItem, type NavLayer } from "../nav";

/* ── helpers ──────────────────────────────────────────────────────────────── */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      style={{
        flexShrink: 0,
        color: "var(--text-3)",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.16s ease",
      }}
    >
      <path
        d="M2 3.5l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Layer row (toggle-only, no navigation) ───────────────────────────────── */

function LayerRow({
  layer,
  currentPath,
}: {
  layer: NavLayer;
  currentPath: string;
}) {
  const navigate = useNavigate();
  const hasActiveChild = layer.components.some((c) => c.path === currentPath);
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.28rem 0.75rem 0.28rem 1.75rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "0.775rem",
          color: hasActiveChild ? "var(--text-2)" : "var(--text-3)",
          fontWeight: hasActiveChild ? 500 : 400,
          borderRadius: 4,
          transition: "color 0.12s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color =
            hasActiveChild ? "var(--text-2)" : "var(--text-3)")
        }
      >
        <span style={{ flex: 1 }}>{layer.label}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div style={{ paddingBottom: "0.1rem" }}>
          {layer.components.map((comp) => {
            const active = comp.path === currentPath;
            return (
              <button
                key={comp.path}
                className={`nav-link ${active ? "active" : ""}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  paddingLeft: "2.75rem",
                  fontSize: "0.765rem",
                }}
                onClick={() => navigate(comp.path)}
              >
                {comp.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── UI Components accordion (top-level sidebar item) ────────────────────── */

function UIComponentsAccordion({ item }: { item: NavItem }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isOnSection = currentPath === item.path ||
    currentPath.startsWith(item.path + "/");

  const [open, setOpen] = useState(isOnSection);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          className={`nav-link ${currentPath === item.path ? "active" : ""}`}
          style={{ flex: 1, textAlign: "left" }}
          onClick={() => navigate(item.path)}
        >
          {item.label}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.3rem 0.6rem 0.3rem 0.25rem",
            display: "flex",
            alignItems: "center",
            borderRadius: 4,
          }}
          aria-label="Toggle layers"
        >
          <Chevron open={open} />
        </button>
      </div>

      {open && item.layers && (
        <div style={{ marginBottom: "0.25rem" }}>
          {item.layers.map((layer) => (
            <LayerRow key={layer.id} layer={layer} currentPath={currentPath} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar ──────────────────────────────────────────────────────────────── */

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="layout-sidebar" style={{ paddingBottom: "2rem" }}>
      {NAV.map((group) => (
        <div key={group.label}>
          <div className="nav-group-label">{group.label}</div>
          {group.items.map((item) => {
            if (item.layers) {
              return <UIComponentsAccordion key={item.path} item={item} />;
            }
            const active =
              location.pathname === item.path ||
              (item.path === "/" && location.pathname === "");
            return (
              <button
                key={item.path}
                className={`nav-link ${active ? "active" : ""}`}
                onClick={() => navigate(item.path)}
                style={{ width: "100%", textAlign: "left" }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ))}

      <div
        style={{
          padding: "1.5rem 1rem 0",
          borderTop: "1px solid var(--border)",
          marginTop: "1rem",
        }}
      >
        <a
          href="https://github.com/jeffreyw2021/gluon-ai-packaged-web-agent/blob/main/README.md"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            fontSize: "0.75rem",
            color: "var(--text-3)",
            textDecoration: "none",
            padding: "0.3rem 0",
            transition: "color 0.12s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text-2)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text-3)")
          }
        >
          ↗ README on GitHub
        </a>
        <p
          style={{
            fontSize: "0.7rem",
            color: "var(--text-3)",
            margin: "0.5rem 0 0",
            lineHeight: 1.5,
          }}
        >
          MIT License · Beta
        </p>
      </div>
    </nav>
  );
}
