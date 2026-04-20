"use client";

import { useState } from "react";
import { parseTvImport, type ParsedTvShow } from "@/lib/utils/parseTvImport";
import type { TvImportResultItem } from "@/app/api/tv/import/route";
import { CheckCircle2, AlertCircle, HelpCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "input" | "preview" | "importing" | "done";

export default function TvImportForm() {
  const [raw, setRaw] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [parsed, setParsed] = useState<ParsedTvShow[]>([]);
  const [results, setResults] = useState<TvImportResultItem[]>([]);
  const [importStats, setImportStats] = useState({ matched: 0, unmatched: 0, errors: 0 });

  function handlePreview() {
    const shows = parseTvImport(raw);
    setParsed(shows);
    setStep("preview");
  }

  function removeShow(showName: string) {
    setParsed((prev) => prev.filter((s) => s.showName !== showName));
  }

  async function handleImport() {
    setStep("importing");
    try {
      const res = await fetch("/api/tv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shows: parsed }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      setImportStats({ matched: data.matched ?? 0, unmatched: data.unmatched ?? 0, errors: data.errors ?? 0 });
      setStep("done");
    } catch {
      setStep("preview");
    }
  }

  function handleReset() {
    setRaw("");
    setParsed([]);
    setResults([]);
    setStep("input");
  }

  if (step === "input") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-white/8 bg-white/3 p-3 text-xs text-white/40 space-y-1">
          <p className="font-medium text-white/55">Format guide</p>
          <p>Select both columns in Google Sheets and paste below. Each row: <span className="font-mono text-white/60">Show Name [tab] Season Number</span></p>
          <p>Use <span className="font-mono text-white/60">ALL</span> as the season number to import all available seasons.</p>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"Breaking Bad\t1\nBreaking Bad\t2\nGame of Thrones\tALL"}
          rows={16}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 placeholder:text-white/20 font-mono resize-y focus:outline-none focus:border-white/20 transition-colors"
        />

        <button
          onClick={handlePreview}
          disabled={!raw.trim()}
          className="h-10 px-6 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-fit"
        >
          Preview Import
        </button>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">
            <span className="text-white font-semibold">{parsed.length}</span> shows detected
          </p>
          <button onClick={handleReset} className="text-xs text-white/40 hover:text-white/70 transition-colors">
            Start over
          </button>
        </div>

        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {parsed.map((show) => (
            <div
              key={show.showName}
              className="flex items-center justify-between rounded-lg border border-white/8 bg-white/4 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{show.showName}</p>
                <p className="text-xs text-white/35 mt-0.5">
                  {show.seasons.includes("ALL")
                    ? "All seasons"
                    : `Season${show.seasons.length > 1 ? "s" : ""} ${show.seasons.join(", ")}`}
                </p>
              </div>
              <button
                onClick={() => removeShow(show.showName)}
                className="ml-3 p-1 text-white/20 hover:text-white/60 transition-colors shrink-0"
                aria-label={`Remove ${show.showName}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={parsed.length === 0}
            className="h-10 px-6 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Import {parsed.length} Shows
          </button>
          <button onClick={handleReset} className="h-10 px-4 rounded-lg text-sm text-white/40 hover:text-white/70 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
        <div className="text-center">
          <p className="text-sm font-medium text-white/70">Importing {parsed.length} shows…</p>
          <p className="text-xs text-white/35 mt-1">Fetching from TMDB — this may take a minute</p>
        </div>
      </div>
    );
  }

  // done
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-green-500/20 bg-green-500/8 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-400">{importStats.matched}</p>
          <p className="text-xs text-white/40 mt-1">Matched</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/4 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-white/60">{importStats.unmatched}</p>
          <p className="text-xs text-white/40 mt-1">Unmatched</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-400">{importStats.errors}</p>
          <p className="text-xs text-white/40 mt-1">Errors</p>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
          {results.map((r) => (
            <div
              key={r.showName}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                r.status === "matched" ? "border-green-500/15 bg-green-500/5" :
                r.status === "error" ? "border-red-500/15 bg-red-500/5" :
                "border-white/8 bg-white/3"
              )}
            >
              {r.status === "matched" && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />}
              {r.status === "unmatched" && <HelpCircle className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />}
              {r.status === "error" && <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="font-medium text-white/80 truncate">{r.showName}</p>
                {r.status === "matched" && (
                  <p className="text-xs text-white/35 mt-0.5">
                    → {r.tmdbTitle}{r.seasonsCreated ? ` · ${r.seasonsCreated} season${r.seasonsCreated !== 1 ? "s" : ""}` : ""}
                  </p>
                )}
                {r.status === "unmatched" && <p className="text-xs text-white/35 mt-0.5">No TMDB match found</p>}
                {r.status === "error" && <p className="text-xs text-red-400/60 mt-0.5">{r.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <a
          href="/tv"
          className="h-10 px-6 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors inline-flex items-center"
        >
          View TV Shows
        </a>
        <button onClick={handleReset} className="h-10 px-4 rounded-lg text-sm text-white/40 hover:text-white/70 transition-colors">
          Import more
        </button>
      </div>
    </div>
  );
}
