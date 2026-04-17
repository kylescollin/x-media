import { NextRequest, NextResponse } from "next/server";
import { searchTmdb } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const type = (searchParams.get("type") ?? "movie") as "movie" | "tv";

  if (!q || q.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchTmdb(q.trim(), type);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[tmdb/search]", err);
    return NextResponse.json({ error: "TMDB search failed" }, { status: 500 });
  }
}
