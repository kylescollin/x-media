/**
 * SQLite stores JSON as strings. These helpers parse/stringify at the DB boundary.
 * When migrating to Postgres, switch schema fields to Json type and remove these.
 */
import type { Movie, WatchlistItem, Genre, CastMember, StreamingService, TvSeason, TvEpisode } from "@/types";
import type { Movie as PrismaMovie, WatchlistItem as PrismaWatchlistItem, TvSeason as PrismaTvSeason } from "@/generated/prisma/client";

export function deserializeMovie(raw: PrismaMovie & { tvSeasons?: unknown[] }): Movie {
  return {
    id: raw.id,
    tmdbId: raw.tmdbId,
    title: raw.title,
    overview: raw.overview,
    posterPath: raw.posterPath,
    backdropPath: raw.backdropPath,
    releaseDate: raw.releaseDate,
    runtime: raw.runtime,
    voteAverage: raw.voteAverage,
    genres: safeParseJson<Genre[]>(raw.genres, []),
    cast: raw.cast ? safeParseJson<CastMember[]>(raw.cast, []) : null,
    directors: raw.directors ? safeParseJson<string[]>(raw.directors, []) : null,
    mediaType: raw.mediaType as "movie" | "tv",
    watched: raw.watched,
    watchedDate: raw.watchedDate ? raw.watchedDate.toISOString() : null,
    userRating: raw.userRating,
    isFavorite: raw.isFavorite,
    userNotes: raw.userNotes,
    validated: raw.validated,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    tvSeasons: raw.tvSeasons ? (raw.tvSeasons as PrismaTvSeason[]).map(deserializeTvSeason) : undefined,
  };
}

export function deserializeTvSeason(raw: PrismaTvSeason): TvSeason {
  return {
    id: raw.id,
    movieId: raw.movieId,
    seasonNumber: raw.seasonNumber,
    episodeCount: raw.episodeCount,
    watchedEpisodes: raw.watchedEpisodes,
    airDate: raw.airDate,
    overview: raw.overview,
    episodes: raw.episodes ? safeParseJson<TvEpisode[]>(raw.episodes, []) : null,
  };
}

export function deserializeWatchlistItem(raw: PrismaWatchlistItem): WatchlistItem {
  return {
    id: raw.id,
    tmdbId: raw.tmdbId,
    title: raw.title,
    mediaType: raw.mediaType as "movie" | "tv",
    posterPath: raw.posterPath,
    overview: raw.overview,
    releaseDate: raw.releaseDate,
    runtime: raw.runtime,
    genres: raw.genres ? safeParseJson<Genre[]>(raw.genres, []) : null,
    streamingInfo: raw.streamingInfo
      ? safeParseJson<StreamingService[]>(raw.streamingInfo, [])
      : null,
    viewerLabel: (raw.viewerLabel ?? "mine") as "mine" | "ours",
    priority: raw.priority,
    addedAt: raw.addedAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
