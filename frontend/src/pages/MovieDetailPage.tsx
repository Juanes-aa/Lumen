import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { TmdbMovieDetail } from '../types/tmdb'
import { getDirector, getMovieDetail, getPosterUrl } from '../services/tmdb'
import { useAuthStore } from '../stores/authStore'
import { useLibraryStore } from '../stores/libraryStore'
import { queryClient } from '../api/queryClient'
import { queryKeys } from '../api/queries'
import { createSession } from '../api/analysis'
import type { WatchedMoviePayload } from '../types/library'
import WatchedModal from '../components/WatchedModal'

function formatRuntime(minutes: number | null): string {
  if (minutes === null || minutes === 0) return '—'
  const h: number = Math.floor(minutes / 60)
  const m: number = minutes % 60
  return `${h.toString()}h ${m.toString()}min`
}

function DetailSkeleton() {
  return (
    <div className="flex-1 px-11 py-9 overflow-y-auto">
      <div className="h-[14px] w-[120px] bg-pantalla rounded-[4px] mb-7" />
      <div className="flex gap-11">
        <div className="w-[200px] h-[300px] bg-pantalla-soft border-[0.4px] border-borde rounded-[8px] shrink-0 animate-pulse" />
        <div className="flex-1 max-w-[560px]">
          <div className="h-9 w-[70%] bg-pantalla rounded-[4px] mb-4 animate-pulse" />
          <div className="h-[14px] w-[50%] bg-pantalla rounded-[4px] mb-6 animate-pulse" />
          <div className="h-[14px] w-full bg-pantalla rounded-[4px] mb-2 animate-pulse" />
          <div className="h-[14px] w-[90%] bg-pantalla rounded-[4px] mb-2 animate-pulse" />
          <div className="h-[14px] w-[80%] bg-pantalla rounded-[4px] animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const numericId: number = Number(id)
  const isValidId: boolean = id !== undefined && !Number.isNaN(numericId) && numericId > 0

  const [movie, setMovie] = useState<TmdbMovieDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const token = useAuthStore((s) => s.access_token)
  const libraryMovies = useLibraryStore((s) => s.movies)
  const addMovie = useLibraryStore((s) => s.addMovie)
  const fetchMovies = useLibraryStore((s) => s.fetchMovies)

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [watchedMessage, setWatchedMessage] = useState<string | null>(null)
  const [markedAsWatched, setMarkedAsWatched] = useState<boolean>(false)
  const [isStartingAnalysis, setIsStartingAnalysis] = useState<boolean>(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const watchedRecord = libraryMovies.find((m) => m.tmdb_id === numericId) ?? null
  const isWatched: boolean = markedAsWatched || watchedRecord !== null
  const watchedMovieId: string | null = watchedRecord !== null ? watchedRecord.id : null

  useEffect(() => {
    if (token !== null && libraryMovies.length === 0) {
      void fetchMovies(token)
    }
  }, [token, libraryMovies.length, fetchMovies])

  useEffect(() => {
    if (!isValidId) return
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)
    getMovieDetail(numericId, token, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setMovie(data)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!controller.signal.aborted) {
          const message: string =
            err instanceof Error ? err.message : 'Error desconocido al cargar la película'
          setError(message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => {
      controller.abort()
    }
  }, [numericId, isValidId, token])

  const handleConfirmWatched = useCallback(
    async (note: string): Promise<void> => {
      if (movie === null || token === null) return
      setIsSaving(true)
      setWatchedMessage(null)
      const posterUrl: string | null = getPosterUrl(movie.poster_path, 'w500')
      const releaseYear: number | null = movie.release_date
        ? Number(movie.release_date.slice(0, 4))
        : null
      const payload: WatchedMoviePayload = {
        tmdb_id: movie.id,
        title: movie.title,
        poster_url: posterUrl,
        release_year: releaseYear,
        genre_ids: movie.genres.map((g) => g.id),
        ...(note !== '' ? { initial_note: note } : {}),
      }
      try {
        const result: string | undefined = await addMovie(token, payload)
        if (result === 'ALREADY_WATCHED') {
          setWatchedMessage('Ya tienes esta película en tu lista')
        } else {
          setMarkedAsWatched(true)
          setIsModalOpen(false)
          // Bridge: keep TanStack Query cache (LibraryPage) in sync with the
          // legacy zustand store while MovieDetailPage hasn't been migrated yet.
          void queryClient.invalidateQueries({ queryKey: queryKeys.watched })
        }
      } catch {
        setWatchedMessage('Error al marcar la película como vista')
      } finally {
        setIsSaving(false)
      }
    },
    [movie, token, addMovie]
  )

  const handleStartAnalysis = useCallback(async (): Promise<void> => {
    if (token === null || watchedMovieId === null) return
    setIsStartingAnalysis(true)
    setAnalysisError(null)
    try {
      const session = await createSession(watchedMovieId, token)
      navigate(`/analysis/${session.id}`)
    } catch {
      setAnalysisError('No se pudo iniciar el análisis. Intenta de nuevo.')
      setIsStartingAnalysis(false)
    }
  }, [token, watchedMovieId, navigate])

  if (!isValidId) return <Navigate to="/search" replace />

  if (isLoading) return <DetailSkeleton />

  if (error !== null) {
    return (
      <div className="flex-1 px-11 py-9 overflow-y-auto">
        <p role="alert" className="text-warn mb-4">{error}</p>
        <button
          type="button"
          className="lumen-btn-secondary sm"
          onClick={() => {
            navigate('/search')
          }}
        >
          ← Volver a resultados
        </button>
      </div>
    )
  }

  if (movie === null) return null

  const posterUrl: string | null = getPosterUrl(movie.poster_path, 'w500')
  const year: string = movie.release_date ? movie.release_date.slice(0, 4) : '—'
  const director: string | null = getDirector(movie)
  const topCast = movie.credits.cast.slice(0, 5)

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Back bar */}
      <div className="lumen-anim-1 px-11 py-[18px] border-b-[0.4px] border-borde shrink-0">
        <button
          type="button"
          onClick={() => { navigate(-1) }}
          className="inline-flex items-center gap-[6px] bg-transparent border-none text-gray-mid font-sans text-[12px] cursor-pointer p-0 transition-colors hover:text-celuloide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>
      </div>

      {/* Content */}
      <div className="lumen-anim-2 px-11 py-9 flex gap-11 flex-wrap">
        {/* Poster */}
        <div className="shrink-0">
          <div
            className="w-[200px] h-[300px] bg-pantalla-soft border-[0.4px] border-borde rounded-[8px] bg-cover bg-center"
            style={posterUrl !== null ? { backgroundImage: `url(${posterUrl})` } : undefined}
          />
        </div>

        {/* Info */}
        <div className="flex-1 max-w-[560px] min-w-[280px]">
          {isWatched ? (
            <div className="inline-flex items-center gap-[6px] mb-3 bg-teal-dark border-[0.4px] border-[rgba(29,158,117,0.25)] rounded-[4px] px-[10px] py-[3px]">
              <span className="font-mono text-[10px] text-teal tracking-[0.08em] uppercase">
                Ya vista
              </span>
            </div>
          ) : null}

          <h2 className="font-serif text-[36px] font-medium text-celuloide tracking-[-0.02em] leading-[1.05] mb-[10px]">
            {movie.title}
          </h2>

          <p className="font-mono text-[11px] text-gray-mid tracking-[0.06em] mb-5">
            {[director ?? null, year, formatRuntime(movie.runtime)]
              .filter((v) => v !== null && v !== '')
              .join(' · ')}
            {movie.genres.length > 0 ? (
              <>
                {' · '}
                {movie.genres.map((g) => g.name).join(', ')}
              </>
            ) : null}
          </p>

          {movie.overview ? (
            <p className="font-sans text-[14px] text-gray-mid leading-[1.75] mb-6">
              {movie.overview}
            </p>
          ) : null}

          {topCast.length > 0 ? (
            <div className="mb-6">
              <p className="lumen-overline mb-[10px]">Reparto principal</p>
              <div className="flex flex-wrap gap-[6px]">
                {topCast.map((member) => (
                  <span key={member.id} className="lumen-tag-pill">
                    {member.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-[10px] flex-wrap items-center">
            {!isWatched ? (
              <button
                type="button"
                className="lumen-btn-secondary"
                onClick={() => { setIsModalOpen(true) }}
              >
                Marcar como vista
              </button>
            ) : null}
            {isWatched && watchedMovieId !== null ? (
              <button
                type="button"
                className="lumen-btn-primary"
                onClick={() => { void handleStartAnalysis() }}
                disabled={isStartingAnalysis}
              >
                {isStartingAnalysis ? 'Iniciando…' : 'Analizar ahora'}
              </button>
            ) : null}
            {isWatched && watchedMovieId === null ? (
              <span className="font-mono text-[11px] text-gray-mid">
                Sincronizando biblioteca…
              </span>
            ) : null}
          </div>

          {watchedMessage !== null ? (
            <p className="mt-3 font-sans text-[12px] text-amber">{watchedMessage}</p>
          ) : null}
          {analysisError !== null ? (
            <p className="mt-3 font-sans text-[12px] text-warn">{analysisError}</p>
          ) : null}
        </div>
      </div>

      <WatchedModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false) }}
        onConfirm={(note: string) => { void handleConfirmWatched(note) }}
        isLoading={isSaving}
      />
    </div>
  )
}
