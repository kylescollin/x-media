"use client";

import { Star, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MovieFiltersProps {
  genres: string[];
  activeGenre: string | null;
  onGenreChange: (g: string | null) => void;
  favoritesOnly: boolean;
  onFavoritesChange: (v: boolean) => void;
  filterValidated: boolean | null;
  onValidatedChange: (v: boolean | null) => void;
  visible: boolean;
}

export default function MovieFilters({
  genres,
  activeGenre,
  onGenreChange,
  favoritesOnly,
  onFavoritesChange,
  filterValidated,
  onValidatedChange,
  visible,
}: MovieFiltersProps) {
  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        visible ? "max-h-32 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-2 flex-wrap pt-2 pb-1">
        {/* Favorites toggle */}
        <button
          onClick={() => onFavoritesChange(!favoritesOnly)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
            favoritesOnly
              ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
              : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
          )}
        >
          <Star className={cn("h-3 w-3", favoritesOnly && "fill-amber-400 text-amber-400")} />
          Favorites
        </button>

        {/* Confirmed toggle */}
        <button
          onClick={() => onValidatedChange(filterValidated === true ? null : true)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
            filterValidated === true
              ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
              : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
          )}
        >
          <CheckCircle className={cn("h-3 w-3", filterValidated === true && "text-amber-400")} />
          Confirmed
        </button>

        {/* Unconfirmed toggle */}
        <button
          onClick={() => onValidatedChange(filterValidated === false ? null : false)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
            filterValidated === false
              ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
              : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
          )}
        >
          <Circle className={cn("h-3 w-3", filterValidated === false && "text-amber-400")} />
          Unconfirmed
        </button>

        {/* Genre chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => onGenreChange(activeGenre === genre ? null : genre)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 whitespace-nowrap",
                activeGenre === genre
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/8 text-white/40 hover:border-white/20 hover:text-white/70"
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
