"use client";

import { useMemo } from "react";
import AddItemDialog from "@/components/shared/AddItemDialog";
import { useMovies, useAddMovie } from "@/hooks/useMovies";
import type { Movie } from "@/types";

interface AddToLibraryDialogProps {
  type: "movie" | "tv";
}

export default function AddToLibraryDialog({ type }: AddToLibraryDialogProps) {
  const { data: movies = [] } = useMovies();
  const { mutate: addMovie } = useAddMovie();
  const label = type === "movie" ? "movie" : "TV show";

  const existingByTmdbId = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of movies) {
      if (m.mediaType === type) map.set(m.tmdbId, m.id);
    }
    return map;
  }, [movies, type]);

  return (
    <AddItemDialog
      title={`Add ${label}`}
      searchType={type}
      searchPlaceholder={`Search ${label}s…`}
      getExistingId={(tmdbId) => existingByTmdbId.get(tmdbId)}
      onAdd={(result, cb) => {
        addMovie(
          { tmdbId: result.id, type },
          { onSuccess: (movie: Movie) => cb.onSuccess(movie.id), onError: cb.onError }
        );
      }}
    />
  );
}
