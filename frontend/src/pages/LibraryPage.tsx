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

function MovieCard({ movie, hasAnalysis, onDelete }: MovieCardProps): React.ReactElement {
  return (
    <div className="group bg-pantalla border-[0.4px] border-borde rounded-[10px] overflow-hidden cursor-pointer transition-colors relative flex flex-col hover:border-borde-soft">
      <Link to={`/movie/${movie.tmdb_id.toString()}`} className="block relative">
        <div className="border-b-[0.4px] border-borde">
          <Poster url={movie.poster_url} alt={movie.title} fluid rounded="none" />
        </div>
        {hasAnalysis ? (
          <span className="absolute top-[7px] right-[7px] bg-teal-dark border-[0.4px] border-[rgba(29,158,117,0.31)] rounded-[4px] text-teal font-mono text-[9px] px-[6px] py-[2px] tracking-[0.07em] uppercase">
            Analizada
          </span>
        ) : null}
      </Link>
      <div className="px-[11px] pt-[10px] pb-3 flex-1 flex flex-col">
        <p className="font-serif text-[13.5px] font-medium text-celuloide leading-[1.2] mb-[3px] overflow-hidden line-clamp-2">
          {movie.title}
        </p>
        <p className="font-mono text-[9.5px] text-gray-mid tracking-[0.04em]">
          {movie.release_year ?? '—'}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="bg-transparent border-none text-gray-dark font-sans text-[10.5px] p-0 mt-2 cursor-pointer text-left self-start opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-warn focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
          aria-label={`Eliminar ${movie.title} de la biblioteca`}
        >
          Eliminar
        </button>
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
      <div className="flex-1 px-11 py-9 overflow-y-auto">
        <div className="h-8 w-[200px] bg-pantalla rounded-[4px] mb-6 animate-pulse" />
        <div className="grid grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div
              key={i}
              className="aspect-[2/3] bg-pantalla-soft border-[0.4px] border-borde rounded-[10px] animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className="flex-1 px-11 py-9">
        <p role="alert" className="text-warn">
          {error}
        </p>
      </div>
    )
  }

  if (movies.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-10 py-[60px] gap-5">
        <p className="font-serif italic text-[22px] text-celuloide text-center max-w-[420px] leading-[1.4]">
          Tu biblioteca empieza con la primera película que viste con intención.
        </p>
        <Button
          onClick={() => {
            navigate('/search')
          }}
        >
          Explorar películas
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="lumen-anim-1 px-11 pt-9 shrink-0">
        <div className="flex justify-between items-end mb-5">
          <div>
            <h1 className="font-serif text-[30px] font-medium text-celuloide tracking-[-0.02em] mb-[5px]">
              Mis películas
            </h1>
            <p className="font-mono text-[11px] text-gray-mid tracking-[0.06em]">
              {movies.length} película{movies.length === 1 ? '' : 's'} · {analyzedCount} analizada
              {analyzedCount === 1 ? '' : 's'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              navigate('/search')
            }}
          >
            + Agregar película
          </Button>
        </div>

        <div className="lumen-anim-2 flex gap-5 pb-[18px] border-b-[0.4px] border-borde flex-wrap items-center">
          {presentGenres.length > 0 ? (
            <div className="flex gap-[6px] flex-wrap">
              <FilterChip
                label="Todos"
                active={activeGenre === null}
                onClick={() => {
                  setActiveGenre(null)
                }}
              />
              {presentGenres.map((g) => (
                <FilterChip
                  key={g.id}
                  label={g.name}
                  active={activeGenre === g.id}
                  onClick={() => {
                    setActiveGenre(activeGenre === g.id ? null : g.id)
                  }}
                />
              ))}
            </div>
          ) : null}

          {presentGenres.length > 0 ? (
            <div className="w-[0.4px] h-[18px] bg-borde shrink-0" aria-hidden="true" />
          ) : null}

          <div className="flex gap-[6px]">
            {(['Todos', 'Con análisis', 'Sin análisis'] as AnalysisFilter[]).map((f) => (
              <FilterChip
                key={f}
                label={f}
                active={analysisFilter === f}
                onClick={() => {
                  setAnalysisFilter(f)
                }}
              />
            ))}
          </div>

          {filtersAreActive ? (
            <span className="font-mono text-[10px] text-gray-mid ml-auto">
              {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-11 pt-6 pb-12">
        {filtered.length === 0 ? (
          <div className="pt-12">
            <p className="font-serif italic text-lg text-gray-mid">
              Ninguna película coincide con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="lumen-anim-3 grid grid-cols-5 gap-3">
            {filtered.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                hasAnalysis={analyzedMovieIds.has(m.id)}
                onDelete={() => {
                  handleDelete(m)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
