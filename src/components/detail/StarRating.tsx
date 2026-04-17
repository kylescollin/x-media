"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateMovie } from "@/hooks/useMovies";

interface StarRatingProps {
  movieId: number;
  rating: number | null;
}

export default function StarRating({ movieId, rating }: StarRatingProps) {
  const { mutate } = useUpdateMovie();

  function setRating(value: number) {
    mutate({ id: movieId, data: { userRating: value === rating ? null : value } });
  }

  return (
    <div className="flex items-center gap-0.5" aria-label="Rate this title">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => setRating(n)}
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          className="group p-0.5"
        >
          <Star
            className={cn(
              "h-5 w-5 transition-all duration-150",
              rating && n <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-white/20 group-hover:text-amber-400"
            )}
          />
        </button>
      ))}
    </div>
  );
}
