"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Movie, TvEpisode, TvSeason } from "@/types";

interface SeasonUpdate {
  seasonNumber: number;
  episodes: TvEpisode[];
  episodeCount?: number | null;
  airDate?: string | null;
  overview?: string | null;
}

/** Applies an optimistic season/episode update to a single movie record. */
function applySeasonUpdate(movie: Movie, movieId: number, u: SeasonUpdate): Movie {
  if (movie.id !== movieId) return movie;
  const watchedEpisodes = u.episodes.filter((e) => e.watched).length;
  const existing = movie.tvSeasons?.find((s) => s.seasonNumber === u.seasonNumber);
  if (existing) {
    return {
      ...movie,
      tvSeasons: movie.tvSeasons?.map((s) =>
        s.seasonNumber === u.seasonNumber ? { ...s, episodes: u.episodes, watchedEpisodes } : s
      ),
    };
  }
  const newSeason: TvSeason = {
    id: -u.seasonNumber,
    movieId,
    seasonNumber: u.seasonNumber,
    episodeCount: u.episodeCount ?? u.episodes.length,
    watchedEpisodes,
    airDate: u.airDate ?? null,
    overview: u.overview ?? null,
    episodes: u.episodes,
  };
  return { ...movie, tvSeasons: [...(movie.tvSeasons ?? []), newSeason] };
}

export function useUpdateSeasonEpisodes(movieId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seasonNumber,
      episodes,
      episodeCount,
      airDate,
      overview,
    }: {
      seasonNumber: number;
      episodes: TvEpisode[];
      episodeCount?: number | null;
      airDate?: string | null;
      overview?: string | null;
    }) => {
      const res = await fetch(`/api/movies/${movieId}/seasons/${seasonNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodes, episodeCount, airDate, overview }),
      });
      if (!res.ok) throw new Error("Failed to update season");
      return res.json() as Promise<TvSeason>;
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["movies"] });
      await queryClient.cancelQueries({ queryKey: ["movie", movieId] });
      const prev = queryClient.getQueryData(["movies"]);
      const prevDetail = queryClient.getQueryData(["movie", movieId]);
      // Update the grid's list cache and the modal's detail cache together.
      queryClient.setQueryData<Movie[]>(["movies"], (old) =>
        old?.map((m) => applySeasonUpdate(m, movieId, vars))
      );
      queryClient.setQueryData<Movie>(["movie", movieId], (old) =>
        old ? applySeasonUpdate(old, movieId, vars) : old
      );
      return { prev, prevDetail };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["movies"], ctx.prev);
      if (ctx?.prevDetail) queryClient.setQueryData(["movie", movieId], ctx.prevDetail);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      queryClient.invalidateQueries({ queryKey: ["movie", movieId] });
    },
  });
}
