"use client";

import { Star, CheckCircle, Circle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STAR_LABELS: Record<number, string> = { 1: "★", 2: "★★", 3: "★★★", 4: "★★★★", 5: "★★★★★" };
const SCORE_OPTIONS = [6, 7, 7.5, 8, 8.5, 9] as const;

interface MovieFiltersProps {
  genres: string[];
  activeGenre: string | null;
  onGenreChange: (g: string | null) => void;
  favoritesOnly: boolean;
  onFavoritesChange: (v: boolean) => void;
  filterValidated: boolean | null;
  onValidatedChange: (v: boolean | null) => void;
  filterMyRating: number | "unrated" | null;
  onMyRatingChange: (v: number | "unrated" | null) => void;
  filterMinScore: number | null;
  onMinScoreChange: (v: number | null) => void;
  visible: boolean;
}

export default function MovieFilters({
  genres,
  activeGenre,
  onGenreChange,
  favoritesOnly,
  onFavoritesChange,
  filterValidated,
  onValidatedChange,
  filterMyRating,
  onMyRatingChange,
  filterMinScore,
  onMinScoreChange,
  visible,
}: MovieFiltersProps) {
  const myRatingValue = filterMyRating === null ? "any" : String(filterMyRating);
  const minScoreValue = filterMinScore === null ? "any" : String(filterMinScore);

  function handleMyRatingChange(val: string | null) {
    if (!val || val === "any") onMyRatingChange(null);
    else if (val === "unrated") onMyRatingChange("unrated");
    else onMyRatingChange(Number(val));
  }

  function handleMinScoreChange(val: string | null) {
    onMinScoreChange(!val || val === "any" ? null : Number(val));
  }

  const chipBase =
    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 whitespace-nowrap";
  const chipInactive = "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70";
  const chipActive = "border-amber-400/60 bg-amber-400/10 text-amber-400";

  const segBase =
    "flex items-center gap-1 border px-3 py-1 text-xs font-medium transition-all duration-150 whitespace-nowrap";
  const segInactive = "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70";
  const segActive = "border-amber-400/60 bg-amber-400/10 text-amber-400";

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        visible ? "max-h-64 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col gap-2 pt-2 pb-2">
        {/* Row 1: quick filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Favorites */}
          <button
            onClick={() => onFavoritesChange(!favoritesOnly)}
            className={cn(chipBase, favoritesOnly ? chipActive : chipInactive)}
          >
            <Star className={cn("h-3 w-3", favoritesOnly && "fill-amber-400 text-amber-400")} />
            Favorites
          </button>

          {/* Validation — 3-way segmented */}
          <div className="flex">
            <button
              onClick={() => onValidatedChange(null)}
              className={cn(
                segBase,
                "rounded-l-full border-r-0",
                filterValidated === null ? segActive : segInactive
              )}
            >
              All
            </button>
            <button
              onClick={() => onValidatedChange(filterValidated === true ? null : true)}
              className={cn(
                segBase,
                "border-x-0",
                filterValidated === true ? segActive : segInactive
              )}
            >
              <CheckCircle className="h-3 w-3" />
              Confirmed
            </button>
            <button
              onClick={() => onValidatedChange(filterValidated === false ? null : false)}
              className={cn(
                segBase,
                "rounded-r-full border-l-0",
                filterValidated === false ? segActive : segInactive
              )}
            >
              <Circle className="h-3 w-3" />
              Unconfirmed
            </button>
          </div>

          {/* My Rating */}
          <Select value={myRatingValue} onValueChange={handleMyRatingChange}>
            <SelectTrigger
              className={cn(
                "h-7 px-3 text-xs rounded-full border transition-all duration-150 bg-transparent",
                filterMyRating !== null
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
              )}
            >
              <SelectValue placeholder="My Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Rating</SelectItem>
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
            <SelectTrigger
              className={cn(
                "h-7 px-3 text-xs rounded-full border transition-all duration-150 bg-transparent",
                filterMinScore !== null
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-400"
                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
              )}
            >
              <SelectValue placeholder="TMDB Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Score</SelectItem>
              {SCORE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}+
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: genre chips */}
        {genres.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => onGenreChange(activeGenre === genre ? null : genre)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 whitespace-nowrap",
                  activeGenre === genre
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/8 text-white/40 hover:border-white/20 hover:text-white/70"
                )}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
