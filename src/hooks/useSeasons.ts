"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TvEpisode, TvSeason } from "@/types";

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
    onMutate: async ({ seasonNumber, episodes, episodeCount, airDate, overview }) => {
      await queryClient.cancelQueries({ queryKey: ["movies"] });
      const prev = queryClient.getQueryData(["movies"]);
      queryClient.setQueryData<import("@/types").Movie[]>(["movies"], (old) =>
        old?.map((m) => {
          if (m.id !== movieId) return m;
          const existing = m.tvSeasons?.find((s) => s.seasonNumber === seasonNumber);
          if (existing) {
            return {
              ...m,
              tvSeasons: m.tvSeasons?.map((s) =>
                s.seasonNumber === seasonNumber
                  ? { ...s, episodes, watchedEpisodes: episodes.filter((e) => e.watched).length }
                  : s
              ),
            };
          }
          // New season — append it optimistically
          const newSeason: TvSeason = {
            id: -seasonNumber,
            movieId,
            seasonNumber,
            episodeCount: episodeCount ?? episodes.length,
            watchedEpisodes: episodes.filter((e) => e.watched).length,
            airDate: airDate ?? null,
            overview: overview ?? null,
            episodes,
          };
          return { ...m, tvSeasons: [...(m.tvSeasons ?? []), newSeason] };
        })
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["movies"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    },
  });
}
