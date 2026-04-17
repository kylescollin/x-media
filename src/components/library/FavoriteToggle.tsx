"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateMovie } from "@/hooks/useMovies";

interface FavoriteToggleProps {
  movieId: number;
  isFavorite: boolean;
  className?: string;
}

export default function FavoriteToggle({ movieId, isFavorite, className }: FavoriteToggleProps) {
  const { mutate } = useUpdateMovie();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    mutate({ id: movieId, data: { isFavorite: !isFavorite } });
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "rounded-full p-1.5 transition-colors duration-200",
        isFavorite
          ? "text-amber-400 hover:text-amber-300"
          : "text-white/40 hover:text-amber-400",
        className
      )}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star className={cn("h-5 w-5", isFavorite && "fill-amber-400")} />
    </button>
  );
}
