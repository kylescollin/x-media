import type { TvEpisode } from "@/types";

/**
 * Flip an episode's watched state, stamping/clearing its watchedDate.
 * No-op (preserves existing date) when the state is unchanged.
 */
export function setEpisodeWatched(ep: TvEpisode, watched: boolean): TvEpisode {
  if (watched === ep.watched) return ep;
  return { ...ep, watched, watchedDate: watched ? new Date().toISOString() : null };
}
