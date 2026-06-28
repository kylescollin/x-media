import { prisma } from "@/lib/prisma";
import { getTmdbDetails } from "@/lib/tmdb";
import { deserializeWatchlistItem, deserializeTvSeason } from "./serializers";
import type { WatchlistItem } from "@/types";

export async function getWatchlistItems(): Promise<WatchlistItem[]> {
  const rows = await prisma.watchlistItem.findMany({
    orderBy: [{ priority: "desc" }, { addedAt: "desc" }],
  });
  const items = rows.map(deserializeWatchlistItem);

  const tvTmdbIds = items.filter((i) => i.mediaType === "tv").map((i) => i.tmdbId);
  if (tvTmdbIds.length === 0) return items;

  const linkedMovies = await prisma.movie.findMany({
    where: { tmdbId: { in: tvTmdbIds }, mediaType: "tv" },
    include: { tvSeasons: true },
  });
  if (linkedMovies.length === 0) return items;

  // Backfill numberOfSeasons from TMDB for any linked show that's missing it.
  // Fire-and-forget: never blocks the response (previously an `await Promise.all`
  // of live TMDB calls added seconds to every watchlist load). New shows already
  // get this set at import time, so this only ever touches legacy rows — whose
  // value lands on the next load.
  const missing = linkedMovies.filter((m) => m.numberOfSeasons == null);
  if (missing.length > 0) {
    void Promise.allSettled(
      missing.map(async (m) => {
        try {
          const details = await getTmdbDetails(m.tmdbId, "tv");
          const n = details.number_of_seasons as number | undefined;
          if (n != null) {
            await prisma.movie.update({ where: { id: m.id }, data: { numberOfSeasons: n } });
          }
        } catch { /* ignore transient TMDB errors */ }
      })
    );
  }

  const movieByTmdbId = new Map(linkedMovies.map((m) => [m.tmdbId, m]));

  return items.map((item) => {
    const linked = movieByTmdbId.get(item.tmdbId);
    if (!linked) return item;
    return {
      ...item,
      linkedMovieId: linked.id,
      numberOfSeasons: linked.numberOfSeasons ?? undefined,
      tvSeasons: linked.tvSeasons.map((s) => deserializeTvSeason(s)),
    };
  });
}

export interface CreateWatchlistInput {
  tmdbId: number;
  title: string;
  mediaType?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  genres?: string | null;
  cast?: string | null;
  viewerLabel?: string;
}

export async function addToWatchlist(data: CreateWatchlistInput): Promise<WatchlistItem> {
  const row = await prisma.watchlistItem.create({
    data: {
      tmdbId: data.tmdbId,
      title: data.title,
      mediaType: data.mediaType ?? "movie",
      posterPath: data.posterPath,
      backdropPath: data.backdropPath,
      overview: data.overview,
      releaseDate: data.releaseDate,
      runtime: data.runtime,
      genres: data.genres,
      cast: data.cast,
      viewerLabel: data.viewerLabel ?? "mine",
    },
  });
  return deserializeWatchlistItem(row);
}

export async function removeFromWatchlist(id: number): Promise<void> {
  await prisma.watchlistItem.delete({ where: { id } });
}

export async function updateWatchlistItem(
  id: number,
  data: { priority?: number; streamingInfo?: string | null; viewerLabel?: string; seasons?: string | null }
): Promise<WatchlistItem> {
  const row = await prisma.watchlistItem.update({ where: { id }, data });
  return deserializeWatchlistItem(row);
}
