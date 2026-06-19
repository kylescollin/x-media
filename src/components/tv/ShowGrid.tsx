"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMovies } from "@/hooks/useMovies";
import ShowCard from "./ShowCard";
import MovieCardSkeleton from "@/components/library/MovieCardSkeleton";
import MovieSearch from "@/components/library/MovieSearch";
import MovieFilters from "@/components/library/MovieFilters";
import MovieDetailModal from "@/components/library/MovieDetailModal";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types";

type SortOption = "title" | "added" | "rating" | "year";

export default function ShowGrid() {
  const { data: allMovies, isLoading } = useMovies();

  // Filter to TV shows only
  const shows = useMemo(() => allMovies?.filter((m) => m.mediaType === "tv") ?? [], [allMovies]);

  const [search, setSearch] = useState("");
  const [filterGenre, setFilterGenre] = useState<string | null>(null);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterValidated, setFilterValidated] = useState<boolean | null>(null);
  const [filterMyRating, setFilterMyRating] = useState<number | "unrated" | null>(null);
  const [filterMinScore, setFilterMinScore] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("title");
  const [showFilters, setShowFilters] = useState(false);

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

  const activeFilterCount =
    (filterGenre ? 1 : 0) +
    (filterFavorites ? 1 : 0) +
    (filterValidated !== null ? 1 : 0) +
    (filterMyRating !== null ? 1 : 0) +
    (filterMinScore !== null ? 1 : 0);

  const filtered = useMemo(() => {
    let list: Movie[] = [...shows];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(q));
    }
    if (filterGenre) {
      list = list.filter((s) => s.genres.some((g) => g.name === filterGenre));
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
  }, [shows, search, filterGenre, filterFavorites, filterValidated, filterMyRating, filterMinScore, sortBy]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <MovieSearch value={search} onChange={setSearch} />

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
            {showFilters ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
          </button>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-9 w-36 text-xs border-white/8 bg-white/5 text-white/70 hover:text-white shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title A–Z</SelectItem>
              <SelectItem value="year">First Air Year</SelectItem>
              <SelectItem value="rating">My Rating</SelectItem>
              <SelectItem value="added">Date Added</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
