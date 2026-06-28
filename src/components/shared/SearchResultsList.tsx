"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb";
import { useTmdbSearch } from "@/hooks/useTmdbSearch";
import type { TmdbSearchResult } from "@/types";

function preventInputZoom() {
  document.querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1');
}

function restoreInputZoom() {
  document.querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1');
}

interface SearchResultsListProps {
  searchType: "movie" | "tv" | "both";
  searchPlaceholder: string;
  autoFocus?: boolean;
  /** Slot rendered under the search box (e.g. a Mine/Ours or media-type toggle). */
  filters?: ReactNode;
  /** Whole-row click handler — makes each row a button. Used by the reconnect overlay. */
  onSelect?: (result: TmdbSearchResult) => void;
  /** Right-side slot per row (e.g. Add/Remove button). Used by the Add dialog. */
  renderAction?: (result: TmdbSearchResult) => ReactNode;
}

export default function SearchResultsList({
  searchType,
  searchPlaceholder,
  autoFocus,
  filters,
  onSelect,
  renderAction,
}: SearchResultsListProps) {
  const [query, setQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(10);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading, isLoadingMore, hasMore, loadMore } = useTmdbSearch(query, searchType);
  const visibleResults = results.slice(0, displayCount);

  // Focus input after dialog animation completes to avoid iOS transform-zoom bug
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 150);
    return () => clearTimeout(t);
  }, [autoFocus]);

  return (
    <>
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDisplayCount(10);
            }}
            placeholder={searchPlaceholder}
            onFocus={preventInputZoom}
            onBlur={restoreInputZoom}
            className="w-full rounded-lg bg-white/6 border border-white/10 text-base sm:text-sm text-white placeholder:text-white/30 pl-9 pr-3 py-2 outline-none focus:border-white/25 transition-colors"
          />
        </div>
        {filters}
      </div>

      <div
        className="max-h-72 overflow-y-auto overscroll-contain scrollbar-thin px-2 pb-3 space-y-0.5"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight > 80) return;
          if (displayCount < results.length) {
            setDisplayCount((c) => c + 10);
          } else if (hasMore && !isLoadingMore) {
            loadMore();
          }
        }}
      >
        {isLoading && (
          <p className="text-sm text-white/35 px-3 py-6 text-center">Searching…</p>
        )}
        {!isLoading && query.length >= 2 && results.length === 0 && (
          <p className="text-sm text-white/35 px-3 py-6 text-center">No results found</p>
        )}
        {visibleResults.map((result) => {
          const titleText = result.title ?? result.name ?? "";
          const year = (result.release_date ?? result.first_air_date ?? "").slice(0, 4);
          const key = `${result.media_type ?? searchType}-${result.id}`;

          const rowContent = (
            <>
              <div className="relative h-12 w-8 flex-shrink-0 rounded overflow-hidden bg-white/8">
                {result.poster_path ? (
                  <Image
                    src={tmdbImage(result.poster_path, "w154")}
                    alt={titleText}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-white/8" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{titleText}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {year && <span className="text-xs text-white/40">{year}</span>}
                  {searchType === "both" && result.media_type && (
                    <span className="text-[10px] text-white/35 border border-white/10 rounded px-1.5 py-0 capitalize">
                      {result.media_type}
                    </span>
                  )}
                </div>
              </div>
              {renderAction?.(result)}
            </>
          );

          return onSelect ? (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(result)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5 transition-colors"
            >
              {rowContent}
            </button>
          ) : (
            <div
              key={key}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2"
            >
              {rowContent}
            </div>
          );
        })}
        {isLoadingMore && (
          <p className="text-xs text-white/35 py-3 text-center">Loading more…</p>
        )}
      </div>
    </>
  );
}
