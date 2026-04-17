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
