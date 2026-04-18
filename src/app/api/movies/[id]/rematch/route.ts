import { NextRequest, NextResponse } from "next/server";
import { getTmdbDetails, extractMovieData } from "@/lib/tmdb";
import { rematchMovie, deleteMovie, getMovieByTmdbId } from "@/lib/db/movies";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tmdbId, mediaType } = await request.json();

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
    }

    const details = await getTmdbDetails(Number(tmdbId), mediaType as "movie" | "tv");
    const movieData = extractMovieData(details, mediaType as "movie" | "tv");

    try {
      const movie = await rematchMovie(Number(id), movieData);
      return NextResponse.json(movie);
    } catch (err: unknown) {
      // If the new tmdbId already exists in the library (unique constraint), the correct
      // movie is already there — delete the wrong match and return the existing record.
      const isPrismaUniqueError =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002";

      if (isPrismaUniqueError) {
        const existing = await getMovieByTmdbId(Number(tmdbId));
        if (existing) {
          await deleteMovie(Number(id));
          return NextResponse.json(existing);
        }
      }
      throw err;
    }
  } catch (err) {
    console.error("[rematch POST]", err);
    return NextResponse.json({ error: "Failed to rematch movie" }, { status: 500 });
  }
}
