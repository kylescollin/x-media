"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMovies } from "@/hooks/useMovies";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import MovieSearch from "./MovieSearch";
import MovieFilters from "./MovieFilters";
import MovieDetailModal from "./MovieDetailModal";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

type SortOption = "title" | "added" | "rating" | "year";

export default function MovieGrid() {
  const { data: movies, isLoading } = useMovies();

  // Filter + sort state
  const [search, setSearch] = useState("");
  const [filterGenre, setFilterGenre] = useState<string | null>(null);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterValidated, setFilterValidated] = useState<boolean | null>(null);
  const [filterMyRating, setFilterMyRating] = useState<number | "unrated" | null>(null);
  const [filterMinScore, setFilterMinScore] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("title"); // A-Z default
  const [showFilters, setShowFilters] = useState(false);

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

  const activeFilterCount =
    (filterGenre ? 1 : 0) +
    (filterFavorites ? 1 : 0) +
    (filterValidated !== null ? 1 : 0) +
    (filterMyRating !== null ? 1 : 0) +
    (filterMinScore !== null ? 1 : 0);

  const filtered = useMemo(() => {
    let list: Movie[] = [...moviesList];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(q));
    }
    if (filterGenre) {
      list = list.filter((m) => m.genres.some((g) => g.name === filterGenre));
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
  }, [moviesList, search, filterGenre, filterFavorites, filterValidated, filterMyRating, filterMinScore, sortBy]);

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* ── Toolbar ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3">
          <MovieSearch value={search} onChange={setSearch} />

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border transition-all duration-150 shrink-0",
              showFilters || activeFilterCount > 0
                ? "border-white/20 bg-white/8 text-white"
                : "border-white/8 text-white/40 hover:border-white/15 hover:text-white/70"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? (
              <ChevronUp className="h-3 w-3 ml-0.5" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-0.5" />
            )}
          </button>

          {/* Sort — always visible */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-9 w-36 text-xs border-white/8 bg-white/5 text-white/70 hover:text-white shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title A–Z</SelectItem>
              <SelectItem value="year">Release Year</SelectItem>
              <SelectItem value="rating">My Rating</SelectItem>
              <SelectItem value="added">Date Added</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Collapsible filter panel ──────────────────────── */}
        <MovieFilters
          genres={allGenres}
          activeGenre={filterGenre}
          onGenreChange={setFilterGenre}
          favoritesOnly={filterFavorites}
          onFavoritesChange={setFilterFavorites}
          filterValidated={filterValidated}
          onValidatedChange={setFilterValidated}
          filterMyRating={filterMyRating}
          onMyRatingChange={setFilterMyRating}
          filterMinScore={filterMinScore}
          onMinScoreChange={setFilterMinScore}
          visible={showFilters}
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
