"use client";

import { useWatchlist } from "@/hooks/useWatchlist";
import WatchlistCard from "@/components/watchlist/WatchlistCard";
import AddToWatchlistDialog from "@/components/watchlist/AddToWatchlistDialog";

export default function WatchlistPage() {
  const { data: items, isLoading } = useWatchlist();

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Watchlist</h1>
          <p className="text-sm text-white/35 mt-1">Movies & shows to watch next</p>
        </div>
        <AddToWatchlistDialog />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[88px] w-full rounded-xl bg-white/4 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-base font-semibold text-white/50">Nothing here yet</p>
          <p className="text-sm text-white/25 mt-1">Add movies and shows you want to watch.</p>
        </div>
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <WatchlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
