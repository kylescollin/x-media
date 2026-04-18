export type MediaType = "movie" | "tv";

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface StreamingService {
  service: string;
  url: string;
  logo?: string;
}

export interface Movie {
  id: number;
  tmdbId: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  voteAverage: number | null;
  genres: Genre[];
  cast: CastMember[] | null;
  directors: string[] | null;
  mediaType: MediaType;
  watched: boolean;
  watchedDate: string | null;
  userRating: number | null;
  isFavorite: boolean;
  userNotes: string | null;
  validated: boolean;
  createdAt: string;
  updatedAt: string;
  tvSeasons?: TvSeason[];
}

export interface TvSeason {
  id: number;
  movieId: number;
  seasonNumber: number;
  episodeCount: number | null;
  watchedEpisodes: number;
  airDate: string | null;
  overview: string | null;
}

export interface WatchlistItem {
  id: number;
  tmdbId: number;
  title: string;
  mediaType: MediaType;
  posterPath: string | null;
  overview: string | null;
  releaseDate: string | null;
  runtime: number | null;
  genres: Genre[] | null;
  streamingInfo: StreamingService[] | null;
  priority: number;
  addedAt: string;
  updatedAt: string;
}

export interface TmdbSearchResult {
  id: number;
  title?: string;        // movies
  name?: string;         // tv
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string; // movies
  first_air_date?: string; // tv
  vote_average: number;
  genre_ids: number[];
  media_type?: string;
}

export interface ParsedTitle {
  raw: string;
  title: string;
  isFavorite: boolean;
}

export interface ImportResult {
  title: string;
  status: "matched" | "unmatched" | "skipped" | "error";
  tmdbId?: number;
  tmdbTitle?: string;
  error?: string;
}
