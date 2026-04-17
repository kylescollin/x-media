"use client";

import { useState, useEffect, useRef } from "react";
import type { TmdbSearchResult } from "@/types";

export function useTmdbSearch(query: string, type: "movie" | "tv" | "both" = "both") {
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (type === "both") {
          const [movies, tv] = await Promise.all([
            fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}&type=movie`).then((r) => r.json()),
            fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}&type=tv`).then((r) => r.json()),
          ]);
          const combined = [
            ...(movies.results ?? []).map((r: TmdbSearchResult) => ({ ...r, media_type: "movie" })),
            ...(tv.results ?? []).map((r: TmdbSearchResult) => ({ ...r, media_type: "tv" })),
          ].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
          setResults(combined.slice(0, 10));
        } else {
          const data = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}&type=${type}`).then((r) => r.json());
          setResults((data.results ?? []).slice(0, 10));
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, type]);

  return { results, isLoading };
}
