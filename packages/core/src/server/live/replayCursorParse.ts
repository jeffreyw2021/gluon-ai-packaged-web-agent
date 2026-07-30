export function parseReplayCursor(
  raw: string | null | undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!raw?.trim()) return out;
  for (const part of raw.split(",")) {
    const [runId, seqStr] = part.split(":");
    if (!runId?.trim()) continue;
    const seq = Number.parseInt(seqStr ?? "", 10);
    if (Number.isFinite(seq) && seq >= 0) {
      out.set(runId.trim(), seq);
    }
  }
  return out;
}

export function formatReplayCursor(map: ReadonlyMap<string, number>): string {
  return [...map.entries()].map(([r, s]) => `${r}:${s}`).join(",");
}
