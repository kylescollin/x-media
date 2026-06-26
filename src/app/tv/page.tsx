import { Suspense } from "react";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import ShowGrid from "@/components/tv/ShowGrid";
import GridSkeleton from "@/components/library/GridSkeleton";
import AddToLibraryDialog from "@/components/library/AddToLibraryDialog";
import { makeQueryClient } from "@/lib/queryClient";
import { getMoviesList } from "@/lib/db/movies";

export const metadata = { title: "TV Shows — Kyle's Media" };

// TV data is per-request (DB-backed, behind auth) — render dynamically.
export const dynamic = "force-dynamic";

export default function TvPage() {
  return (
    <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-white">TV Shows</h1>
        <div className="flex items-center gap-2">
          <AddToLibraryDialog type="tv" />
        </div>
      </div>
      {/* Stream the grid: the shell + skeleton paint immediately, then the
          server-prefetched grid streams in (no client fetch waterfall). */}
      <Suspense fallback={<GridSkeleton />}>
        <ShowGridLoader />
      </Suspense>
    </div>
  );
}

async function ShowGridLoader() {
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({ queryKey: ["movies"], queryFn: getMoviesList });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShowGrid />
    </HydrationBoundary>
  );
}
