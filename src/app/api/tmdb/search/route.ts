import { NextRequest, NextResponse } from "next/server";
import { searchTmdb } from "@/lib/tmdb";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const type = (searchParams.get("type") ?? "movie") as "movie" | "tv";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  if (!q || q.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchTmdb(q.trim(), type, page);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[tmdb/search]", err);
    return NextResponse.json({ error: "TMDB search failed" }, { status: 500 });
  }
}
