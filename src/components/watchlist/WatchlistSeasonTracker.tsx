"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2 } from "lucide-react";
import { useUpdateWatchlistSeasons } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";
import type { WatchlistTvSeason, TvEpisode } from "@/types";

interface SeasonMeta {
  episodeCount: number | null;
  airDate: string | null;
  overview: string | null;
  fetchedEpisodes: TvEpisode[] | null;
  loading: boolean;
}

interface WatchlistSeasonTrackerProps {
  watchlistItemId: number;
  tmdbId: number;
  seasons: WatchlistTvSeason[] | null;
}

export default function WatchlistSeasonTracker({
  watchlistItemId,
  tmdbId,
  seasons,
}: WatchlistSeasonTrackerProps) {
  const [localSeasons, setLocalSeasons] = useState<WatchlistTvSeason[]>(seasons ?? []);
  const [totalSeasons, setTotalSeasons] = useState(0);
  const [seasonMeta, setSeasonMeta] = useState<Record<number, SeasonMeta>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const { mutate: updateSeasons, isPending } = useUpdateWatchlistSeasons();

  // Fetch season count + metadata from TMDB
  useEffect(() => {
    fetch(`/api/tmdb/details?tmdbId=${tmdbId}&type=tv`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.number_of_seasons) setTotalSeasons(data.number_of_seasons);
        if (Array.isArray(data?.seasons)) {
          const meta: Record<number, SeasonMeta> = {};
          for (const s of data.seasons) {
            const num = s.season_number as number;
            meta[num] = {
              episodeCount: (s.episode_count as number) ?? null,
              airDate: (s.air_date as string) ?? null,
              overview: (s.overview as string) ?? null,
              fetchedEpisodes: null,
              loading: false,
            };
          }
          setSeasonMeta((prev) => {
            const merged = { ...meta };
            for (const key of Object.keys(prev)) {
              const n = Number(key);
              if (prev[n]?.fetchedEpisodes !== null) merged[n] = prev[n];
            }
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [tmdbId]);

  async function fetchSeasonEpisodes(seasonNumber: number) {
    setSeasonMeta((prev) => ({
      ...prev,
      [seasonNumber]: { ...(prev[seasonNumber] ?? { episodeCount: null, airDate: null, overview: null, fetchedEpisodes: null }), loading: true },
    }));
    try {
      const res = await fetch(`/api/tmdb/season?tmdbId=${tmdbId}&season=${seasonNumber}`);
      const data = await res.json();
      setSeasonMeta((prev) => ({
        ...prev,
        [seasonNumber]: {
          ...prev[seasonNumber],
          fetchedEpisodes: data.episodes ?? [],
          loading: false,
          episodeCount: data.episodes?.length ?? prev[seasonNumber]?.episodeCount ?? null,
          airDate: data.airDate ?? prev[seasonNumber]?.airDate ?? null,
          overview: data.overview ?? prev[seasonNumber]?.overview ?? null,
        },
      }));
    } catch {
      setSeasonMeta((prev) => ({
        ...prev,
        [seasonNumber]: { ...(prev[seasonNumber] ?? { episodeCount: null, airDate: null, overview: null, fetchedEpisodes: null }), loading: false },
      }));
    }
  }

  function handleExpand(seasonNumber: number) {
    const isExpanding = expanded !== seasonNumber;
    setExpanded(isExpanding ? seasonNumber : null);
    const stored = localSeasons.find((s) => s.seasonNumber === seasonNumber);
    const meta = seasonMeta[seasonNumber];
    if (isExpanding && !stored?.episodes?.length && !meta?.fetchedEpisodes && !meta?.loading) {
      fetchSeasonEpisodes(seasonNumber);
    }
  }

  function getEpisodes(seasonNumber: number): TvEpisode[] | null {
    const stored = localSeasons.find((s) => s.seasonNumber === seasonNumber);
    if (stored?.episodes?.length) return stored.episodes;
    return seasonMeta[seasonNumber]?.fetchedEpisodes ?? null;
  }

  function saveUpdate(updated: WatchlistTvSeason[]) {
    setLocalSeasons(updated);
    updateSeasons({ id: watchlistItemId, seasons: updated });
  }

  function toggleEpisode(seasonNumber: number, episode: TvEpisode) {
    const episodes = getEpisodes(seasonNumber);
    if (!episodes) return;
    const updatedEps = episodes.map((ep) =>
      ep.number === episode.number ? { ...ep, watched: !ep.watched } : ep
    );
    const watchedCount = updatedEps.filter((ep) => ep.watched).length;
    const meta = seasonMeta[seasonNumber];
    const existing = localSeasons.find((s) => s.seasonNumber === seasonNumber);
    const updatedSeasons = existing
      ? localSeasons.map((s) =>
          s.seasonNumber === seasonNumber
            ? { ...s, episodes: updatedEps, watchedEpisodes: watchedCount }
            : s
        )
      : [
          ...localSeasons,
          {
            seasonNumber,
            episodeCount: meta?.episodeCount ?? updatedEps.length,
            watchedEpisodes: watchedCount,
            airDate: meta?.airDate ?? null,
            overview: meta?.overview ?? null,
            episodes: updatedEps,
          },
        ];
    saveUpdate(updatedSeasons);
  }

  function markAllWatched(seasonNumber: number, watched: boolean) {
    const episodes = getEpisodes(seasonNumber);
    if (!episodes) return;
    const updatedEps = episodes.map((ep) => ({ ...ep, watched }));
    const watchedCount = watched ? updatedEps.length : 0;
    const meta = seasonMeta[seasonNumber];
    const existing = localSeasons.find((s) => s.seasonNumber === seasonNumber);
    const updatedSeasons = existing
      ? localSeasons.map((s) =>
          s.seasonNumber === seasonNumber
            ? { ...s, episodes: updatedEps, watchedEpisodes: watchedCount }
            : s
        )
      : [
          ...localSeasons,
          {
            seasonNumber,
            episodeCount: meta?.episodeCount ?? updatedEps.length,
            watchedEpisodes: watchedCount,
            airDate: meta?.airDate ?? null,
            overview: meta?.overview ?? null,
            episodes: updatedEps,
          },
        ];
    saveUpdate(updatedSeasons);
  }

  const seasonNumbers: number[] = [];
  const hasSpecials = localSeasons.some((s) => s.seasonNumber === 0);
  if (hasSpecials) seasonNumbers.push(0);
  for (let i = 1; i <= totalSeasons; i++) seasonNumbers.push(i);

  if (seasonNumbers.length === 0) {
    return <p className="text-sm text-white/35">Loading season data…</p>;
  }

  return (
    <div className="space-y-3">
      {seasonNumbers.map((num) => {
        const stored = localSeasons.find((s) => s.seasonNumber === num);
        const meta = seasonMeta[num];
        const isExpanded = expanded === num;
        const episodes = getEpisodes(num);
        const episodeCount = stored?.episodeCount ?? meta?.episodeCount ?? episodes?.length ?? 0;
        const watchedCount = stored?.watchedEpisodes ?? 0;
        const complete = episodeCount > 0 && watchedCount >= episodeCount;
        const progress = episodeCount > 0 ? Math.round((watchedCount / episodeCount) * 100) : 0;
        const isLoading = meta?.loading ?? false;

        return (
          <div key={num} className="rounded-lg border border-white/8 bg-white/4 overflow-hidden">
            <button
              onClick={() => handleExpand(num)}
              className="w-full flex items-center justify-between px-3 py-3 text-sm hover:bg-white/4 transition-colors"
            >
              <div className="flex items-center gap-2">
                {complete && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                <span className={cn("font-medium", complete ? "text-white/80" : "text-white/65")}>
                  {num === 0 ? "Specials" : `Season ${num}`}
                </span>
                {complete && (
                  <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 rounded px-1.5 py-0.5">
                    Complete
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 text-white/25 animate-spin" />
                ) : (
                  <>
                    <span className="text-xs text-white/40">
                      {episodeCount > 0 ? `${watchedCount} / ${episodeCount} eps` : "No data"}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="h-3.5 w-3.5 text-white/30" />
                      : <ChevronDown className="h-3.5 w-3.5 text-white/30" />}
                  </>
                )}
              </div>
            </button>

            {episodeCount > 0 && (
              <div className="h-0.5 bg-white/5 mx-3">
                <div
                  className={cn("h-full transition-all duration-300", complete ? "bg-green-400" : "bg-amber-400")}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {isExpanded && (
              <div className="px-3 pb-3 pt-2">
                {isLoading && <p className="text-xs text-white/30 py-2">Fetching episodes…</p>}
                {!isLoading && episodes === null && (
                  <p className="text-xs text-white/30 py-2">No episode data available.</p>
                )}
                {!isLoading && episodes !== null && episodes.length === 0 && (
                  <p className="text-xs text-white/30 py-2">No episodes found.</p>
                )}
                {!isLoading && episodes && episodes.length > 0 && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => markAllWatched(num, true)}
                        disabled={isPending || complete}
                        className="text-[10px] text-white/40 hover:text-white/70 disabled:opacity-30 transition-colors"
                      >
                        Mark all watched
                      </button>
                      <span className="text-white/15 text-[10px]">·</span>
                      <button
                        onClick={() => markAllWatched(num, false)}
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
                            onChange={() => toggleEpisode(num, ep)}
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
