"use client";

import { Star, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STAR_LABELS: Record<number, string> = { 1: "★", 2: "★★", 3: "★★★", 4: "★★★★", 5: "★★★★★" };
const SCORE_OPTIONS = [6, 7, 7.5, 8, 8.5, 9] as const;

export type SortOption = "title" | "added" | "rating" | "year";

const fieldBase =
  "h-9 rounded-lg border px-3 text-xs font-medium transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap";
const fieldIdle = "border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20";
const fieldActive = "border-amber-400/60 bg-amber-400/10 text-amber-400";

interface MovieFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  yearSortLabel: string;
  favoritesOnly: boolean;
  onFavoritesChange: (v: boolean) => void;
  filterValidated: boolean | null;
  onValidatedChange: (v: boolean | null) => void;
  filterMyRating: number | "unrated" | null;
  onMyRatingChange: (v: number | "unrated" | null) => void;
  filterMinScore: number | null;
  onMinScoreChange: (v: number | null) => void;
  genres: string[];
  selectedGenres: string[];
  onGenresChange: (v: string[]) => void;
}

export default function MovieFilters({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  yearSortLabel,
  favoritesOnly,
  onFavoritesChange,
  filterValidated,
  onValidatedChange,
  filterMyRating,
  onMyRatingChange,
  filterMinScore,
  onMinScoreChange,
  genres,
  selectedGenres,
  onGenresChange,
}: MovieFiltersProps) {
  const sortLabels: Record<SortOption, string> = {
    title: "Title A–Z",
    year: yearSortLabel,
    rating: "My Rating",
    added: "Date Added",
  };

  // Status dropdown <-> filterValidated (boolean | null)
  const statusValue = filterValidated === null ? "all" : filterValidated ? "confirmed" : "unconfirmed";
  function handleStatusChange(val: string | null) {
    if (val === "confirmed") onValidatedChange(true);
    else if (val === "unconfirmed") onValidatedChange(false);
    else onValidatedChange(null);
  }

  // My Rating dropdown <-> filterMyRating (number | "unrated" | null)
  const myRatingValue = filterMyRating === null ? "any" : String(filterMyRating);
  function handleMyRatingChange(val: string | null) {
    if (!val || val === "any") onMyRatingChange(null);
    else if (val === "unrated") onMyRatingChange("unrated");
    else onMyRatingChange(Number(val));
  }

  // TMDB Score dropdown <-> filterMinScore (number | null)
  const minScoreValue = filterMinScore === null ? "any" : String(filterMinScore);
  function handleMinScoreChange(val: string | null) {
    onMinScoreChange(!val || val === "any" ? null : Number(val));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search titles…"
          className={cn(
            "h-9 w-full rounded-lg border bg-white/5 pl-9 pr-8 text-xs text-white placeholder:text-white/30 transition-colors duration-150 focus:outline-none focus:bg-white/8",
            search ? "border-white/20" : "border-white/10 focus:border-white/20"
          )}
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Sort */}
      <Select value={sortBy} onValueChange={(v) => v && onSortChange(v as SortOption)}>
        <SelectTrigger className={cn(fieldBase, fieldIdle)}>
          <SelectValue>{(v) => `Sort: ${sortLabels[(v as SortOption) ?? "title"]}`}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="title">Title A–Z</SelectItem>
          <SelectItem value="year">{yearSortLabel}</SelectItem>
          <SelectItem value="rating">My Rating</SelectItem>
          <SelectItem value="added">Date Added</SelectItem>
        </SelectContent>
      </Select>

      {/* Favorites */}
      <button
        onClick={() => onFavoritesChange(!favoritesOnly)}
        className={cn(fieldBase, favoritesOnly ? fieldActive : fieldIdle)}
      >
        <Star className={cn("h-3.5 w-3.5", favoritesOnly && "fill-amber-400 text-amber-400")} />
        Favorites
      </button>

      {/* Status */}
      <Select value={statusValue} onValueChange={handleStatusChange}>
        <SelectTrigger className={cn(fieldBase, filterValidated !== null ? fieldActive : fieldIdle)}>
          <SelectValue>
            {(v) =>
              `Status: ${v === "confirmed" ? "Confirmed" : v === "unconfirmed" ? "Unconfirmed" : "All"}`
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="unconfirmed">Unconfirmed</SelectItem>
        </SelectContent>
      </Select>

      {/* My Rating */}
      <Select value={myRatingValue} onValueChange={handleMyRatingChange}>
        <SelectTrigger className={cn(fieldBase, filterMyRating !== null ? fieldActive : fieldIdle)}>
          <SelectValue>
            {(v) =>
              `My Rating: ${
                !v || v === "any" ? "Any" : v === "unrated" ? "Unrated" : STAR_LABELS[Number(v)]
              }`
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          {[1, 2, 3, 4, 5].map((n) => (
            <SelectItem key={n} value={String(n)}>
              {STAR_LABELS[n]}
            </SelectItem>
          ))}
          <SelectItem value="unrated">Unrated</SelectItem>
        </SelectContent>
      </Select>

      {/* TMDB Score */}
      <Select value={minScoreValue} onValueChange={handleMinScoreChange}>
        <SelectTrigger className={cn(fieldBase, filterMinScore !== null ? fieldActive : fieldIdle)}>
          <SelectValue>
            {(v) => `TMDB Score: ${!v || v === "any" ? "Any" : `${v}+`}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          {SCORE_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}+
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Genres — multiselect */}
      <Select multiple value={selectedGenres} onValueChange={(v) => onGenresChange(v as string[])}>
        <SelectTrigger className={cn(fieldBase, selectedGenres.length > 0 ? fieldActive : fieldIdle)}>
          <SelectValue>
            {(v) => {
              const arr = (v as string[]) ?? [];
              return arr.length > 0 ? `Genres (${arr.length})` : "Genres";
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {genres.map((genre) => (
            <SelectItem key={genre} value={genre}>
              {genre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
