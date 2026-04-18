import { NextRequest, NextResponse } from "next/server";
import { getTmdbDetails, extractMovieData } from "@/lib/tmdb";
import { rematchMovie } from "@/lib/db/movies";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tmdbId, mediaType } = await request.json();

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "tmdbId and mediaType are required" }, { status: 400 });
    }

    const details = await getTmdbDetails(Number(tmdbId), mediaType as "movie" | "tv");
    const movieData = extractMovieData(details, mediaType as "movie" | "tv");

    const movie = await rematchMovie(Number(id), movieData);
    return NextResponse.json(movie);
  } catch (err) {
    console.error("[rematch POST]", err);
    return NextResponse.json({ error: "Failed to rematch movie" }, { status: 500 });
  }
}
