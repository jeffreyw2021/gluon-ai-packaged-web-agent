export function Header() {
  return (
    <header className="site-header">
      <a
        href="#/"
        className="flex items-center gap-2 no-underline"
        style={{ textDecoration: "none" }}
      >
        <GluonLogo />
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text-1)",
            letterSpacing: "-0.01em",
          }}
        >
          Gluon
        </span>
        <span
          className="badge badge-beta"
          style={{ marginLeft: 2 }}
        >
          Beta
        </span>
      </a>

      <div style={{ flex: 1 }} />

      <a
        href="https://github.com/jeffreyw2021/gluon-ai-packaged-web-agent"
        target="_blank"
        rel="noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.8rem",
          color: "var(--text-2)",
          textDecoration: "none",
          padding: "0.3rem 0.75rem",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          transition: "color 0.12s, border-color 0.12s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-1)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-2)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-2)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
        }}
      >
        <GitHubIcon />
        GitHub
      </a>

      <a
        href="https://www.npmjs.com/package/gluon-ai"
        target="_blank"
        rel="noreferrer"
        style={{
          fontSize: "0.8rem",
          color: "var(--text-2)",
          textDecoration: "none",
          padding: "0.3rem 0.75rem",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          fontFamily: "JetBrains Mono, monospace",
          transition: "color 0.12s, border-color 0.12s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-1)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-2)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-2)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
        }}
      >
        gluon-ai@beta
      </a>
    </header>
  );
}

function GluonLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect width="22" height="22" rx="5" fill="var(--accent-muted)" />
      <circle cx="11" cy="11" r="4" stroke="var(--accent)" strokeWidth="1.5" fill="none" />
      <circle cx="11" cy="11" r="1.5" fill="var(--accent)" />
      <line x1="11" y1="3" x2="11" y2="7" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="15" x2="11" y2="19" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="11" x2="7" y2="11" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="11" x2="19" y2="11" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
