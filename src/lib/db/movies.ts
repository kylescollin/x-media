import { prisma } from "@/lib/prisma";
import { getTmdbDetails } from "@/lib/tmdb";
import { deserializeMovie, deserializeTvSeason } from "./serializers";
import type { Movie, TvEpisode, TvSeason } from "@/types";

/**
 * Backfill `numberOfSeasons` from TMDB for TV shows missing it. Fire-and-forget:
 * this never blocks the response — the values are persisted and appear on the
 * next load. (Previously this awaited live TMDB calls inside the request path,
 * which added seconds to `/api/movies`.)
 */
function backfillNumberOfSeasons(movies: Movie[]): void {
  const missing = movies.filter((m) => m.mediaType === "tv" && m.numberOfSeasons == null);
  if (missing.length === 0) return;

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

export async function getMovies(): Promise<Movie[]> {
  const rows = await prisma.movie.findMany({
    orderBy: { createdAt: "desc" },
    include: { tvSeasons: true },
  });
  const movies = rows.map((row) => deserializeMovie(row));
  backfillNumberOfSeasons(movies);
  return movies;
}

/**
 * List-view query for the Library/TV grids. Includes season summary fields for
 * progress bars but omits the heavy per-episode `episodes` JSON — episodes are
 * loaded on demand when a title's detail modal opens (via `getMovie`).
 */
export async function getMoviesList(): Promise<Movie[]> {
  const rows = await prisma.movie.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tvSeasons: {
        select: {
          id: true,
          movieId: true,
          seasonNumber: true,
          episodeCount: true,
          watchedEpisodes: true,
          airDate: true,
          overview: true,
        },
      },
    },
  });
  const movies = rows.map((row) => deserializeMovie(row, { includeEpisodes: false }));
  backfillNumberOfSeasons(movies);
  return movies;
}

export async function getMovie(id: number): Promise<Movie | null> {
  const row = await prisma.movie.findUnique({
    where: { id },
    include: { tvSeasons: true },
  });
  if (!row) return null;
  return deserializeMovie(row);
}

export async function getMovieByTmdbId(tmdbId: number): Promise<Movie | null> {
  const row = await prisma.movie.findUnique({
    where: { tmdbId },
    include: { tvSeasons: true },
  });
  if (!row) return null;
  return deserializeMovie(row);
}

export interface CreateMovieInput {
  tmdbId: number;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  voteAverage?: number | null;
  genres: string;
  cast?: string | null;
  directors?: string | null;
  mediaType?: string;
  numberOfSeasons?: number | null;
  isFavorite?: boolean;
  watchedDate?: Date | null;
}

export async function createMovie(data: CreateMovieInput): Promise<Movie> {
  const row = await prisma.movie.create({
    data: {
      tmdbId: data.tmdbId,
      title: data.title,
      overview: data.overview,
      posterPath: data.posterPath,
      backdropPath: data.backdropPath,
      releaseDate: data.releaseDate,
      runtime: data.runtime,
      voteAverage: data.voteAverage,
      genres: data.genres,
      cast: data.cast,
      directors: data.directors,
      mediaType: data.mediaType ?? "movie",
      numberOfSeasons: data.numberOfSeasons ?? null,
      isFavorite: data.isFavorite ?? false,
      watchedDate: data.watchedDate,
    },
    include: { tvSeasons: true },
  });
  return deserializeMovie(row);
}

export async function upsertMovie(data: CreateMovieInput): Promise<Movie> {
  const row = await prisma.movie.upsert({
    where: { tmdbId: data.tmdbId },
    update: {
      title: data.title,
      overview: data.overview,
      posterPath: data.posterPath,
      backdropPath: data.backdropPath,
      releaseDate: data.releaseDate,
      runtime: data.runtime,
      voteAverage: data.voteAverage,
      genres: data.genres,
      cast: data.cast,
      directors: data.directors,
      numberOfSeasons: data.numberOfSeasons ?? undefined,
    },
    create: {
      tmdbId: data.tmdbId,
      title: data.title,
      overview: data.overview,
      posterPath: data.posterPath,
      backdropPath: data.backdropPath,
      releaseDate: data.releaseDate,
      runtime: data.runtime,
      voteAverage: data.voteAverage,
      genres: data.genres,
      cast: data.cast,
      directors: data.directors,
      mediaType: data.mediaType ?? "movie",
      numberOfSeasons: data.numberOfSeasons ?? null,
      isFavorite: data.isFavorite ?? false,
      watchedDate: data.watchedDate,
    },
    include: { tvSeasons: true },
  });
  return deserializeMovie(row);
}

export interface UpdateMovieInput {
  userRating?: number | null;
  isFavorite?: boolean;
  userNotes?: string | null;
  watchedDate?: Date | null;
  validated?: boolean;
}

export async function updateMovie(id: number, data: UpdateMovieInput): Promise<Movie> {
  const row = await prisma.movie.update({
    where: { id },
    data,
    include: { tvSeasons: true },
  });
  return deserializeMovie(row);
}

export async function deleteMovie(id: number): Promise<void> {
  await prisma.movie.delete({ where: { id } });
}

export interface RematchMovieInput {
  tmdbId: number;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  voteAverage?: number | null;
  genres: string;
  cast?: string | null;
  directors?: string | null;
  mediaType: string;
}

export async function upsertTvSeason(
  movieId: number,
  seasonNumber: number,
  episodeCount: number | null,
  episodes: TvEpisode[],
  airDate?: string | null,
  overview?: string | null
): Promise<TvSeason> {
  const row = await prisma.tvSeason.upsert({
    where: { movieId_seasonNumber: { movieId, seasonNumber } },
    update: {
      episodeCount,
      watchedEpisodes: episodes.filter((e) => e.watched).length,
      episodes: JSON.stringify(episodes),
      airDate: airDate ?? undefined,
      overview: overview ?? undefined,
    },
    create: {
      movieId,
      seasonNumber,
      episodeCount,
      watchedEpisodes: episodes.filter((e) => e.watched).length,
      episodes: JSON.stringify(episodes),
      airDate: airDate ?? null,
      overview: overview ?? null,
    },
  });
  return deserializeTvSeason(row);
}

export async function updateSeasonEpisodes(
  movieId: number,
  seasonNumber: number,
  episodes: TvEpisode[]
): Promise<TvSeason> {
  const watchedEpisodes = episodes.filter((e) => e.watched).length;
  const row = await prisma.tvSeason.update({
    where: { movieId_seasonNumber: { movieId, seasonNumber } },
    data: {
      episodes: JSON.stringify(episodes),
      watchedEpisodes,
    },
  });
  return deserializeTvSeason(row);
}

export async function rematchMovie(id: number, data: RematchMovieInput): Promise<Movie> {
  const row = await prisma.movie.update({
    where: { id },
    data: {
      tmdbId: data.tmdbId,
      title: data.title,
      overview: data.overview,
      posterPath: data.posterPath,
      backdropPath: data.backdropPath,
      releaseDate: data.releaseDate,
      runtime: data.runtime,
      voteAverage: data.voteAverage,
      genres: data.genres,
      cast: data.cast,
      directors: data.directors,
      mediaType: data.mediaType,
      validated: true,
    },
    include: { tvSeasons: true },
  });
  return deserializeMovie(row);
}
