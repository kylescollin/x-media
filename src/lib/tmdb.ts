const BASE_URL = "https://api.themoviedb.org/3";

function getApiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return key;
}

export function tmdbImage(path: string | null, size: "w154" | "w342" | "w500" | "original" = "w342"): string {
  if (!path) return "/placeholder-poster.png";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function searchTmdb(query: string, type: "movie" | "tv" = "movie") {
  const key = getApiKey();
  const url = `${BASE_URL}/search/${type}?api_key=${key}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  return res.json();
}

export async function getTmdbDetails(tmdbId: number, type: "movie" | "tv" = "movie") {
  const key = getApiKey();
  const url = `${BASE_URL}/${type}/${tmdbId}?api_key=${key}&append_to_response=credits&language=en-US`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`);
  return res.json();
}

export async function getTmdbWatchProviders(tmdbId: number, type: "movie" | "tv" = "movie") {
  const key = getApiKey();
  const url = `${BASE_URL}/${type}/${tmdbId}/watch/providers?api_key=${key}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

export function extractMovieData(details: Record<string, unknown>, type: "movie" | "tv") {
  const credits = details.credits as Record<string, unknown[]> | undefined;
  const cast = (credits?.cast ?? [])
    .slice(0, 10)
    .map((m: unknown) => {
      const member = m as Record<string, unknown>;
      return {
        id: member.id,
        name: member.name,
        character: member.character,
        profilePath: member.profile_path ?? null,
      };
    });

  const directors = (credits?.crew ?? [])
    .filter((c: unknown) => (c as Record<string, unknown>).job === "Director")
    .map((c: unknown) => (c as Record<string, unknown>).name as string);

  const genres = ((details.genres ?? []) as Array<{ id: number; name: string }>).map((g) => ({
    id: g.id,
    name: g.name,
  }));

  return {
    tmdbId: details.id as number,
    title: (type === "movie" ? details.title : details.name) as string,
    overview: (details.overview as string) || null,
    posterPath: (details.poster_path as string) || null,
    backdropPath: (details.backdrop_path as string) || null,
    releaseDate: (type === "movie" ? details.release_date : details.first_air_date) as string | null,
    runtime: (type === "movie" ? details.runtime : null) as number | null,
    voteAverage: (details.vote_average as number) || null,
    genres: JSON.stringify(genres),
    cast: JSON.stringify(cast),
    directors: JSON.stringify(directors),
    mediaType: type,
  };
}
