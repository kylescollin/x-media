import { NextRequest, NextResponse } from "next/server";
import { getTmdbDetails } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get("tmdbId");
  const type = (searchParams.get("type") ?? "movie") as "movie" | "tv";

  if (!tmdbId) {
    return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
  }

  try {
    const data = await getTmdbDetails(Number(tmdbId), type);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[tmdb/details]", err);
    return NextResponse.json({ error: "TMDB details failed" }, { status: 500 });
  }
}
