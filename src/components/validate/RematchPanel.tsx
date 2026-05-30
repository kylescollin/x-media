"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { useQueryClient } from "@tanstack/react-query";
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
  const [error, setError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<TmdbSearchResult | null>(null);
  const [displayCount, setDisplayCount] = useState(10);
  const { results, isLoading, isLoadingMore, hasMore, loadMore } = useTmdbSearch(query, "both");
  const visibleResults = results.slice(0, displayCount);
  const queryClient = useQueryClient();

  useEffect(() => { setDisplayCount(10); }, [query]);

  async function handleConfirm() {
    if (!pendingResult) return;
    setLoading(true);
    setError(null);
    try {
      const mediaType = pendingResult.media_type ?? "movie";
      const res = await fetch(`/api/movies/${movie.id}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: pendingResult.id, mediaType }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Rematch failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["movies"] });
      onRematched();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPendingResult(null);
    } finally {
      setLoading(false);
    }
  }

  const displayTitle = (r: TmdbSearchResult) => r.title ?? r.name ?? "Unknown";
  const displayYear = (r: TmdbSearchResult) => {
    const d = r.release_date ?? r.first_air_date;
    return d ? new Date(d).getFullYear() : null;
  };
  const movieYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  function handleClose() {
    setPendingResult(null);
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150" />

        <Dialog.Popup className="fixed bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[61] w-full sm:max-w-lg bg-[oklch(0.12_0_0)] rounded-t-2xl sm:rounded-2xl border border-white/8 shadow-2xl flex flex-col max-h-[85dvh] outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150">

          {pendingResult ? (
            /* Confirmation view */
            <>
              <div className="px-5 pt-5 pb-4 border-b border-white/6 shrink-0">
                <Dialog.Title className="text-base font-semibold text-white">
                  Replace this movie?
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-white/45">
                  This will update your library entry permanently.
                </Dialog.Description>
              </div>

              <div className="px-5 py-6 flex items-center gap-4">
                {/* Current (wrong) movie */}
                <div className="flex-1 flex flex-col items-center gap-2 text-center">
                  <p className="text-[11px] font-medium text-red-400/70 uppercase tracking-wide">Wrong match</p>
                  <div className="relative w-[90px] h-[135px] rounded overflow-hidden bg-white/5 shrink-0">
                    <Image
                      src={tmdbImage(movie.posterPath, "w154")}
                      alt={movie.title}
                      fill
                      sizes="90px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80 leading-tight line-clamp-2">{movie.title}</p>
                    {movieYear && <p className="text-xs text-white/35 mt-0.5">{movieYear}</p>}
                  </div>
                </div>

                <ArrowRight className="h-5 w-5 text-white/25 shrink-0" />

                {/* Replacement */}
                <div className="flex-1 flex flex-col items-center gap-2 text-center">
                  <p className="text-[11px] font-medium text-emerald-400/70 uppercase tracking-wide">Replace with</p>
                  <div className="relative w-[90px] h-[135px] rounded overflow-hidden bg-white/5 shrink-0">
                    <Image
                      src={tmdbImage(pendingResult.poster_path, "w154")}
                      alt={displayTitle(pendingResult)}
                      fill
                      sizes="90px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90 leading-tight line-clamp-2">{displayTitle(pendingResult)}</p>
                    {displayYear(pendingResult) && <p className="text-xs text-white/35 mt-0.5">{displayYear(pendingResult)}</p>}
                  </div>
                </div>
              </div>

              {error && (
                <p className="mx-5 mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error}
                </p>
              )}

              <div className="px-5 pb-5 pt-1 border-t border-white/6 shrink-0 flex gap-2">
                <button
                  onClick={() => setPendingResult(null)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/5 border border-white/8 text-white/50 text-sm font-medium hover:text-white/70 hover:bg-white/8 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to search
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm replacement
                </button>
              </div>
            </>
          ) : (
            /* Search view */
            <>
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
              <div
                className="overflow-y-auto flex-1 py-2"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollHeight - el.scrollTop - el.clientHeight > 80) return;
                  if (displayCount < results.length) {
                    setDisplayCount((c) => c + 10);
                  } else if (hasMore && !isLoadingMore) {
                    loadMore();
                  }
                }}
              >
                {error && (
                  <p className="mx-5 mt-3 mb-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    {error}
                  </p>
                )}
                {results.length === 0 && !isLoading && query.trim().length >= 2 && (
                  <p className="px-5 py-6 text-sm text-white/35 text-center">No results found.</p>
                )}
                {visibleResults.map((r) => (
                  <button
                    key={`${r.id}-${r.media_type}`}
                    onClick={() => setPendingResult(r)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
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
                  </button>
                ))}
                {isLoadingMore && (
                  <p className="px-5 py-3 text-xs text-white/35 text-center">Loading more…</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-white/6 shrink-0">
                <Dialog.Close className="w-full py-2 text-sm text-white/45 hover:text-white/70 transition-colors">
                  Cancel — keep original
                </Dialog.Close>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
