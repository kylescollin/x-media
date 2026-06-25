import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import MovieGrid from "@/components/library/MovieGrid";
import AddToLibraryDialog from "@/components/library/AddToLibraryDialog";
import { makeQueryClient } from "@/lib/queryClient";
import { getMoviesList } from "@/lib/db/movies";

export const metadata = { title: "Movies — Kyle's Media" };

// Library data is per-request (DB-backed, behind auth) — render dynamically.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  // Prefetch on the server so the grid renders with real posters on first paint
  // (no blank-then-fetch waterfall). The client `useMovies(["movies"])` query
  // reads this hydrated data instead of fetching on mount.
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({ queryKey: ["movies"], queryFn: getMoviesList });

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-white">Movies</h1>
        <div className="flex items-center gap-2">
          <AddToLibraryDialog type="movie" />
        </div>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <MovieGrid />
      </HydrationBoundary>
    </div>
  );
}
