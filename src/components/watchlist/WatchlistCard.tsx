"use client";

import Image from "next/image";
import { tmdbImage } from "@/lib/tmdb";
import { tvWatchedPercent } from "@/lib/utils/tvProgress";
import MediaProgressBar from "@/components/detail/MediaProgressBar";
import type { WatchlistItem } from "@/types";

interface WatchlistCardProps {
  item: WatchlistItem;
  onSelect: (id: number) => void;
  priority?: boolean;
}

export default function WatchlistCard({ item, onSelect, priority = false }: WatchlistCardProps) {
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;

  const tvPct =
    item.mediaType === "tv"
      ? tvWatchedPercent(item.tvSeasons, item.numberOfSeasons)
      : null;

  return (
    <div
      onClick={() => onSelect(item.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(item.id)}
      role="button"
      tabIndex={0}
      className="group relative block w-full aspect-[2/3] rounded-lg overflow-hidden bg-[oklch(0.14_0_0)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
        transition-transform duration-300 ease-out
        hover:scale-[1.04] hover:z-10"
      aria-label={`View details for ${item.title}`}
    >
      <Image
        src={tmdbImage(item.posterPath, "w500")}
        alt={item.title}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
        className="object-cover"
        priority={priority}
        draggable={false}
      />

      {/* Season progress bar */}
      {tvPct !== null && tvPct > 0 && tvPct < 100 && (
        <MediaProgressBar pct={tvPct} />
      )}

      {/* Hover shadow ring */}
      <div className="absolute inset-0 rounded-lg ring-1 ring-white/0 group-hover:ring-white/10 transition-all duration-300" />

      {/* Gradient overlay — fades in on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent
        opacity-0 group-hover:opacity-100
        transition-opacity duration-300 ease-out" />

      {/* Title + year — slides up on hover */}
      <div className="absolute inset-x-0 bottom-0 p-3
        translate-y-1 group-hover:translate-y-0
        opacity-0 group-hover:opacity-100
        transition-all duration-300 ease-out">
        <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">{item.title}</p>
        {year && <p className="text-[11px] text-white/55 mt-0.5">{year}</p>}
      </div>
    </div>
  );
}
