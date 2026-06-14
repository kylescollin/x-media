import { NextRequest, NextResponse } from "next/server";
import { removeFromWatchlist, updateWatchlistItem } from "@/lib/db/watchlist";
import { requireAuth } from "@/lib/auth-guard";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    const body = await request.json();
    const { seasons, ...rest } = body;
    const updateData = {
      ...rest,
      ...(seasons !== undefined
        ? { seasons: seasons === null ? null : JSON.stringify(seasons) }
        : {}),
    };
    const item = await updateWatchlistItem(Number(id), updateData);
    return NextResponse.json(item);
  } catch (err) {
    console.error("[watchlist PATCH]", err);
    return NextResponse.json({ error: "Failed to update watchlist item" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;
  try {
    const { id } = await params;
    await removeFromWatchlist(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[watchlist DELETE]", err);
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }
}
