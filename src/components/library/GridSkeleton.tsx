import MovieCardSkeleton from "./MovieCardSkeleton";

/**
 * Loading placeholder for the Library/TV grids. Mirrors the real grid layout
 * (filter bar + poster grid) so there's no layout shift when content streams
 * in. Rendered as a Suspense fallback while the server prefetches movies.
 */
export default function GridSkeleton({ count = 24 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar placeholder */}
      <div className="h-9 w-full max-w-sm rounded-md bg-[oklch(0.12_0_0)] animate-pulse" />

      {/* Poster grid placeholder — matches the real grid container exactly */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6">
        {Array.from({ length: count }).map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
