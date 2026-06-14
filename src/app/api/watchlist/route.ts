import { NextRequest, NextResponse } from "next/server";
import { getWatchlistItems, addToWatchlist } from "@/lib/db/watchlist";
import { getTmdbDetails, extractMovieData } from "@/lib/tmdb";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  try {
    const items = await getWatchlistItems();
    return NextResponse.json(items);
  } catch (err) {
    console.error("[watchlist GET]", err);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const { tmdbId, type = "movie", viewerLabel = "mine" } = body;

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const details = await getTmdbDetails(Number(tmdbId), type);
    const data = extractMovieData(details, type);

    const item = await addToWatchlist({
      tmdbId: data.tmdbId,
      title: data.title,
      mediaType: data.mediaType,
      posterPath: data.posterPath,
      backdropPath: data.backdropPath,
      overview: data.overview,
      releaseDate: data.releaseDate,
      runtime: data.runtime,
      genres: data.genres,
      cast: data.cast,
      viewerLabel,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[watchlist POST]", err);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}
