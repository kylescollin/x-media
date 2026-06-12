"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { useUpdateMovie } from "@/hooks/useMovies";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

interface ShowCardProps {
  show: Movie;
  onSelect: (id: number) => void;
  priority?: boolean;
}

export default function ShowCard({ show, onSelect, priority = false }: ShowCardProps) {
  const year = show.releaseDate ? new Date(show.releaseDate).getFullYear() : null;
  const { mutate: updateMovie } = useUpdateMovie();

  const totalEpisodes = show.tvSeasons?.reduce((sum, s) => sum + (s.episodeCount ?? 0), 0) ?? 0;
  const watchedEpisodeCount = show.tvSeasons?.reduce((sum, s) => sum + s.watchedEpisodes, 0) ?? 0;
  const watchPct = totalEpisodes > 0 ? Math.round((watchedEpisodeCount / totalEpisodes) * 100) : 0;
  const hasSeasons = (show.tvSeasons?.length ?? 0) > 0;

  function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    updateMovie({ id: show.id, data: { isFavorite: !show.isFavorite } });
  }

  return (
    <div
      onClick={() => onSelect(show.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(show.id)}
      role="button"
      tabIndex={0}
      className="group relative block w-full aspect-[2/3] rounded-lg overflow-hidden bg-[oklch(0.14_0_0)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
        transition-transform duration-300 ease-out
        hover:scale-[1.04] hover:z-10"
      aria-label={`View details for ${show.title}`}
    >
      <Image
        src={tmdbImage(show.posterPath, "w500")}
        alt={show.title}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
        className="object-cover"
        priority={priority}
        draggable={false}
      />

      <div className="absolute inset-0 rounded-lg ring-1 ring-white/0 group-hover:ring-white/10 transition-all duration-300" />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent
        opacity-0 group-hover:opacity-100
        transition-opacity duration-300 ease-out" />

      <div className="absolute inset-x-0 bottom-0 p-3
        translate-y-1 group-hover:translate-y-0
        opacity-0 group-hover:opacity-100
        transition-all duration-300 ease-out">
        <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">{show.title}</p>
        {year && <p className="text-[11px] text-white/55 mt-0.5">{year}</p>}
      </div>

      {/* Favorite star */}
      <button
        onClick={toggleFavorite}
        aria-label={show.isFavorite ? "Remove from favorites" : "Add to favorites"}
        className={cn(
          "absolute top-2 right-2 p-1 rounded-full transition-all duration-200",
          show.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Star
          className={cn(
            "h-4 w-4 drop-shadow-sm transition-colors duration-200",
            show.isFavorite ? "fill-amber-400 text-amber-400" : "text-white/70 hover:text-amber-400"
          )}
        />
      </button>

      {/* Rating badge */}
      {show.userRating !== null && show.userRating !== undefined && (
        <div className="absolute top-2 left-2 flex items-center gap-0.5 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5">
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          <span className="text-[10px] font-bold text-white">{show.userRating}</span>
        </div>
      )}

      {/* Season progress chip — always visible when there are seasons */}
      {hasSeasons && (
        <div className="absolute bottom-2 left-2 right-2 opacity-100 group-hover:opacity-0 transition-opacity duration-200">
          <div className="flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5 w-fit max-w-full">
            <span className="text-[10px] font-medium text-white/70 truncate">
              {watchPct}% watched
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
