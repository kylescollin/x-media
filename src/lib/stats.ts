import type { Movie } from "@/types";

// Average episode runtime (minutes) used to estimate TV time watched,
// since we don't track per-episode runtimes.
const AVG_EPISODE_MINUTES = 45;

export interface GenreCount {
  name: string;
  count: number;
}

export interface MediaStats {
  // Counts
  totalMovies: number;
  totalShows: number;
  totalSeasons: number;
  totalEpisodes: number;
  // Time watched
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
  // Favorites & ratings
  favorites: number;
  fiveStars: number;
  averageRating: number | null;
  // Top genres
  topGenres: GenreCount[];
}

export function computeStats(movies: Movie[]): MediaStats {
  const moviesOnly = movies.filter((m) => m.mediaType === "movie");
  const showsOnly = movies.filter((m) => m.mediaType === "tv");

  const totalSeasons = showsOnly.reduce(
    (sum, show) => sum + (show.tvSeasons?.length ?? 0),
    0
  );

  const totalEpisodes = showsOnly.reduce(
    (sum, show) =>
      sum +
      (show.tvSeasons?.reduce((s, season) => s + season.watchedEpisodes, 0) ??
        0),
    0
  );

  const movieMinutes = moviesOnly.reduce((sum, m) => sum + (m.runtime ?? 0), 0);
  const tvMinutes = totalEpisodes * AVG_EPISODE_MINUTES;
  const totalMinutes = movieMinutes + tvMinutes;

  const rated = movies.filter((m) => m.userRating != null);
  const averageRating =
    rated.length > 0
      ? Math.round(
          (rated.reduce((sum, m) => sum + (m.userRating ?? 0), 0) /
            rated.length) *
            10
        ) / 10
      : null;

  // Tally genres across everything watched, ranked.
  const genreTally = new Map<string, number>();
  for (const m of movies) {
    for (const g of m.genres) {
      genreTally.set(g.name, (genreTally.get(g.name) ?? 0) + 1);
    }
  }
  const topGenres = [...genreTally.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalMovies: moviesOnly.length,
    totalShows: showsOnly.length,
    totalSeasons,
    totalEpisodes,
    totalMinutes,
    totalHours: Math.round(totalMinutes / 60),
    totalDays: Math.round((totalMinutes / 60 / 24) * 10) / 10,
    favorites: movies.filter((m) => m.isFavorite).length,
    fiveStars: movies.filter((m) => m.userRating === 5).length,
    averageRating,
    topGenres,
  };
}
