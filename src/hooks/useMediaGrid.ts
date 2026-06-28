"use client";

import { useState, useMemo } from "react";
import type { SortOption, MovieFiltersProps } from "@/components/library/MovieFilters";
import type { Movie } from "@/types";

/**
 * Shared filter/sort/selection logic for the Library (movies) and TV Shows grids.
 * Both pages read from the same `["movies"]` query and discriminate on `mediaType`,
 * so this hook narrows to one type, exposes the filter state, and derives the
 * filtered+sorted list, the available genres, and the currently-selected item.
 *
 * `filterProps` is ready to spread straight into <MovieFilters {...filterProps} />
 * (the per-page `yearSortLabel` is the only prop left to the caller).
 */
export function useMediaGrid(all: Movie[] | undefined, mediaType: "movie" | "tv") {
  // Filter + sort state
  const [search, setSearch] = useState("");
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterValidated, setFilterValidated] = useState<boolean | null>(null);
  const [filterMyRating, setFilterMyRating] = useState<number | "unrated" | null>(null);
  const [filterMinScore, setFilterMinScore] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("title"); // A–Z default

  // Modal selection — no page navigation
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const items = useMemo(
    () => all?.filter((m) => m.mediaType === mediaType) ?? [],
    [all, mediaType]
  );

  const selected = useMemo(
    () => items.find((m) => m.id === selectedId) ?? null,
    [items, selectedId]
  );

  const allGenres = useMemo(
    () => [...new Set(items.flatMap((m) => m.genres.map((g) => g.name)))].sort(),
    [items]
  );

  const filtered = useMemo(() => {
    let list: Movie[] = [...items];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(q));
    }
    if (filterGenres.length > 0) {
      list = list.filter((m) =>
        filterGenres.every((fg) => m.genres.some((g) => g.name === fg))
      );
    }
    if (filterFavorites) {
      list = list.filter((m) => m.isFavorite);
    }
    if (filterValidated !== null) {
      list = list.filter((m) => m.validated === filterValidated);
    }
    if (filterMyRating === "unrated") {
      list = list.filter((m) => m.userRating === null);
    } else if (filterMyRating !== null) {
      list = list.filter((m) => m.userRating === filterMyRating);
    }
    if (filterMinScore !== null) {
      list = list.filter((m) => (m.voteAverage ?? 0) >= filterMinScore);
    }

    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "rating") return (b.userRating ?? 0) - (a.userRating ?? 0);
      if (sortBy === "year") return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
      return 0; // "added" — API order
    });

    return list;
  }, [items, search, filterGenres, filterFavorites, filterValidated, filterMyRating, filterMinScore, sortBy]);

  // Pre-wired props for <MovieFilters /> (caller supplies `yearSortLabel`).
  const filterProps: Omit<MovieFiltersProps, "yearSortLabel"> = {
    search,
    onSearchChange: setSearch,
    sortBy,
    onSortChange: setSortBy,
    favoritesOnly: filterFavorites,
    onFavoritesChange: setFilterFavorites,
    filterValidated,
    onValidatedChange: setFilterValidated,
    filterMyRating,
    onMyRatingChange: setFilterMyRating,
    filterMinScore,
    onMinScoreChange: setFilterMinScore,
    genres: allGenres,
    selectedGenres: filterGenres,
    onGenresChange: setFilterGenres,
  };

  return { items, filtered, allGenres, filterProps, selectedId, setSelectedId, selected };
}
