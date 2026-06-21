// Shared TV watch-progress calculation used by the TV grid, watchlist cards,
// and anywhere else that shows a season progress bar. Keep this the single
// source of truth so the library and watchlist stay in sync.

interface ProgressSeason {
  episodeCount: number | null;
  episodes: unknown[] | null;
  watchedEpisodes: number;
}

/**
 * Returns the rounded watched percentage (0–100) across all tracked seasons,
 * or `null` when there is nothing to show (no tracked seasons / no episode data).
 *
 * Seasons without episode data don't contribute to the total directly; instead
 * the tracked total is scaled up to `numberOfSeasons` so partially-tracked shows
 * still report a sensible percentage.
 */
export function tvWatchedPercent(
  seasons: ProgressSeason[] | null | undefined,
  numberOfSeasons?: number | null,
): number | null {
  const trackedCount = seasons?.length ?? 0;
  if (trackedCount === 0) return null;

  const epCount = (s: ProgressSeason) =>
    (s.episodeCount ?? 0) > 0 ? s.episodeCount! : (s.episodes?.length ?? 0);

  // Only seasons with actual episode data contribute to the total
  const seasonsWithData = seasons!.filter((s) => epCount(s) > 0);
  const dataCount = seasonsWithData.length;
  if (dataCount === 0) return null;

  const trackedTotal = seasonsWithData.reduce((sum, s) => sum + epCount(s), 0);
  const watched = seasons!.reduce((sum, s) => sum + s.watchedEpisodes, 0);

  // Scale total up if there are seasons without episode data (0-count or untracked)
  const totalSeasons = numberOfSeasons ?? trackedCount;
  const total =
    dataCount < totalSeasons
      ? Math.round((trackedTotal / dataCount) * totalSeasons)
      : trackedTotal;

  return Math.round((watched / total) * 100);
}
