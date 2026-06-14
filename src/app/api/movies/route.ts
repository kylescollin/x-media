import { NextRequest, NextResponse } from "next/server";
import { getMovies, upsertMovie } from "@/lib/db/movies";
import { getTmdbDetails, extractMovieData } from "@/lib/tmdb";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  try {
    const movies = await getMovies();
    return NextResponse.json(movies);
  } catch (err) {
    console.error("[movies GET]", err);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const { tmdbId, type = "movie", isFavorite = false } = body;

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const details = await getTmdbDetails(Number(tmdbId), type);
    const data = extractMovieData(details, type);
    const movie = await upsertMovie({ ...data, isFavorite });

    return NextResponse.json(movie, { status: 201 });
  } catch (err) {
    console.error("[movies POST]", err);
    return NextResponse.json({ error: "Failed to add movie" }, { status: 500 });
  }
}
