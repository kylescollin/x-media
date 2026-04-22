import { NextRequest, NextResponse } from "next/server";
import { upsertTvSeason } from "@/lib/db/movies";
import type { TvEpisode } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; seasonNumber: string }> }
) {
  try {
    const { id, seasonNumber } = await params;
    const movieId = Number(id);
    const season = Number(seasonNumber);

    if (isNaN(movieId) || isNaN(season)) {
      return NextResponse.json({ error: "Invalid id or seasonNumber" }, { status: 400 });
    }

    const body = await request.json();
    const episodes: TvEpisode[] = body.episodes;
    const episodeCount: number | null = body.episodeCount ?? null;
    const airDate: string | null = body.airDate ?? null;
    const overview: string | null = body.overview ?? null;

    if (!Array.isArray(episodes)) {
      return NextResponse.json({ error: "episodes array is required" }, { status: 400 });
    }

    const updated = await upsertTvSeason(movieId, season, episodeCount, episodes, airDate, overview);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[seasons PATCH]", err);
    return NextResponse.json({ error: "Failed to update season" }, { status: 500 });
  }
}
