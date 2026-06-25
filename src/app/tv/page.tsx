import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import ShowGrid from "@/components/tv/ShowGrid";
import AddToLibraryDialog from "@/components/library/AddToLibraryDialog";
import { makeQueryClient } from "@/lib/queryClient";
import { getMoviesList } from "@/lib/db/movies";

export const metadata = { title: "TV Shows — Kyle's Media" };

// TV data is per-request (DB-backed, behind auth) — render dynamically.
export const dynamic = "force-dynamic";

export default async function TvPage() {
  // Prefetch on the server so the grid renders with real posters on first paint.
  // Same ["movies"] cache the Library page uses — shared across both grids.
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({ queryKey: ["movies"], queryFn: getMoviesList });

  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-white">TV Shows</h1>
        <div className="flex items-center gap-2">
          <AddToLibraryDialog type="tv" />
        </div>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ShowGrid />
      </HydrationBoundary>
    </div>
  );
}
