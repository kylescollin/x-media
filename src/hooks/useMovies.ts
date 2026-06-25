"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Movie } from "@/types";

export function useMovies() {
  return useQuery<Movie[]>({
    queryKey: ["movies"],
    queryFn: async () => {
      const res = await fetch("/api/movies");
      if (!res.ok) throw new Error("Failed to fetch movies");
      return res.json();
    },
  });
}

/**
 * Fetches the full movie/show — including per-episode data, which the list
 * query (`/api/movies`) omits to keep the grid payload small. Used by the
 * detail modal to load episodes on demand when a title is opened.
 */
export function useMovieDetail(id: number, enabled = true) {
  return useQuery<Movie>({
    queryKey: ["movie", id],
    queryFn: async () => {
      const res = await fetch(`/api/movies/${id}`);
      if (!res.ok) throw new Error("Failed to fetch movie detail");
      return res.json();
    },
    enabled: enabled && id > 0,
  });
}

export function useDeleteMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/movies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete movie");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["movies"] });
      const prev = queryClient.getQueryData<Movie[]>(["movies"]);
      queryClient.setQueryData<Movie[]>(["movies"], (old) => old?.filter((m) => m.id !== id));
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

export function useUpdateMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/movies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update movie");
      return res.json() as Promise<Movie>;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["movies"] });
      const prev = queryClient.getQueryData<Movie[]>(["movies"]);
      queryClient.setQueryData<Movie[]>(["movies"], (old) =>
        old?.map((m) => (m.id === id ? { ...m, ...data } : m))
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

export function useAddMovie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: "movie" | "tv" }) => {
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, type }),
      });
      if (!res.ok) throw new Error("Failed to add to library");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["movies"] }),
  });
}
