"use client";

import { useState } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";
import WatchlistCard from "@/components/watchlist/WatchlistCard";
import AddToWatchlistDialog from "@/components/watchlist/AddToWatchlistDialog";

export default function WatchlistPage() {
  const { data: items, isLoading } = useWatchlist();
  const [viewerLabel, setViewerLabel] = useState<"mine" | "ours">("mine");

  const filtered = items?.filter((i) => i.viewerLabel === viewerLabel) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Watchlist</h1>
          <p className="text-sm text-white/35 mt-1">Movies & shows to watch next</p>
        </div>
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
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[88px] w-full rounded-xl bg-white/4 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-base font-semibold text-white/50">Nothing here yet</p>
          <p className="text-sm text-white/25 mt-1">
            {viewerLabel === "mine"
              ? "Add movies and shows you want to watch solo."
              : "Add movies and shows to watch together."}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((item) => (
            <WatchlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
