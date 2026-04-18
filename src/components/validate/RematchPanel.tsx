"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Loader2 } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { useTmdbSearch } from "@/hooks/useTmdbSearch";
import { tmdbImage } from "@/lib/tmdb";
import type { Movie, TmdbSearchResult } from "@/types";

interface RematchPanelProps {
  movie: Movie;
  open: boolean;
  onClose: () => void;
  onRematched: () => void;
}

export default function RematchPanel({ movie, open, onClose, onRematched }: RematchPanelProps) {
  const [query, setQuery] = useState(movie.title);
  const [loading, setLoading] = useState(false);
  const { results, isLoading } = useTmdbSearch(query, "both");

  async function handleSelect(result: TmdbSearchResult) {
    setLoading(true);
    try {
      const mediaType = result.media_type ?? "movie";
      const res = await fetch(`/api/movies/${movie.id}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: result.id, mediaType }),
      });
      if (!res.ok) throw new Error("Rematch failed");
      onRematched();
    } finally {
      setLoading(false);
    }
  }

  const displayTitle = (r: TmdbSearchResult) => r.title ?? r.name ?? "Unknown";
  const displayYear = (r: TmdbSearchResult) => {
    const d = r.release_date ?? r.first_air_date;
    return d ? new Date(d).getFullYear() : null;
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150" />

        <Dialog.Popup className="fixed bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[61] w-full sm:max-w-lg bg-[oklch(0.12_0_0)] rounded-t-2xl sm:rounded-2xl border border-white/8 shadow-2xl flex flex-col max-h-[85dvh] outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150">

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-white/6 shrink-0">
            <Dialog.Title className="text-base font-semibold text-white">
              Wrong match — find the right one
            </Dialog.Title>
            <Dialog.Description className="mt-0.5 text-xs text-white/45">
              Original title: <span className="text-white/65">{movie.title}</span>
            </Dialog.Description>

            {/* Search input */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/35 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search TMDB…"
                className="w-full bg-white/6 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 animate-spin" />
              )}
            </div>
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1 py-2">
            {results.length === 0 && !isLoading && query.trim().length >= 2 && (
              <p className="px-5 py-6 text-sm text-white/35 text-center">No results found.</p>
            )}
            {results.map((r) => (
              <button
                key={`${r.id}-${r.media_type}`}
                onClick={() => handleSelect(r)}
                disabled={loading}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
              >
                <div className="relative h-16 w-11 shrink-0 rounded overflow-hidden bg-white/5">
                  <Image
                    src={tmdbImage(r.poster_path, "w154")}
                    alt={displayTitle(r)}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/90 truncate">{displayTitle(r)}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {displayYear(r)}
                    {r.media_type && (
                      <span className="ml-1.5 capitalize text-white/30">{r.media_type}</span>
                    )}
                    {r.vote_average > 0 && (
                      <span className="ml-1.5 text-amber-400/70">★ {r.vote_average.toFixed(1)}</span>
                    )}
                  </p>
                  {r.overview && (
                    <p className="text-xs text-white/30 mt-1 line-clamp-2 leading-relaxed">{r.overview}</p>
                  )}
                </div>
                {loading && <Loader2 className="h-4 w-4 text-white/30 animate-spin shrink-0" />}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/6 shrink-0">
            <Dialog.Close className="w-full py-2 text-sm text-white/45 hover:text-white/70 transition-colors">
              Cancel — keep original
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
