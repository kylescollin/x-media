import { NextRequest, NextResponse } from "next/server";
import { getTmdbSeasonDetails, extractSeasonEpisodes } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get("tmdbId");
    const season = searchParams.get("season");

    if (!tmdbId || !season) {
      return NextResponse.json({ error: "tmdbId and season are required" }, { status: 400 });
    }

    const data = await getTmdbSeasonDetails(Number(tmdbId), Number(season));
    const episodes = extractSeasonEpisodes(data);
    return NextResponse.json({ episodes, overview: data.overview ?? null, airDate: data.air_date ?? null });
  } catch (err) {
    console.error("[tmdb/season GET]", err);
    return NextResponse.json({ error: "Failed to fetch season details" }, { status: 500 });
  }
}
