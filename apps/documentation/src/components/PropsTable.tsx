interface PropRow {
  name: string;
  type?: string;
  required?: boolean;
  default?: string;
  description: string;
}

interface PropsTableProps {
  rows: PropRow[];
}

export function PropsTable({ rows }: PropsTableProps) {
  return (
    <div style={{ overflowX: "auto", margin: "1rem 0 1.5rem" }}>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td style={{ whiteSpace: "nowrap" }}>
                <code>{row.name}</code>
                {row.required && (
                  <span style={{ color: "var(--accent)", marginLeft: 4, fontSize: "0.7rem" }}>*</span>
                )}
              </td>
              <td>
                {row.type ? <code style={{ color: "var(--text-2)" }}>{row.type}</code> : "—"}
              </td>
              <td style={{ color: "var(--text-3)", fontFamily: "JetBrains Mono, monospace", fontSize: "0.78rem" }}>
                {row.default ?? "—"}
              </td>
              <td style={{ color: "var(--text-2)", fontFamily: "inherit", fontSize: "0.82rem" }}>
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
