"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TmdbSearchResult } from "@/types";

export function useTmdbSearch(query: string, type: "movie" | "tv" | "both" = "both") {
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moviePage, setMoviePage] = useState(0);
  const [movieTotalPages, setMovieTotalPages] = useState(0);
  const [tvPage, setTvPage] = useState(0);
  const [tvTotalPages, setTvTotalPages] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeQueryRef = useRef("");
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setMoviePage(0);
      setMovieTotalPages(0);
      setTvPage(0);
      setTvTotalPages(0);
      activeQueryRef.current = "";
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const capturedQuery = query;
      activeQueryRef.current = capturedQuery;
      setIsLoading(true);
      setResults([]);
      setMoviePage(0);
      setMovieTotalPages(0);
      setTvPage(0);
      setTvTotalPages(0);

      try {
        if (type === "both") {
          const [moviesData, tvData] = await Promise.all([
            fetch(`/api/tmdb/search?q=${encodeURIComponent(capturedQuery)}&type=movie&page=1`).then((r) => r.json()),
            fetch(`/api/tmdb/search?q=${encodeURIComponent(capturedQuery)}&type=tv&page=1`).then((r) => r.json()),
          ]);
          if (activeQueryRef.current !== capturedQuery) return;
          setMoviePage(1);
          setMovieTotalPages(moviesData.total_pages ?? 1);
          setTvPage(1);
          setTvTotalPages(tvData.total_pages ?? 1);
          const combined = [
            ...(moviesData.results ?? []).map((r: TmdbSearchResult) => ({ ...r, media_type: "movie" })),
            ...(tvData.results ?? []).map((r: TmdbSearchResult) => ({ ...r, media_type: "tv" })),
          ].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
          setResults(combined);
        } else {
          const data = await fetch(`/api/tmdb/search?q=${encodeURIComponent(capturedQuery)}&type=${type}&page=1`).then((r) => r.json());
          if (activeQueryRef.current !== capturedQuery) return;
          if (type === "movie") {
            setMoviePage(1);
            setMovieTotalPages(data.total_pages ?? 1);
          } else {
            setTvPage(1);
            setTvTotalPages(data.total_pages ?? 1);
          }
          setResults(data.results ?? []);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, type]);

  const hasMore =
    type === "both"
      ? moviePage < movieTotalPages || tvPage < tvTotalPages
      : type === "movie"
        ? moviePage < movieTotalPages
        : tvPage < tvTotalPages;

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const q = activeQueryRef.current;
    if (!q) return;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      if (type === "both") {
        const nextMoviePage = moviePage < movieTotalPages ? moviePage + 1 : null;
        const nextTvPage = tvPage < tvTotalPages ? tvPage + 1 : null;
        if (nextMoviePage === null && nextTvPage === null) return;

        const [moviesData, tvData] = await Promise.all([
          nextMoviePage !== null
            ? fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}&type=movie&page=${nextMoviePage}`).then((r) => r.json())
            : Promise.resolve(null),
          nextTvPage !== null
            ? fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}&type=tv&page=${nextTvPage}`).then((r) => r.json())
            : Promise.resolve(null),
        ]);

        const newItems: TmdbSearchResult[] = [];
        if (moviesData && nextMoviePage !== null) {
          setMoviePage(nextMoviePage);
          newItems.push(...(moviesData.results ?? []).map((r: TmdbSearchResult) => ({ ...r, media_type: "movie" })));
        }
        if (tvData && nextTvPage !== null) {
          setTvPage(nextTvPage);
          newItems.push(...(tvData.results ?? []).map((r: TmdbSearchResult) => ({ ...r, media_type: "tv" })));
        }
        setResults((prev) => [...prev, ...newItems].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)));
      } else {
        const currentPage = type === "movie" ? moviePage : tvPage;
        const totalPages = type === "movie" ? movieTotalPages : tvTotalPages;
        if (currentPage >= totalPages) return;
        const nextPage = currentPage + 1;
        const data = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}&type=${type}&page=${nextPage}`).then((r) => r.json());
        if (type === "movie") setMoviePage(nextPage);
        else setTvPage(nextPage);
        setResults((prev) => [...prev, ...(data.results ?? [])]);
      }
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [type, moviePage, movieTotalPages, tvPage, tvTotalPages]);

  return { results, isLoading, isLoadingMore, hasMore, loadMore };
}
