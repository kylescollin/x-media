"use client";

import { useState, useMemo } from "react";
import { useMovies } from "@/hooks/useMovies";
import ShowCard from "./ShowCard";
import MovieCardSkeleton from "@/components/library/MovieCardSkeleton";
import MovieFilters, { type SortOption } from "@/components/library/MovieFilters";
import MovieDetailModal from "@/components/library/MovieDetailModal";
import type { Movie } from "@/types";

export default function ShowGrid() {
  const { data: allMovies, isLoading } = useMovies();

  // Filter to TV shows only
  const shows = useMemo(() => allMovies?.filter((m) => m.mediaType === "tv") ?? [], [allMovies]);

  const [search, setSearch] = useState("");
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterValidated, setFilterValidated] = useState<boolean | null>(null);
  const [filterMyRating, setFilterMyRating] = useState<number | "unrated" | null>(null);
  const [filterMinScore, setFilterMinScore] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("title");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedShow = useMemo(
    () => shows.find((s) => s.id === selectedId) ?? null,
    [shows, selectedId]
  );

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const s of shows) for (const g of s.genres) set.add(g.name);
    return Array.from(set).sort();
  }, [shows]);

  const filtered = useMemo(() => {
    let list: Movie[] = [...shows];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(q));
    }
    if (filterGenres.length > 0) {
      list = list.filter((s) =>
        filterGenres.every((fg) => s.genres.some((g) => g.name === fg))
      );
    }
    if (filterFavorites) {
      list = list.filter((s) => s.isFavorite);
    }
    if (filterValidated !== null) {
      list = list.filter((s) => s.validated === filterValidated);
    }
    if (filterMyRating === "unrated") {
      list = list.filter((s) => s.userRating === null);
    } else if (filterMyRating !== null) {
      list = list.filter((s) => s.userRating === filterMyRating);
    }
    if (filterMinScore !== null) {
      list = list.filter((s) => (s.voteAverage ?? 0) >= filterMinScore);
    }
    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "rating") return (b.userRating ?? 0) - (a.userRating ?? 0);
      if (sortBy === "year") return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
      return 0;
    });
    return list;
  }, [shows, search, filterGenres, filterFavorites, filterValidated, filterMyRating, filterMinScore, sortBy]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <MovieFilters
          search={search}
          onSearchChange={setSearch}
          sortBy={sortBy}
          onSortChange={setSortBy}
          yearSortLabel="First Air Year"
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

        {isLoading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-base font-semibold text-white/50">
              {shows.length === 0 ? "No TV shows yet" : "No matches"}
            </p>
            <p className="text-sm text-white/25 mt-1">
              {shows.length === 0
                ? "Head to TV Import to add your shows."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6">
            {filtered.map((show, i) => (
              <ShowCard
                key={show.id}
                show={show}
                onSelect={setSelectedId}
                priority={i < 14}
              />
            ))}
          </div>
        )}

        {!isLoading && shows.length > 0 && (
          <p className="text-xs text-white/20 text-center pb-6">
            {filtered.length === shows.length
              ? `${shows.length} shows`
              : `${filtered.length} of ${shows.length} shows`}
          </p>
        )}
      </div>

      <MovieDetailModal movie={selectedShow} onClose={() => setSelectedId(null)} />
    </>
  );
}
