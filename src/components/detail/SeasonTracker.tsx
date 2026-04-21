"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { useUpdateSeasonEpisodes } from "@/hooks/useSeasons";
import { cn } from "@/lib/utils";
import type { TvSeason, TvEpisode } from "@/types";

interface SeasonTrackerProps {
  movieId: number;
  seasons: TvSeason[];
}

export default function SeasonTracker({ movieId, seasons }: SeasonTrackerProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { mutate: updateEpisodes, isPending } = useUpdateSeasonEpisodes(movieId);

  if (seasons.length === 0) {
    return <p className="text-sm text-white/35">No season data recorded.</p>;
  }

  function toggleEpisode(season: TvSeason, episode: TvEpisode) {
    if (!season.episodes) return;
    const updated = season.episodes.map((ep) =>
      ep.number === episode.number ? { ...ep, watched: !ep.watched } : ep
    );
    updateEpisodes({ seasonNumber: season.seasonNumber, episodes: updated });
  }

  function markAllWatched(season: TvSeason, watched: boolean) {
    if (!season.episodes) return;
    const updated = season.episodes.map((ep) => ({ ...ep, watched }));
    updateEpisodes({ seasonNumber: season.seasonNumber, episodes: updated });
  }

  return (
    <div className="space-y-3">
      {seasons.map((season) => {
        const isExpanded = expanded === season.seasonNumber;
        const total = season.episodeCount ?? season.episodes?.length ?? 0;
        const watched = season.watchedEpisodes;
        const complete = total > 0 && watched >= total;
        const progress = total > 0 ? Math.round((watched / total) * 100) : 0;

        return (
          <div
            key={season.id}
            className="rounded-lg border border-white/8 bg-white/4 overflow-hidden"
          >
            {/* Season header — clickable to expand */}
            <button
              onClick={() => setExpanded(isExpanded ? null : season.seasonNumber)}
              className="w-full flex items-center justify-between px-3 py-3 text-sm hover:bg-white/4 transition-colors"
            >
              <div className="flex items-center gap-2">
                {complete && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                )}
                <span className="font-medium text-white/80">Season {season.seasonNumber}</span>
                {complete && (
                  <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 rounded px-1.5 py-0.5">
                    Complete
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">
                  {total > 0 ? `${watched} / ${total} eps` : "No episode data"}
                </span>
                {season.episodes && season.episodes.length > 0 && (
                  isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-white/30" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-white/30" />
                  )
                )}
              </div>
            </button>

            {/* Progress bar */}
            {total > 0 && (
              <div className="h-0.5 bg-white/5 mx-3">
                <div
                  className={cn("h-full transition-all duration-300", complete ? "bg-green-400" : "bg-amber-400")}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Episode list */}
            {isExpanded && season.episodes && season.episodes.length > 0 && (
              <div className="px-3 pb-3 pt-2">
                {/* Mark all / none buttons */}
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => markAllWatched(season, true)}
                    disabled={isPending || complete}
                    className="text-[10px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
                  >
                    Mark all watched
                  </button>
                  <span className="text-white/15 text-[10px]">·</span>
                  <button
                    onClick={() => markAllWatched(season, false)}
                    disabled={isPending || watched === 0}
                    className="text-[10px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-1">
                  {season.episodes.map((ep) => (
                    <label
                      key={ep.number}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-2 rounded-md cursor-pointer transition-colors",
                        ep.watched ? "bg-white/5" : "hover:bg-white/3"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={ep.watched}
                        onChange={() => toggleEpisode(season, ep)}
                        disabled={isPending}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-amber-400 cursor-pointer"
                      />
                      <span className="text-xs text-white/30 w-6 shrink-0">
                        {ep.number}
                      </span>
                      <span className={cn("text-xs leading-snug", ep.watched ? "text-white/70" : "text-white/45")}>
                        {ep.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
