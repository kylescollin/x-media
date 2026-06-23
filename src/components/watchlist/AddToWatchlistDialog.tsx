"use client";

import { useState, useMemo } from "react";
import AddItemDialog from "@/components/shared/AddItemDialog";
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from "@/hooks/useWatchlist";
import type { TmdbSearchResult } from "@/types";

export default function AddToWatchlistDialog() {
  const [viewerLabel, setViewerLabel] = useState<"mine" | "ours">("mine");
  const { mutate: addItem } = useAddToWatchlist();
  const { mutate: removeItem } = useRemoveFromWatchlist();
  const { data: watchlistItems = [] } = useWatchlist();

  const existingByTmdbId = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of watchlistItems) map.set(item.tmdbId, item.id);
    return map;
  }, [watchlistItems]);

  return (
    <AddItemDialog
      title="Add to watchlist"
      searchType="both"
      searchPlaceholder="Search movies & TV shows…"
      getExistingId={(tmdbId) => existingByTmdbId.get(tmdbId)}
      onAdd={(result: TmdbSearchResult, cb) => {
        const type = (result.media_type ?? "movie") as "movie" | "tv";
        addItem(
          { tmdbId: result.id, type, viewerLabel },
          { onSuccess: (item) => cb.onSuccess(item.id), onError: cb.onError }
        );
      }}
      onRemove={(id, cb) => removeItem(id, { onSuccess: cb.onSuccess, onError: cb.onError })}
      filters={
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
      }
    />
  );
}
