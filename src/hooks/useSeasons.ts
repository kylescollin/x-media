"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TvEpisode, TvSeason } from "@/types";

export function useUpdateSeasonEpisodes(movieId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seasonNumber,
      episodes,
    }: {
      seasonNumber: number;
      episodes: TvEpisode[];
    }) => {
      const res = await fetch(`/api/movies/${movieId}/seasons/${seasonNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodes }),
      });
      if (!res.ok) throw new Error("Failed to update season");
      return res.json() as Promise<TvSeason>;
    },
    onMutate: async ({ seasonNumber, episodes }) => {
      await queryClient.cancelQueries({ queryKey: ["movies"] });
      const prev = queryClient.getQueryData(["movies"]);
      // Optimistically update the episodes in the movie list
      queryClient.setQueryData<import("@/types").Movie[]>(["movies"], (old) =>
        old?.map((m) => {
          if (m.id !== movieId) return m;
          return {
            ...m,
            tvSeasons: m.tvSeasons?.map((s) =>
              s.seasonNumber === seasonNumber
                ? { ...s, episodes, watchedEpisodes: episodes.filter((e) => e.watched).length }
                : s
            ),
          };
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
