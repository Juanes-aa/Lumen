import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useDeleteWatchedMutation,
  useSessionsQuery,
  useWatchedMoviesQuery,
} from '../api/queries'
import Button from '../components/ui/Button'
import Poster from '../components/ui/Poster'
import { useIsMobile } from '../hooks/useIsMobile'
import type { WatchedMovie } from '../types/library'

const TMDB_GENRES: Record<number, string> = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Histórico',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'Bélica',
  37: 'Western',
}

type AnalysisFilter = 'Todos' | 'Con análisis' | 'Sin análisis'

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
}

function FilterChip({ label, active, onClick }: FilterChipProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[4px] font-sans cursor-pointer transition-colors select-none border-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
        active
          ? 'bg-[rgba(250,199,117,0.08)] border-amber text-celuloide'
          : 'bg-transparent border-borde text-gray-mid hover:border-borde-soft'
      }`}
      style={{ fontSize: 11.5, padding: '5px 11px' }}
    >
      {label}
    </button>
  )
}

interface MovieCardProps {
  movie: WatchedMovie
  hasAnalysis: boolean
  onDelete: () => void
}

function MovieCard({ movie, hasAnalysis }: MovieCardProps): React.ReactElement {
  return (
    <div
      className="group bg-pantalla border-[0.4px] border-borde rounded-[8px] overflow-hidden cursor-pointer transition-colors hover:border-borde-soft"
      style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ position: 'relative' }}>
        <Link to={`/movie/${movie.tmdb_id.toString()}`} className="block">
          <Poster url={movie.poster_url} alt={movie.title} fluid rounded="none" />
        </Link>
        {hasAnalysis ? (
          <span
            className="bg-teal-dark border-[0.4px] border-[rgba(29,158,117,0.31)] rounded-[4px] text-teal font-mono tracking-[0.07em] uppercase"
            style={{ position: 'absolute', top: 7, right: 7, fontSize: 9, padding: '2px 6px', zIndex: 10 }}
          >
            Analizada
          </span>
        ) : null}
        {/* Hover overlay */}
        <div
          className="absolute inset-0 bg-[rgba(15,14,13,0.82)] opacity-0 transition-opacity group-hover:opacity-100"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 12px 14px', gap: 7, borderRadius: '6px 6px 0 0' }}
        >
          {hasAnalysis ? (
            <Link
              to={`/movie/${movie.tmdb_id.toString()}`}
              className="font-sans text-celuloide font-medium text-center transition-opacity hover:opacity-85"
              style={{ width: '100%', borderRadius: 5, background: 'transparent', border: '0.4px solid #3A3937', fontSize: 11, padding: '7px 0', display: 'block' }}
            >
              Ver análisis
            </Link>
          ) : null}
          <Link
            to={`/movie/${movie.tmdb_id.toString()}`}
            className="font-sans text-amber-dark font-medium text-center transition-opacity hover:opacity-85"
            style={{ width: '100%', borderRadius: 5, background: '#FAC775', fontSize: 11, padding: '7px 0', display: 'block' }}
          >
            {hasAnalysis ? 'Nueva sesión' : 'Analizar ahora'}
          </Link>
        </div>
      </div>
      <div style={{ padding: '10px 11px 12px' }}>
        <p
          className="font-serif text-celuloide"
          style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.2, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {movie.title}
        </p>
        <p className="font-mono text-gray-mid" style={{ fontSize: 9.5, letterSpacing: '0.04em' }}>
          {movie.release_year ?? '—'}
        </p>
      </div>
    </div>
  )
}

export default function LibraryPage(): React.ReactElement {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const moviesQuery = useWatchedMoviesQuery()
  const sessionsQuery = useSessionsQuery()
  const deleteWatched = useDeleteWatchedMutation()

  const movies: WatchedMovie[] = moviesQuery.data ?? []
  const isLoading: boolean = moviesQuery.isPending
  const error: string | null = moviesQuery.isError
    ? moviesQuery.error instanceof Error
      ? moviesQuery.error.message
      : 'Error al cargar la biblioteca.'
    : null

  const analyzedMovieIds: Set<string> = useMemo(() => {
    const ids: Set<string> = new Set()
    ;(sessionsQuery.data ?? []).forEach((s) => {
      ids.add(s.movie_id)
    })
    return ids
  }, [sessionsQuery.data])

  const [activeGenre, setActiveGenre] = useState<number | null>(null)
  const [analysisFilter, setAnalysisFilter] = useState<AnalysisFilter>('Todos')

  const presentGenres: { id: number; name: string }[] = useMemo(() => {
    const ids: Set<number> = new Set()
    movies.forEach((m) => {
      m.genre_ids.forEach((g) => {
        ids.add(g)
      })
    })
    return Array.from(ids)
      .map((id) => ({ id, name: TMDB_GENRES[id] ?? `Género ${id.toString()}` }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [movies])

  const filtered: WatchedMovie[] = useMemo(() => {
    return movies.filter((m) => {
      const genreOk: boolean = activeGenre === null || m.genre_ids.includes(activeGenre)
      const isAnalyzed: boolean = analyzedMovieIds.has(m.id)
      const analysisOk: boolean =
        analysisFilter === 'Todos' ||
        (analysisFilter === 'Con análisis' ? isAnalyzed : !isAnalyzed)
      return genreOk && analysisOk
    })
  }, [movies, activeGenre, analysisFilter, analyzedMovieIds])

  const analyzedCount: number = movies.filter((m) => analyzedMovieIds.has(m.id)).length
  const filtersAreActive: boolean = activeGenre !== null || analysisFilter !== 'Todos'

  function handleDelete(movie: WatchedMovie): void {
    const confirmed: boolean = window.confirm(`¿Eliminar "${movie.title}" de tu biblioteca?`)
    if (confirmed) {
      deleteWatched.mutate(movie.id)
    }
  }

  const px = isMobile ? '16px' : '44px'

  if (isLoading && movies.length === 0) {
    return (
      <div style={{ flex: 1, padding: `36px ${px}`, overflowY: 'auto' }}>
        <div style={{ height: 32, width: 200, background: '#252421', borderRadius: 4, marginBottom: 24 }} className="animate-pulse" />
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 5}, 1fr)`, gap: 12 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[2/3] bg-pantalla-soft border-[0.4px] border-borde rounded-[10px] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div style={{ flex: 1, padding: `36px ${px}` }}>
        <p role="alert" className="font-sans text-warn">{error}</p>
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `60px ${px}`, gap: 20 }}>
        <p className="font-serif italic text-celuloide" style={{ fontSize: 22, textAlign: 'center', maxWidth: 420, lineHeight: 1.4 }}>
          Tu biblioteca empieza con la primera película que viste con intención.
        </p>
        <Button onClick={() => { navigate('/search') }}>
          Explorar películas
        </Button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header + filtros */}
      <div className="lumen-anim-1" style={{ padding: `${isMobile ? '20px' : '36px'} ${px} 0`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <h1 className="font-serif text-celuloide" style={{ fontSize: isMobile ? 24 : 30, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 5 }}>
              Mis películas
            </h1>
            <p className="font-mono text-gray-mid" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
              {movies.length} película{movies.length === 1 ? '' : 's'} · {analyzedCount} analizada
              {analyzedCount === 1 ? '' : 's'}
            </p>
          </div>
          <Button size="sm" onClick={() => { navigate('/search') }}>
            + Agregar película
          </Button>
        </div>

        <div className="lumen-anim-2" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 20, paddingTop: 14, paddingBottom: 20, borderBottom: '0.4px solid #2E2D2B', flexWrap: 'wrap', alignItems: isMobile ? 'flex-start' : 'center' }}>
          {presentGenres.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <FilterChip label="Todos" active={activeGenre === null} onClick={() => { setActiveGenre(null) }} />
              {presentGenres.map((g) => (
                <FilterChip
                  key={g.id}
                  label={g.name}
                  active={activeGenre === g.id}
                  onClick={() => { setActiveGenre(activeGenre === g.id ? null : g.id) }}
                />
              ))}
            </div>
          ) : null}

          {presentGenres.length > 0 && !isMobile ? (
            <div style={{ width: '0.4px', height: 18, background: '#2E2D2B', flexShrink: 0 }} aria-hidden="true" />
          ) : null}

          <div style={{ display: 'flex', gap: 6 }}>
            {(['Todos', 'Con análisis', 'Sin análisis'] as AnalysisFilter[]).map((f) => (
              <FilterChip key={f} label={f} active={analysisFilter === f} onClick={() => { setAnalysisFilter(f) }} />
            ))}
          </div>

          {filtersAreActive ? (
            <span className="font-mono text-gray-mid" style={{ fontSize: 10, marginLeft: isMobile ? 0 : 'auto' }}>
              {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `20px ${px} 48px` }}>
        {filtered.length === 0 ? (
          <div style={{ paddingTop: 48 }}>
            <p className="font-serif italic text-gray-mid" style={{ fontSize: 18 }}>
              Ninguna película coincide con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="lumen-anim-3" style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 5}, 1fr)`, gap: 12 }}>
            {filtered.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                hasAnalysis={analyzedMovieIds.has(m.id)}
                onDelete={() => { handleDelete(m) }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
