import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useDeleteWatchedMutation,
  useSessionsQuery,
  useWatchedMoviesQuery,
} from '../api/queries'
import Button from '../components/ui/Button'
import Poster from '../components/ui/Poster'
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
      className={`rounded-[4px] font-sans text-[11.5px] px-[11px] py-[5px] cursor-pointer transition-colors select-none border-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
        active
          ? 'bg-[rgba(250,199,117,0.08)] border-amber text-celuloide'
          : 'bg-transparent border-borde text-gray-mid hover:border-borde-soft'
      }`}
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

function MovieCard({ movie, hasAnalysis, onDelete: _onDelete }: MovieCardProps): React.ReactElement {
  return (
    <div className="group bg-pantalla border-[0.4px] border-borde rounded-[8px] overflow-hidden cursor-pointer transition-colors relative flex flex-col hover:border-borde-soft">
      <div className="relative">
        <Link to={`/movie/${movie.tmdb_id.toString()}`} className="block">
          <Poster url={movie.poster_url} alt={movie.title} fluid rounded="none" />
        </Link>
        {hasAnalysis ? (
          <span className="absolute top-[7px] right-[7px] bg-teal-dark border-[0.4px] border-[rgba(29,158,117,0.31)] rounded-[4px] text-teal font-mono text-[9px] px-[6px] py-[2px] tracking-[0.07em] uppercase z-10">
            Analizada
          </span>
        ) : null}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[rgba(15,14,13,0.82)] flex flex-col items-center justify-end px-3 pb-[14px] gap-[7px] opacity-0 transition-opacity group-hover:opacity-100 rounded-[6px_6px_0_0]">
          {hasAnalysis ? (
            <Link
              to={`/movie/${movie.tmdb_id.toString()}`}
              className="w-full rounded-[5px] bg-transparent border-[0.4px] border-[#3A3937] text-celuloide font-sans text-[11px] font-medium py-[7px] text-center transition-opacity hover:opacity-85"
            >
              Ver análisis
            </Link>
          ) : null}
          <Link
            to={`/movie/${movie.tmdb_id.toString()}`}
            className="w-full rounded-[5px] bg-amber border-none text-amber-dark font-sans text-[11px] font-medium py-[7px] text-center transition-opacity hover:opacity-85"
          >
            {hasAnalysis ? 'Nueva sesión' : 'Analizar ahora'}
          </Link>
        </div>
      </div>
      <div className="px-[11px] pt-[10px] pb-3">
        <p className="font-serif text-[13.5px] font-medium text-celuloide leading-[1.2] mb-[3px] overflow-hidden line-clamp-2">
          {movie.title}
        </p>
        <p className="font-mono text-[9.5px] text-gray-mid tracking-[0.04em]">
          {movie.release_year ?? '—'}
        </p>
      </div>
    </div>
  )
}

export default function LibraryPage(): React.ReactElement {
  const navigate = useNavigate()

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

  if (isLoading && movies.length === 0) {
    return (
      <div style={{ flex: 1, padding: '36px 44px', overflowY: 'auto' }}>
        <div style={{ height: 32, width: 200, background: '#252421', borderRadius: 4, marginBottom: 24 }} className="animate-pulse" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="aspect-[2/3] bg-pantalla-soft border-[0.4px] border-borde rounded-[10px] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div style={{ flex: 1, padding: '36px 44px' }}>
        <p role="alert" className="font-sans text-warn">{error}</p>
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 44px', gap: 20 }}>
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
      <div className="lumen-anim-1" style={{ padding: '36px 44px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
            <h1 className="font-serif text-celuloide" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 5 }}>
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

        <div className="lumen-anim-2" style={{ display: 'flex', gap: 20, paddingBottom: 18, borderBottom: '0.4px solid #2E2D2B', flexWrap: 'wrap', alignItems: 'center' }}>
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

          {presentGenres.length > 0 ? (
            <div style={{ width: '0.4px', height: 18, background: '#2E2D2B', flexShrink: 0 }} aria-hidden="true" />
          ) : null}

          <div style={{ display: 'flex', gap: 6 }}>
            {(['Todos', 'Con análisis', 'Sin análisis'] as AnalysisFilter[]).map((f) => (
              <FilterChip key={f} label={f} active={analysisFilter === f} onClick={() => { setAnalysisFilter(f) }} />
            ))}
          </div>

          {filtersAreActive ? (
            <span className="font-mono text-gray-mid" style={{ fontSize: 10, marginLeft: 'auto' }}>
              {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 44px 48px' }}>
        {filtered.length === 0 ? (
          <div style={{ paddingTop: 48 }}>
            <p className="font-serif italic text-gray-mid" style={{ fontSize: 18 }}>
              Ninguna película coincide con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="lumen-anim-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
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
