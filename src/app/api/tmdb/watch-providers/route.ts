import { NextRequest, NextResponse } from "next/server";
import { getTmdbWatchProviders } from "@/lib/tmdb";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get("tmdbId");
    const type = (searchParams.get("type") ?? "movie") as "movie" | "tv";

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    const data = await getTmdbWatchProviders(Number(tmdbId), type);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[tmdb/watch-providers GET]", err);
    return NextResponse.json({ error: "Failed to fetch watch providers" }, { status: 500 });
  }
}
