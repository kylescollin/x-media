import { NextRequest, NextResponse } from "next/server";
import { getWatchlistItems, addToWatchlist } from "@/lib/db/watchlist";
import { getTmdbDetails, extractMovieData } from "@/lib/tmdb";

export async function GET() {
  try {
    const items = await getWatchlistItems();
    return NextResponse.json(items);
  } catch (err) {
    console.error("[watchlist GET]", err);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmdbId, type = "movie" } = body;

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
      overview: data.overview,
      releaseDate: data.releaseDate,
      runtime: data.runtime,
      genres: data.genres,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[watchlist POST]", err);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}
