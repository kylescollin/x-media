"use client";

import { useState, useMemo } from "react";
import { useMovies } from "@/hooks/useMovies";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import MovieFilters, { type SortOption } from "./MovieFilters";
import MovieDetailModal from "./MovieDetailModal";
import type { Movie } from "@/types";

export default function MovieGrid() {
  const { data: movies, isLoading } = useMovies();

  // Filter + sort state
  const [search, setSearch] = useState("");
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterValidated, setFilterValidated] = useState<boolean | null>(null);
  const [filterMyRating, setFilterMyRating] = useState<number | "unrated" | null>(null);
  const [filterMinScore, setFilterMinScore] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("title"); // A-Z default

  // Modal state — no page navigation
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Library shows movies only
  const moviesList = useMemo(() => movies?.filter((m) => m.mediaType === "movie") ?? [], [movies]);

  const selectedMovie = useMemo(
    () => moviesList.find((m) => m.id === selectedId) ?? null,
    [moviesList, selectedId]
  );

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const m of moviesList) for (const g of m.genres) set.add(g.name);
    return Array.from(set).sort();
  }, [moviesList]);

  const filtered = useMemo(() => {
    let list: Movie[] = [...moviesList];

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
  }, [moviesList, search, filterGenres, filterFavorites, filterValidated, filterMyRating, filterMinScore, sortBy]);

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* ── Filter bar ───────────────────────────────────────── */}
        <MovieFilters
          search={search}
          onSearchChange={setSearch}
          sortBy={sortBy}
          onSortChange={setSortBy}
          yearSortLabel="Release Year"
          favoritesOnly={filterFavorites}
          onFavoritesChange={setFilterFavorites}
          filterValidated={filterValidated}
          onValidatedChange={setFilterValidated}
          filterMyRating={filterMyRating}
          onMyRatingChange={setFilterMyRating}
          filterMinScore={filterMinScore}
          onMinScoreChange={setFilterMinScore}
          genres={allGenres}
          selectedGenres={filterGenres}
          onGenresChange={setFilterGenres}
        />

        {/* ── Skeleton grid ─────────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6">
            {Array.from({ length: 28 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-base font-semibold text-white/50">
              {moviesList.length === 0 ? "No titles yet" : "No matches"}
            </p>
            <p className="text-sm text-white/25 mt-1">
              {moviesList.length === 0
                ? "Head to Import to add your Google Sheet list."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        )}

        {/* ── Movie grid ───────────────────────────────────── */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6">
            {filtered.map((movie, i) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onSelect={setSelectedId}
                priority={i < 14}
              />
            ))}
          </div>
        )}

        {/* ── Count ────────────────────────────────────────── */}
        {!isLoading && moviesList.length > 0 && (
          <p className="text-xs text-white/20 text-center pb-6">
            {filtered.length === moviesList.length
              ? `${moviesList.length} titles`
              : `${filtered.length} of ${moviesList.length} titles`}
          </p>
        )}
      </div>

      {/* ── Detail modal — rendered outside the grid flow ─── */}
      <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedId(null)} />
    </>
  );
}
