import { prisma } from "@/lib/prisma";
import { deserializeMovie, deserializeTvSeason } from "./serializers";
import type { Movie, TvEpisode, TvSeason } from "@/types";

export async function getMovies(): Promise<Movie[]> {
  const rows = await prisma.movie.findMany({
    orderBy: { createdAt: "desc" },
    include: { tvSeasons: true },
  });
  return rows.map(deserializeMovie);
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
