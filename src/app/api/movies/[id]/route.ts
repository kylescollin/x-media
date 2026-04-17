import { NextRequest, NextResponse } from "next/server";
import { getMovie, updateMovie, deleteMovie } from "@/lib/db/movies";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await getMovie(Number(id));
  if (!movie) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(movie);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userRating, isFavorite, userNotes, watchedDate } = body;

    const movie = await updateMovie(Number(id), {
      ...(userRating !== undefined && { userRating }),
      ...(isFavorite !== undefined && { isFavorite }),
      ...(userNotes !== undefined && { userNotes }),
      ...(watchedDate !== undefined && { watchedDate: watchedDate ? new Date(watchedDate) : null }),
    });

    return NextResponse.json(movie);
  } catch (err) {
    console.error("[movies PATCH]", err);
    return NextResponse.json({ error: "Failed to update movie" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteMovie(Number(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[movies DELETE]", err);
    return NextResponse.json({ error: "Failed to delete movie" }, { status: 500 });
  }
}
