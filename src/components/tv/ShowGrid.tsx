"use client";

import { useMovies } from "@/hooks/useMovies";
import { useMediaGrid } from "@/hooks/useMediaGrid";
import ShowCard from "./ShowCard";
import MovieCardSkeleton from "@/components/library/MovieCardSkeleton";
import MovieFilters from "@/components/library/MovieFilters";
import MovieDetailModal from "@/components/library/MovieDetailModal";

export default function ShowGrid() {
  const { data: allMovies, isLoading } = useMovies();
  const { items: shows, filtered, filterProps, setSelectedId, selected } = useMediaGrid(allMovies, "tv");

  return (
    <>
      <div className="flex flex-col gap-4">
        <MovieFilters {...filterProps} yearSortLabel="First Air Year" />

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

      <MovieDetailModal movie={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
