"use client";

import { useMovies } from "@/hooks/useMovies";
import { useMediaGrid } from "@/hooks/useMediaGrid";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import MovieFilters from "./MovieFilters";
import MovieDetailModal from "./MovieDetailModal";

export default function MovieGrid() {
  const { data: movies, isLoading } = useMovies();
  const { items, filtered, filterProps, setSelectedId, selected } = useMediaGrid(movies, "movie");

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* ── Filter bar ───────────────────────────────────────── */}
        <MovieFilters {...filterProps} yearSortLabel="Release Year" />

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
              {items.length === 0 ? "No titles yet" : "No matches"}
            </p>
            <p className="text-sm text-white/25 mt-1">
              {items.length === 0
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
        {!isLoading && items.length > 0 && (
          <p className="text-xs text-white/20 text-center pb-6">
            {filtered.length === items.length
              ? `${items.length} titles`
              : `${filtered.length} of ${items.length} titles`}
          </p>
        )}
      </div>

      {/* ── Detail modal — rendered outside the grid flow ─── */}
      <MovieDetailModal movie={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
