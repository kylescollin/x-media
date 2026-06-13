"use client";

import { useState, useMemo } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useMovies } from "@/hooks/useMovies";
import WatchlistCard from "@/components/watchlist/WatchlistCard";
import WatchlistDetailModal from "@/components/watchlist/WatchlistDetailModal";
import AddToWatchlistDialog from "@/components/watchlist/AddToWatchlistDialog";
import type { Movie } from "@/types";

export default function WatchlistPage() {
  const { data: items, isLoading } = useWatchlist();
  const { data: movies } = useMovies();
  const [viewerLabel, setViewerLabel] = useState<"mine" | "ours">("mine");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const movieById = useMemo(() => {
    const map = new Map<number, Movie>();
    movies?.forEach((m) => map.set(m.id, m));
    return map;
  }, [movies]);

  const visible = items?.filter((i) => i.viewerLabel === viewerLabel) ?? [];

  const selectedItem = items?.find((i) => i.id === selectedId) ?? null;
  const linkedMovie = selectedItem?.linkedMovieId ? movieById.get(selectedItem.linkedMovieId) : undefined;

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-white">Watchlist</h1>
        <AddToWatchlistDialog />
      </div>

      <div className="flex items-center gap-1 mb-6 p-1 rounded-lg bg-white/5 w-fit">
        <button
          onClick={() => setViewerLabel("mine")}
          className={`text-sm px-4 py-1.5 rounded-md transition-colors font-medium ${
            viewerLabel === "mine"
              ? "bg-white/15 text-white"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          Mine
        </button>
        <button
          onClick={() => setViewerLabel("ours")}
          className={`text-sm px-4 py-1.5 rounded-md transition-colors font-medium ${
            viewerLabel === "ours"
              ? "bg-white/15 text-white"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          Ours
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-white/4 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && visible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-base font-semibold text-white/50">Nothing here yet</p>
          <p className="text-sm text-white/25 mt-1">
            {viewerLabel === "mine"
              ? "Add movies and shows you want to watch solo."
              : "Add movies and shows to watch together."}
          </p>
        </div>
      )}

      {!isLoading && visible.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6">
          {visible.map((item, i) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onSelect={setSelectedId}
              priority={i < 8}
            />
          ))}
        </div>
      )}

      {!isLoading && visible.length > 0 && (
        <p className="mt-8 text-center text-xs text-white/20">
          {visible.length} {visible.length === 1 ? "title" : "titles"}
        </p>
      )}

      <WatchlistDetailModal item={selectedItem} linkedMovie={linkedMovie} onClose={() => setSelectedId(null)} />
    </div>
  );
}
