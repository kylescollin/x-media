"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WatchlistItem } from "@/types";

export function useWatchlist() {
  return useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const res = await fetch("/api/watchlist");
      if (!res.ok) throw new Error("Failed to fetch watchlist");
      return res.json();
    },
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tmdbId,
      type,
      viewerLabel = "mine",
    }: {
      tmdbId: number;
      type: "movie" | "tv";
      viewerLabel?: "mine" | "ours";
    }) => {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, type, viewerLabel }),
      });
      if (!res.ok) throw new Error("Failed to add to watchlist");
      return res.json() as Promise<WatchlistItem>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useUpdateWatchlistLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, viewerLabel }: { id: number; viewerLabel: "mine" | "ours" }) => {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerLabel }),
      });
      if (!res.ok) throw new Error("Failed to update label");
      return res.json() as Promise<WatchlistItem>;
    },
    onMutate: async ({ id, viewerLabel }) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });
      const prev = queryClient.getQueryData<WatchlistItem[]>(["watchlist"]);
      queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (old) =>
        old?.map((item) => (item.id === id ? { ...item, viewerLabel } : item))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["watchlist"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove from watchlist");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["watchlist"] });
      const prev = queryClient.getQueryData<WatchlistItem[]>(["watchlist"]);
      queryClient.setQueryData<WatchlistItem[]>(["watchlist"], (old) =>
        old?.filter((item) => item.id !== id)
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["watchlist"], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}
