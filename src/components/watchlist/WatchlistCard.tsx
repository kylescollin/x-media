"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { useRemoveFromWatchlist } from "@/hooks/useWatchlist";
import type { WatchlistItem } from "@/types";

interface WatchlistCardProps {
  item: WatchlistItem;
}

export default function WatchlistCard({ item }: WatchlistCardProps) {
  const { mutate: remove, isPending } = useRemoveFromWatchlist();
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
  const runtime = item.runtime
    ? `${Math.floor(item.runtime / 60)}h ${item.runtime % 60}m`
    : null;

  return (
    <div className="flex gap-3 rounded-xl border border-white/8 bg-white/4 p-3 hover:bg-white/6 transition-colors">
      <div className="relative flex-shrink-0 h-20 w-[54px] rounded-md overflow-hidden bg-white/8">
        <Image
          src={tmdbImage(item.posterPath, "w154")}
          alt={item.title}
          fill
          sizes="54px"
          className="object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white leading-tight truncate">{item.title}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {year && <span className="text-xs text-white/45">{year}</span>}
              {runtime && <span className="text-xs text-white/35">· {runtime}</span>}
              <span className="text-[10px] font-medium text-white/40 border border-white/12 rounded px-1.5 py-0 capitalize">
                {item.mediaType}
              </span>
            </div>
          </div>
          <button
            onClick={() => remove(item.id)}
            disabled={isPending}
            className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0 p-1"
            aria-label="Remove from watchlist"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {item.overview && (
          <p className="text-xs text-white/35 mt-1 line-clamp-2 leading-relaxed">
            {item.overview}
          </p>
        )}
      </div>
    </div>
  );
}
