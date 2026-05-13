import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Poster from '../../components/ui/Poster'
import { useSessionsQuery, useWatchedMoviesQuery } from '../../api/queries'
import type { WatchedMovie } from '../../types/library'
import EmptyDashboard from './EmptyDashboard'

interface RecentMovieCardProps {
  movie: WatchedMovie
  hasAnalysis: boolean
  onClick: () => void
}

function RecentMovieCard({ movie, hasAnalysis, onClick }: RecentMovieCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-pantalla border-[0.4px] border-borde rounded-[10px] p-[14px] cursor-pointer text-left flex flex-col gap-[10px] transition-colors hover:border-borde-soft hover:bg-[#2A2927] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
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
    </button>
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

  const isLoading: boolean = moviesQuery.isPending
  const hasError: boolean = moviesQuery.isError

  return (
    <div className="lumen-anim-3">
      <div className="flex justify-between items-baseline mb-4">
        <p className="lumen-overline tracking-[0.16em]">Recientes</p>
        <button
          type="button"
          className="lumen-btn-ghost text-[11px]"
          onClick={() => {
            navigate('/library')
          }}
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
              onClick={() => {
                navigate(`/movie/${m.tmdb_id.toString()}`)
              }}
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
