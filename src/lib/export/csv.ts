import type { Movie } from "@/types";

type CsvCell = string | number | null | undefined;

/**
 * RFC-4180 field escaping. Wraps a value in double-quotes (doubling any internal
 * quotes) when it contains a comma, quote, newline, or leading/trailing whitespace.
 * null/undefined render as an empty cell.
 */
export function escapeCsvField(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str) || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV string from a header row and data rows. Rows are joined with CRLF
 * and a UTF-8 BOM is prepended so Excel/Google Sheets detect the encoding correctly.
 */
export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return "﻿" + lines.join("\r\n");
}

/** Triggers a browser download of the given CSV content. No-op outside the browser. */
export function downloadCsv(filename: string, content: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const year = (date: string | null) => date?.slice(0, 4) ?? "";
const yesNo = (val: boolean) => (val ? "Yes" : "No");
const genreNames = (m: Movie) => m.genres.map((g) => g.name).join(", ");
const tmdbRating = (m: Movie) =>
  m.voteAverage != null ? m.voteAverage.toFixed(1) : "";
const byTitle = (a: Movie, b: Movie) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

const MOVIE_HEADERS = [
  "Title",
  "Year",
  "Favorite",
  "Watched Date",
  "Rating",
  "Director",
  "Runtime (min)",
  "Genres",
  "TMDB Rating",
  "Overview",
  "TMDB ID",
];

/** Serializes the movie library (mediaType === "movie") to a CSV string, A–Z by title. */
export function moviesToCsv(movies: Movie[]): string {
  const rows = movies
    .filter((m) => m.mediaType === "movie")
    .sort(byTitle)
    .map((m): CsvCell[] => [
      m.title,
      year(m.releaseDate),
      yesNo(m.isFavorite),
      m.watchedDate?.slice(0, 10) ?? "",
      m.userRating ?? "",
      m.directors?.join("; ") ?? "",
      m.runtime ?? "",
      genreNames(m),
      tmdbRating(m),
      m.overview ?? "",
      m.tmdbId,
    ]);
  return buildCsv(MOVIE_HEADERS, rows);
}

const TV_HEADERS = [
  "Title",
  "Year",
  "Favorite",
  "Watched Date",
  "Rating",
  "Season",
  "Episodes Watched",
  "Episodes Total",
  "Genres",
  "TMDB Rating",
  "Overview",
  "TMDB ID",
];

/**
 * Serializes the TV library (mediaType === "tv") to a CSV string, one row per season,
 * sorted A–Z by title then season number. Shows with no season data emit a single row
 * with blank season/episode columns so they aren't dropped.
 */
export function tvShowsToCsv(movies: Movie[]): string {
  const rows: CsvCell[][] = [];
  for (const m of movies.filter((s) => s.mediaType === "tv").sort(byTitle)) {
    const showCols = (season?: CsvCell, watched?: CsvCell, total?: CsvCell): CsvCell[] => [
      m.title,
      year(m.releaseDate),
      yesNo(m.isFavorite),
      m.watchedDate?.slice(0, 10) ?? "",
      m.userRating ?? "",
      season ?? "",
      watched ?? "",
      total ?? "",
      genreNames(m),
      tmdbRating(m),
      m.overview ?? "",
      m.tmdbId,
    ];
    const seasons = [...(m.tvSeasons ?? [])].sort((a, b) => a.seasonNumber - b.seasonNumber);
    if (seasons.length === 0) {
      rows.push(showCols());
    } else {
      for (const s of seasons) {
        rows.push(showCols(s.seasonNumber, s.watchedEpisodes, s.episodeCount ?? ""));
      }
    }
  }
  return buildCsv(TV_HEADERS, rows);
}
