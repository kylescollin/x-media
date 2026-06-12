"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { Plus, Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { tmdbImage } from "@/lib/tmdb";
import { useTmdbSearch } from "@/hooks/useTmdbSearch";
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from "@/hooks/useWatchlist";
import type { TmdbSearchResult } from "@/types";

function preventInputZoom() {
  document.querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
}

function restoreInputZoom() {
  document.querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1');
}

export default function AddToWatchlistDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [viewerLabel, setViewerLabel] = useState<"mine" | "ours">("mine");
  const [displayCount, setDisplayCount] = useState(10);
  const [addedThisSession, setAddedThisSession] = useState<Map<number, number>>(new Map());
  const [pendingTmdbId, setPendingTmdbId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading, isLoadingMore, hasMore, loadMore } = useTmdbSearch(query, "both");
  const { mutate: addItem } = useAddToWatchlist();
  const { mutate: removeItem } = useRemoveFromWatchlist();
  const { data: watchlistItems = [] } = useWatchlist();
  const visibleResults = results.slice(0, displayCount);

  // tmdbId → watchlistId: existing items + anything added this session
  const inWatchlist = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of watchlistItems) {
      map.set(item.tmdbId, item.id);
    }
    for (const [tmdbId, id] of addedThisSession) {
      map.set(tmdbId, id);
    }
    return map;
  }, [watchlistItems, addedThisSession]);

  useEffect(() => { setDisplayCount(10); }, [query]);

  useEffect(() => {
    if (!open) {
      setAddedThisSession(new Map());
      setPendingTmdbId(null);
    }
  }, [open]);

  // Focus input after dialog animation completes to avoid iOS transform-zoom bug
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 150);
    return () => clearTimeout(t);
  }, [open]);

  // iOS-safe body scroll lock — overflow:hidden alone doesn't work on Safari
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  function handleAdd(result: TmdbSearchResult) {
    const type = (result.media_type ?? "movie") as "movie" | "tv";
    setPendingTmdbId(result.id);
    addItem(
      { tmdbId: result.id, type, viewerLabel },
      {
        onSuccess: (item) => {
          setAddedThisSession((prev) => new Map(prev).set(result.id, item.id));
          setPendingTmdbId(null);
        },
        onError: () => setPendingTmdbId(null),
      }
    );
  }

  function handleRemove(tmdbId: number, watchlistId: number) {
    setPendingTmdbId(tmdbId);
    // Optimistically remove from session tracking to match RQ cache optimistic update
    setAddedThisSession((prev) => {
      const next = new Map(prev);
      next.delete(tmdbId);
      return next;
    });
    removeItem(watchlistId, {
      onSuccess: () => setPendingTmdbId(null),
      onError: () => setPendingTmdbId(null),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white text-black text-sm font-semibold h-8 px-3 hover:bg-white/90 transition-colors">
        <Plus className="h-4 w-4" />
        Add
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[oklch(0.10_0_0)] border-white/10 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/8">
          <DialogTitle className="text-base font-semibold text-white">Add to watchlist</DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies & TV shows…"
              onFocus={preventInputZoom}
              onBlur={restoreInputZoom}
              className="w-full rounded-lg bg-white/6 border border-white/10 text-base sm:text-sm text-white placeholder:text-white/30 pl-9 pr-3 py-2 outline-none focus:border-white/25 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-white/35 mr-1">For</span>
            <button
              type="button"
              onClick={() => setViewerLabel("mine")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                viewerLabel === "mine"
                  ? "bg-white/15 border-white/25 text-white"
                  : "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
              }`}
            >
              Mine
            </button>
            <button
              type="button"
              onClick={() => setViewerLabel("ours")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                viewerLabel === "ours"
                  ? "bg-white/15 border-white/25 text-white"
                  : "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
              }`}
            >
              Ours
            </button>
          </div>
        </div>

        <div
          className="max-h-72 overflow-y-auto overscroll-contain scrollbar-thin px-2 pb-3 space-y-0.5"
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
          {isLoading && (
            <p className="text-sm text-white/35 px-3 py-6 text-center">Searching…</p>
          )}
          {!isLoading && query.length >= 2 && results.length === 0 && (
            <p className="text-sm text-white/35 px-3 py-6 text-center">No results found</p>
          )}
          {visibleResults.map((result) => {
            const title = result.title ?? result.name ?? "";
            const year = (result.release_date ?? result.first_air_date ?? "").slice(0, 4);
            const watchlistId = inWatchlist.get(result.id);
            const isAdded = watchlistId !== undefined;
            const isMutating = pendingTmdbId === result.id;

            return (
              <div
                key={`${result.media_type}-${result.id}`}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <div className="relative h-12 w-8 flex-shrink-0 rounded overflow-hidden bg-white/8">
                  {result.poster_path ? (
                    <Image
                      src={tmdbImage(result.poster_path, "w154")}
                      alt={title}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/8" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {year && <span className="text-xs text-white/40">{year}</span>}
                    <span className="text-[10px] text-white/35 border border-white/10 rounded px-1.5 py-0 capitalize">
                      {result.media_type}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() =>
                    isAdded ? handleRemove(result.id, watchlistId) : handleAdd(result)
                  }
                  className={`flex-shrink-0 min-w-[56px] flex items-center justify-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50 ${
                    isAdded
                      ? "border-white/15 text-white/50 hover:text-red-400 hover:border-red-400/30"
                      : "border-white/20 text-white/70 hover:text-white hover:border-white/35"
                  }`}
                >
                  {isMutating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isAdded ? (
                    "Remove"
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            );
          })}
          {isLoadingMore && (
            <p className="text-xs text-white/35 py-3 text-center">Loading more…</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
