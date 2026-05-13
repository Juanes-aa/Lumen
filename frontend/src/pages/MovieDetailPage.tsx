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
    <div style={{ flex: 1, padding: '36px 44px', overflowY: 'auto' }}>
      <div style={{ height: 14, width: 120, background: '#252421', borderRadius: 4, marginBottom: 28 }} />
      <div style={{ display: 'flex', gap: 44 }}>
        <div
          style={{
            width: 200,
            height: 300,
            background: '#1E1D1B',
            border: '0.4px solid #2E2D2B',
            borderRadius: 8,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, maxWidth: 560 }}>
          <div style={{ height: 36, width: '70%', background: '#252421', borderRadius: 4, marginBottom: 16 }} />
          <div style={{ height: 14, width: '50%', background: '#252421', borderRadius: 4, marginBottom: 24 }} />
          <div style={{ height: 14, width: '100%', background: '#252421', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 14, width: '90%', background: '#252421', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 14, width: '80%', background: '#252421', borderRadius: 4 }} />
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
      <div style={{ flex: 1, padding: '36px 44px', overflowY: 'auto' }}>
        <p style={{ color: '#E24B4A', marginBottom: 16 }}>{error}</p>
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
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div
        className="lumen-anim-1"
        style={{
          padding: '28px 44px',
          borderBottom: '0.4px solid #2E2D2B',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            navigate(-1)
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888780',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FAF9F6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#888780'
          }}
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
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>
      </div>

      <div
        className="lumen-anim-2"
        style={{
          padding: '36px 44px 44px',
          display: 'flex',
          gap: 44,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              width: 200,
              height: 300,
              background: '#1E1D1B',
              border: '0.4px solid #2E2D2B',
              borderRadius: 8,
              backgroundImage: posterUrl !== null ? `url(${posterUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </div>

        <div style={{ flex: 1, maxWidth: 560, minWidth: 280 }}>
          {isWatched && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 12,
                background: '#04342C',
                border: '0.4px solid rgba(29, 158, 117, 0.25)',
                borderRadius: 4,
                padding: '3px 10px',
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  color: '#1D9E75',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Ya vista
              </span>
            </div>
          )}

          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 36,
              fontWeight: 500,
              color: '#FAF9F6',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              marginBottom: 10,
            }}
          >
            {movie.title}
          </h2>

          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: '#888780',
              letterSpacing: '0.06em',
              marginBottom: 20,
            }}
          >
            {[director ?? null, year, formatRuntime(movie.runtime)]
              .filter((v) => v !== null && v !== '')
              .join(' · ')}
            {movie.genres.length > 0 && (
              <>
                {' · '}
                {movie.genres.map((g) => g.name).join(', ')}
              </>
            )}
          </p>

          {movie.overview && (
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: '#888780',
                lineHeight: 1.75,
                marginBottom: 24,
              }}
            >
              {movie.overview}
            </p>
          )}

          {topCast.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p className="lumen-overline" style={{ marginBottom: 10 }}>
                Reparto principal
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {topCast.map((member) => (
                  <span key={member.id} className="lumen-tag-pill">
                    {member.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {!isWatched && (
              <button
                type="button"
                className="lumen-btn-secondary"
                onClick={() => {
                  setIsModalOpen(true)
                }}
              >
                Marcar como vista
              </button>
            )}
            {isWatched && watchedMovieId !== null && (
              <button
                type="button"
                className="lumen-btn-primary"
                onClick={() => {
                  void handleStartAnalysis()
                }}
                disabled={isStartingAnalysis}
              >
                {isStartingAnalysis ? 'Iniciando…' : 'Analizar ahora'}
              </button>
            )}
            {isWatched && watchedMovieId === null && (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: '#888780',
                }}
              >
                Sincronizando biblioteca…
              </span>
            )}
          </div>

          {watchedMessage !== null && (
            <p
              style={{
                marginTop: 12,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: '#FAC775',
              }}
            >
              {watchedMessage}
            </p>
          )}
          {analysisError !== null && (
            <p
              style={{
                marginTop: 12,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: '#E24B4A',
              }}
            >
              {analysisError}
            </p>
          )}
        </div>
      </div>

      <WatchedModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
        }}
        onConfirm={(note: string) => {
          void handleConfirmWatched(note)
        }}
        isLoading={isSaving}
      />
    </div>
  )
}
