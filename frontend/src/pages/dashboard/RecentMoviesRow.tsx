import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Poster from '../../components/ui/Poster'
import { useSessionsQuery, useWatchedMoviesQuery } from '../../api/queries'
import type { WatchedMovie } from '../../types/library'
import type { SessionSummary } from '../../types/analysis'
import EmptyDashboard from './EmptyDashboard'

interface RecentMovieCardProps {
  movie: WatchedMovie
  hasAnalysis: boolean
  closedSessionId: string | undefined
  onNavigate: (path: string) => void
}

function RecentMovieCard({ movie, hasAnalysis, closedSessionId, onNavigate }: RecentMovieCardProps): React.ReactElement {
  return (
    <div
      className="group bg-pantalla border-[0.4px] border-borde rounded-[10px] p-[14px] cursor-pointer text-left flex flex-col gap-[10px] transition-colors hover:border-borde-soft hover:bg-[#2A2927] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
      onClick={() => { onNavigate(`/movie/${movie.tmdb_id.toString()}`) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onNavigate(`/movie/${movie.tmdb_id.toString()}`)
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative">
        <Poster url={movie.poster_url} alt={movie.title} fluid rounded="md" />
        {hasAnalysis ? (
          <span className="absolute top-[7px] right-[7px] bg-teal-dark border-[0.4px] border-[rgba(29,158,117,0.31)] rounded-[4px] text-teal font-mono text-[9px] px-[6px] py-[2px] tracking-[0.08em] uppercase">
            Analizada
          </span>
        ) : null}
      </div>

      <div>
        <p className="font-serif text-[14px] font-medium text-celuloide leading-tight mb-[3px]">
          {movie.title}
        </p>
        <p className="font-mono text-[10px] text-gray-mid tracking-[0.04em]">
          {movie.release_year ?? '—'}
        </p>
      </div>

      {/* Hover actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex gap-[6px] mt-[2px]">
        {hasAnalysis ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onNavigate(closedSessionId !== undefined ? `/history/${closedSessionId}` : '/history')
              }}
              className="flex-1 bg-transparent border-[0.4px] border-borde rounded-[4px] text-gray-mid font-sans text-[10.5px] py-[5px] px-[10px] cursor-pointer hover:text-celuloide hover:border-borde-soft transition-colors"
            >
              Ver análisis
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onNavigate(`/movie/${movie.tmdb_id.toString()}`)
              }}
              className="flex-1 bg-amber border-none rounded-[4px] text-amber-dark font-sans text-[10.5px] font-medium py-[5px] px-[10px] cursor-pointer"
            >
              Nueva sesión
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(`/movie/${movie.tmdb_id.toString()}`)
            }}
            className="w-full bg-amber border-none rounded-[4px] text-amber-dark font-sans text-[10.5px] font-medium py-[5px] px-[10px] cursor-pointer"
          >
            Analizar ahora
          </button>
        )}
      </div>
    </div>
  )
}

function RecentSkeletonGrid(): React.ReactElement {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="aspect-[2/3] rounded-[10px] bg-pantalla-soft animate-pulse"
        />
      ))}
    </div>
  )
}

export default function RecentMoviesRow(): React.ReactElement {
  const navigate = useNavigate()
  const moviesQuery = useWatchedMoviesQuery()
  const sessionsQuery = useSessionsQuery()

  const movies: WatchedMovie[] = moviesQuery.data ?? []
  const recentMovies: WatchedMovie[] = useMemo(() => movies.slice(0, 6), [movies])

  const analyzedTmdbIds: Set<number> = useMemo(() => {
    const set: Set<number> = new Set()
    ;(sessionsQuery.data ?? []).forEach((s) => {
      const m = movies.find((mm) => mm.id === s.movie_id)
      if (m) set.add(m.tmdb_id)
    })
    return set
  }, [sessionsQuery.data, movies])

  // Map movie.id → most recent closed session ID for "Ver análisis" navigation
  const closedSessionByMovieId: Map<string, string> = useMemo(() => {
    const map = new Map<string, string>()
    ;(sessionsQuery.data ?? [])
      .filter((s: SessionSummary) => s.status === 'closed')
      .forEach((s: SessionSummary) => {
        if (!map.has(s.movie_id)) map.set(s.movie_id, s.id)
      })
    return map
  }, [sessionsQuery.data])

  const isLoading: boolean = moviesQuery.isPending
  const hasError: boolean = moviesQuery.isError

  return (
    <div className="lumen-anim-3">
      <div className="flex justify-between items-baseline mb-4">
        <p className="lumen-overline tracking-[0.16em]">Recientes</p>
        <button
          type="button"
          className="lumen-btn-ghost text-[11px]"
          onClick={() => { navigate('/library') }}
        >
          Ver todas →
        </button>
      </div>
      {isLoading ? (
        <RecentSkeletonGrid />
      ) : recentMovies.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {recentMovies.map((m) => (
            <RecentMovieCard
              key={m.id}
              movie={m}
              hasAnalysis={analyzedTmdbIds.has(m.tmdb_id)}
              closedSessionId={closedSessionByMovieId.get(m.id)}
              onNavigate={(path) => { navigate(path) }}
            />
          ))}
        </div>
      )}
      {hasError ? (
        <p className="mt-4 text-xs text-warn">Error al cargar el dashboard.</p>
      ) : null}
    </div>
  )
}
