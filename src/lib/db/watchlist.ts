import { prisma } from "@/lib/prisma";
import { deserializeWatchlistItem } from "./serializers";
import type { WatchlistItem } from "@/types";

export async function getWatchlistItems(): Promise<WatchlistItem[]> {
  const rows = await prisma.watchlistItem.findMany({
    orderBy: [{ priority: "desc" }, { addedAt: "desc" }],
  });
  return rows.map(deserializeWatchlistItem);
}

export interface CreateWatchlistInput {
  tmdbId: number;
  title: string;
  mediaType?: string;
  posterPath?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  genres?: string | null;
}

export async function addToWatchlist(data: CreateWatchlistInput): Promise<WatchlistItem> {
  const row = await prisma.watchlistItem.create({
    data: {
      tmdbId: data.tmdbId,
      title: data.title,
      mediaType: data.mediaType ?? "movie",
      posterPath: data.posterPath,
      overview: data.overview,
      releaseDate: data.releaseDate,
      runtime: data.runtime,
      genres: data.genres,
    },
  });
  return deserializeWatchlistItem(row);
}

export async function removeFromWatchlist(id: number): Promise<void> {
  await prisma.watchlistItem.delete({ where: { id } });
}

export async function updateWatchlistItem(
  id: number,
  data: { priority?: number; streamingInfo?: string | null }
): Promise<WatchlistItem> {
  const row = await prisma.watchlistItem.update({ where: { id }, data });
  return deserializeWatchlistItem(row);
}
