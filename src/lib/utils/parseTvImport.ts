export interface ParsedTvShow {
  showName: string;
  seasons: string[]; // "1", "2", "ALL", etc.
}

export function parseTvImport(raw: string): ParsedTvShow[] {
  const map = new Map<string, Set<string>>();

  const lines = raw.split(/\r?\n/).filter((l) => l.trim());

  for (const line of lines) {
    // Split on tab; fall back to multiple spaces (2+)
    const parts = line.split(/\t|  +/);
    if (parts.length < 2) continue;

    const showName = parts[0].trim();
    const seasonRaw = parts[1].trim().toUpperCase();

    if (!showName || !seasonRaw) continue;

    if (!map.has(showName)) map.set(showName, new Set());
    map.get(showName)!.add(seasonRaw);
  }

  return Array.from(map.entries()).map(([showName, seasonsSet]) => ({
    showName,
    seasons: Array.from(seasonsSet).sort((a, b) => {
      if (a === "ALL") return 1;
      if (b === "ALL") return -1;
      return Number(a) - Number(b);
    }),
  }));
}
