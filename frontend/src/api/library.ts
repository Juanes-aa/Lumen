import type { WatchedMovie, WatchedMoviePayload } from "../types/library";
import { ApiError, apiFetch } from "./client";

export async function addWatchedMovie(
  token: string,
  payload: WatchedMoviePayload
): Promise<WatchedMovie> {
  try {
    return await apiFetch<WatchedMovie>(
      "/movies/watched",
      { method: "POST", body: payload },
      { token },
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      throw new Error("ALREADY_WATCHED");
    }
    throw err;
  }
}

export async function getWatchedMovies(token: string): Promise<WatchedMovie[]> {
  return apiFetch<WatchedMovie[]>("/movies/watched", { method: "GET" }, { token });
}

export async function deleteWatchedMovie(token: string, id: string): Promise<void> {
  await apiFetch<void>(`/movies/watched/${id}`, { method: "DELETE" }, { token });
}
