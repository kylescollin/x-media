"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2 } from "lucide-react";
import { useUpdateSeasonEpisodes } from "@/hooks/useSeasons";
import { cn } from "@/lib/utils";
import type { TvSeason, TvEpisode } from "@/types";

interface VirtualSeasonData {
  episodes: TvEpisode[] | null;
  loading: boolean;
  episodeCount: number | null;
  airDate: string | null;
  overview: string | null;
}

type DisplaySeason =
  | { inLibrary: true; data: TvSeason }
  | { inLibrary: false; seasonNumber: number; virtual: VirtualSeasonData };

type Filter = "all" | "watched" | "unwatched";

interface SeasonTrackerProps {
  movieId: number;
  tmdbId: number;
  seasons: TvSeason[];
}

export default function SeasonTracker({ movieId, tmdbId, seasons }: SeasonTrackerProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [totalSeasons, setTotalSeasons] = useState<number>(0);
  const [virtualData, setVirtualData] = useState<Record<number, VirtualSeasonData>>({});
  const { mutate: updateEpisodes, isPending } = useUpdateSeasonEpisodes(movieId);

  useEffect(() => {
    fetch(`/api/tmdb/details?tmdbId=${tmdbId}&type=tv`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.number_of_seasons) setTotalSeasons(data.number_of_seasons);
      })
      .catch(() => {});
  }, [tmdbId]);

  // Build display list: 1..totalSeasons, prepend 0 if DB has specials
  const knownNums = new Set(seasons.map((s) => s.seasonNumber));
  const seasonNumbers: number[] = [];
  if (knownNums.has(0)) seasonNumbers.push(0);
  for (let i = 1; i <= totalSeasons; i++) seasonNumbers.push(i);

  const displaySeasons: DisplaySeason[] = seasonNumbers.map((n) => {
    const db = seasons.find((s) => s.seasonNumber === n);
    if (db) return { inLibrary: true, data: db };
    return {
      inLibrary: false,
      seasonNumber: n,
      virtual: virtualData[n] ?? { episodes: null, loading: false, episodeCount: null, airDate: null, overview: null },
    };
  });

  const filtered = displaySeasons.filter((s) => {
    if (filter === "all") return true;
    if (filter === "watched") return s.inLibrary && s.data.watchedEpisodes > 0;
    // unwatched
    return !s.inLibrary || s.data.watchedEpisodes === 0;
  });

  async function fetchVirtualEpisodes(seasonNumber: number) {
    setVirtualData((prev) => ({
      ...prev,
      [seasonNumber]: { ...(prev[seasonNumber] ?? { episodes: null, episodeCount: null, airDate: null, overview: null }), loading: true },
    }));
    try {
      const res = await fetch(`/api/tmdb/season?tmdbId=${tmdbId}&season=${seasonNumber}`);
      const data = await res.json();
      setVirtualData((prev) => ({
        ...prev,
        [seasonNumber]: {
          episodes: data.episodes ?? [],
          loading: false,
          episodeCount: data.episodes?.length ?? null,
          airDate: data.airDate ?? null,
          overview: data.overview ?? null,
        },
      }));
    } catch {
      setVirtualData((prev) => ({
        ...prev,
        [seasonNumber]: { ...(prev[seasonNumber] ?? { episodes: null, episodeCount: null, airDate: null, overview: null }), loading: false },
      }));
    }
  }

  function handleExpand(seasonNumber: number, isVirtual: boolean) {
    const isExpanding = expanded !== seasonNumber;
    setExpanded(isExpanding ? seasonNumber : null);
    if (isExpanding && isVirtual && !virtualData[seasonNumber]?.episodes && !virtualData[seasonNumber]?.loading) {
      fetchVirtualEpisodes(seasonNumber);
    }
  }

  function toggleEpisode(s: DisplaySeason, episode: TvEpisode) {
    if (s.inLibrary) {
      if (!s.data.episodes) return;
      const updated = s.data.episodes.map((ep) =>
        ep.number === episode.number ? { ...ep, watched: !ep.watched } : ep
      );
      updateEpisodes({ seasonNumber: s.data.seasonNumber, episodes: updated });
    } else {
      const vd = virtualData[s.seasonNumber];
      if (!vd?.episodes) return;
      const updated = vd.episodes.map((ep) =>
        ep.number === episode.number ? { ...ep, watched: !ep.watched } : ep
      );
      setVirtualData((prev) => ({ ...prev, [s.seasonNumber]: { ...vd, episodes: updated } }));
      updateEpisodes({
        seasonNumber: s.seasonNumber,
        episodes: updated,
        episodeCount: vd.episodeCount,
        airDate: vd.airDate,
        overview: vd.overview,
      });
    }
  }

  function markAllWatched(s: DisplaySeason, watched: boolean) {
    if (s.inLibrary) {
      if (!s.data.episodes) return;
      const updated = s.data.episodes.map((ep) => ({ ...ep, watched }));
      updateEpisodes({ seasonNumber: s.data.seasonNumber, episodes: updated });
    } else {
      const vd = virtualData[s.seasonNumber];
      if (!vd?.episodes) return;
      const updated = vd.episodes.map((ep) => ({ ...ep, watched }));
      setVirtualData((prev) => ({ ...prev, [s.seasonNumber]: { ...vd, episodes: updated } }));
      updateEpisodes({
        seasonNumber: s.seasonNumber,
        episodes: updated,
        episodeCount: vd.episodeCount,
        airDate: vd.airDate,
        overview: vd.overview,
      });
    }
  }

  if (seasons.length === 0 && totalSeasons === 0) {
    return <p className="text-sm text-white/35">No season data recorded.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex gap-1.5">
        {(["all", "watched", "unwatched"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-xs px-3 py-1 rounded-full border transition-colors capitalize",
              filter === f
                ? "bg-amber-400/15 border-amber-400/40 text-amber-400"
                : "border-white/10 text-white/35 hover:text-white/55 hover:border-white/20"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-white/35">
          {filter === "watched" ? "No watched seasons yet." : "No unwatched seasons — all caught up!"}
        </p>
      )}

      {filtered.map((s) => {
        const seasonNumber = s.inLibrary ? s.data.seasonNumber : s.seasonNumber;
        const isExpanded = expanded === seasonNumber;

        if (s.inLibrary) {
          const { data: season } = s;
          const total = season.episodeCount ?? season.episodes?.length ?? 0;
          const watched = season.watchedEpisodes;
          const complete = total > 0 && watched >= total;
          const progress = total > 0 ? Math.round((watched / total) * 100) : 0;

          return (
            <div key={season.id} className="rounded-lg border border-white/8 bg-white/4 overflow-hidden">
              <button
                onClick={() => handleExpand(season.seasonNumber, false)}
                className="w-full flex items-center justify-between px-3 py-3 text-sm hover:bg-white/4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {complete && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
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
                    isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-white/30" /> : <ChevronDown className="h-3.5 w-3.5 text-white/30" />
                  )}
                </div>
              </button>

              {total > 0 && (
                <div className="h-0.5 bg-white/5 mx-3">
                  <div
                    className={cn("h-full transition-all duration-300", complete ? "bg-green-400" : "bg-amber-400")}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {isExpanded && season.episodes && season.episodes.length > 0 && (
                <div className="px-3 pb-3 pt-2">
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => markAllWatched(s, true)}
                      disabled={isPending || complete}
                      className="text-[10px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
                    >
                      Mark all watched
                    </button>
                    <span className="text-white/15 text-[10px]">·</span>
                    <button
                      onClick={() => markAllWatched(s, false)}
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
                          onChange={() => toggleEpisode(s, ep)}
                          disabled={isPending}
                          className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-amber-400 cursor-pointer"
                        />
                        <span className="text-xs text-white/30 w-6 shrink-0">{ep.number}</span>
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
        }

        // Virtual (not in library) season
        const vd = s.virtual;
        const episodes = vd.episodes ?? [];
        const total = vd.episodeCount ?? episodes.length;
        const watchedCount = episodes.filter((e) => e.watched).length;

        return (
          <div key={`virtual-${s.seasonNumber}`} className="rounded-lg border border-white/6 bg-white/2 overflow-hidden">
            <button
              onClick={() => handleExpand(s.seasonNumber, true)}
              className="w-full flex items-center justify-between px-3 py-3 text-sm hover:bg-white/4 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-white/45">Season {s.seasonNumber}</span>
                <span className="text-[10px] text-white/25 border border-white/10 rounded px-1.5 py-0.5">
                  Not watched
                </span>
              </div>
              <div className="flex items-center gap-2">
                {vd.loading ? (
                  <Loader2 className="h-3.5 w-3.5 text-white/25 animate-spin" />
                ) : (
                  <>
                    <span className="text-xs text-white/30">
                      {total > 0 ? `${watchedCount} / ${total} eps` : "Loading…"}
                    </span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-white/20" /> : <ChevronDown className="h-3.5 w-3.5 text-white/20" />}
                  </>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-2">
                {vd.loading && (
                  <p className="text-xs text-white/30 py-2">Fetching episodes…</p>
                )}
                {!vd.loading && episodes.length === 0 && vd.episodes !== null && (
                  <p className="text-xs text-white/30 py-2">No episode data available.</p>
                )}
                {!vd.loading && episodes.length > 0 && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => markAllWatched(s, true)}
                        disabled={isPending || watchedCount === episodes.length}
                        className="text-[10px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
                      >
                        Mark all watched
                      </button>
                      <span className="text-white/15 text-[10px]">·</span>
                      <button
                        onClick={() => markAllWatched(s, false)}
                        disabled={isPending || watchedCount === 0}
                        className="text-[10px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-1">
                      {episodes.map((ep) => (
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
                            onChange={() => toggleEpisode(s, ep)}
                            disabled={isPending}
                            className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-amber-400 cursor-pointer"
                          />
                          <span className="text-xs text-white/30 w-6 shrink-0">{ep.number}</span>
                          <span className={cn("text-xs leading-snug", ep.watched ? "text-white/70" : "text-white/45")}>
                            {ep.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
