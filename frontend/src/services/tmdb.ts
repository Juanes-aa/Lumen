import type { TmdbSearchResponse, TmdbSearchResult, TmdbMovieDetail } from "../types/tmdb";
import { apiFetch } from "../api/client";

// El CDN de imágenes de TMDB es público (no requiere API key), así que
// seguimos construyendo URLs directas. La búsqueda y el detalle de
// película, en cambio, pasan por el backend (`/tmdb/*`) que mantiene
// la API key del lado servidor para que nunca termine en el bundle.
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getPosterUrl(
  posterPath: string | null,
  size: "w200" | "w500" | "original" = "w500"
): string | null {
  if (posterPath === null) {
    return null;
  }
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

export async function searchMovies(
  query: string,
  token: string | null,
  signal?: AbortSignal
): Promise<TmdbSearchResult[]> {
  if (query.trim() === "") {
    return [];
  }

  const data = await apiFetch<TmdbSearchResponse>(
    `/tmdb/search?q=${encodeURIComponent(query)}`,
    {},
    { token, signal }
  );
  return data.results;
}

export async function getMovieDetail(
  id: number,
  token: string | null,
  signal?: AbortSignal
): Promise<TmdbMovieDetail> {
  return apiFetch<TmdbMovieDetail>(
    `/tmdb/movie/${id.toString()}`,
    {},
    { token, signal }
  );
}

export function getDirector(movie: TmdbMovieDetail): string | null {
  const director = movie.credits.crew.find((member) => member.job === "Director");
  return director ? director.name : null;
}
