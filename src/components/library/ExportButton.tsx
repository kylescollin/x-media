"use client";

import { Download } from "lucide-react";
import { useMovies } from "@/hooks/useMovies";
import { moviesToCsv, tvShowsToCsv, downloadCsv } from "@/lib/export/csv";

interface ExportButtonProps {
  type: "movie" | "tv";
}

export default function ExportButton({ type }: ExportButtonProps) {
  const { data: movies, isLoading } = useMovies();

  const count = (movies ?? []).filter((m) => m.mediaType === type).length;
  const disabled = isLoading || count === 0;

  function handleExport() {
    if (!movies) return;
    const date = new Date().toISOString().slice(0, 10);
    if (type === "movie") {
      downloadCsv(`movies-${date}.csv`, moviesToCsv(movies));
    } else {
      downloadCsv(`tv-shows-${date}.csv`, tvShowsToCsv(movies));
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 text-white/90 text-sm font-semibold h-8 px-3 hover:bg-white/8 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="h-3.5 w-3.5" />
      <span>Export {type === "movie" ? "Movies" : "TV"}</span>
    </button>
  );
}
