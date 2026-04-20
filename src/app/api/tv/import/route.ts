import { NextRequest, NextResponse } from "next/server";
import { searchTmdb, getTmdbDetails, getTmdbSeasonDetails, extractMovieData, extractSeasonEpisodes } from "@/lib/tmdb";
import { upsertMovie, upsertTvSeason } from "@/lib/db/movies";
import type { ParsedTvShow } from "@/lib/utils/parseTvImport";

export interface TvImportResultItem {
  showName: string;
  status: "matched" | "unmatched" | "error";
  tmdbId?: number;
  tmdbTitle?: string;
  seasonsCreated?: number;
  error?: string;
}

// Simple batch helper: process items in chunks with a pause between batches
async function batchProcess<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 5,
  pauseMs = 1000
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    for (const r of chunkResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
    if (i + batchSize < items.length) {
      await new Promise((res) => setTimeout(res, pauseMs));
    }
  }
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shows: ParsedTvShow[] = body.shows;

    if (!Array.isArray(shows) || shows.length === 0) {
      return NextResponse.json({ error: "shows array is required" }, { status: 400 });
    }

    const results: TvImportResultItem[] = [];

    // Process shows in small batches to respect TMDB rate limits
    await batchProcess(
      shows,
      async (show) => {
        try {
          // Search TMDB for the show
          const searchRes = await searchTmdb(show.showName, "tv");
          const topResult = searchRes.results?.[0];

          if (!topResult) {
            results.push({ showName: show.showName, status: "unmatched" });
            return;
          }

          // Fetch full show details
          const details = await getTmdbDetails(topResult.id, "tv");
          const movieData = extractMovieData(details, "tv");

          // Upsert the show as a Movie record
          const movie = await upsertMovie({ ...movieData, isFavorite: false });

          // Determine which seasons to create
          let seasonNumbers: number[];
          if (show.seasons.includes("ALL")) {
            const total = (details.number_of_seasons as number) ?? 1;
            seasonNumbers = Array.from({ length: total }, (_, i) => i + 1);
          } else {
            seasonNumbers = show.seasons
              .filter((s) => s !== "ALL")
              .map(Number)
              .filter((n) => !isNaN(n) && n > 0);
          }

          // Fetch episode data for each season (small batch)
          await batchProcess(
            seasonNumbers,
            async (seasonNum) => {
              try {
                const seasonData = await getTmdbSeasonDetails(movie.tmdbId, seasonNum);
                const episodes = extractSeasonEpisodes(seasonData);
                // Mark all episodes as watched since user said they watched this season
                const watchedEpisodes = episodes.map((ep) => ({ ...ep, watched: true }));
                await upsertTvSeason(
                  movie.id,
                  seasonNum,
                  episodes.length || null,
                  watchedEpisodes,
                  (seasonData.air_date as string) || null,
                  (seasonData.overview as string) || null
                );
              } catch {
                // If TMDB season fetch fails, create a basic season record
                await upsertTvSeason(movie.id, seasonNum, null, [], null, null);
              }
            },
            3,
            500
          );

          results.push({
            showName: show.showName,
            status: "matched",
            tmdbId: movie.tmdbId,
            tmdbTitle: movie.title,
            seasonsCreated: seasonNumbers.length,
          });
        } catch (err) {
          results.push({
            showName: show.showName,
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      },
      3,
      1500
    );

    const matched = results.filter((r) => r.status === "matched").length;
    const unmatched = results.filter((r) => r.status === "unmatched").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({ results, matched, unmatched, errors });
  } catch (err) {
    console.error("[tv/import POST]", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
