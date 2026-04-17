import { prisma } from "@/lib/prisma";
import { deserializeMovie } from "./serializers";
import type { Movie } from "@/types";

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
