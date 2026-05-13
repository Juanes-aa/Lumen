import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMovieSearch } from '../hooks/useMovieSearch'
import { getPosterUrl } from '../services/tmdb'
import LumenSymbol from '../components/LumenSymbol'
import Poster from '../components/ui/Poster'
import type { TmdbSearchResult } from '../types/tmdb'

interface SearchResultCardProps {
  movie: TmdbSearchResult
  onClick: () => void
}

function SearchResultCard({ movie, onClick }: SearchResultCardProps): React.ReactElement {
  const posterUrl: string | null = getPosterUrl(movie.poster_path, 'w500')
  const year: string = movie.release_date ? movie.release_date.slice(0, 4) : '—'

  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-pantalla border-[0.4px] border-borde rounded-[8px] cursor-pointer text-left flex flex-col overflow-hidden transition-[border-color,transform] hover:border-amber hover:-translate-y-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
    >
      <div className="border-b-[0.4px] border-borde relative">
        <Poster url={posterUrl} alt={movie.title} fluid rounded="none" />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-[rgba(15,14,13,0.55)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="font-sans text-[11px] font-medium text-celuloide bg-amber text-amber-dark rounded-[5px] px-3 py-[6px]">
            Ver detalle
          </span>
        </div>
      </div>
      <div className="px-3 pt-[10px] pb-3">
        <p className="font-serif text-[13.5px] font-medium text-celuloide leading-[1.2] mb-[4px] line-clamp-2">
          {movie.title}
        </p>
        <p className="font-mono text-[9.5px] text-gray-mid tracking-[0.04em]">{year}</p>
      </div>
    </button>
  )
}

function SkeletonCard(): React.ReactElement {
  return (
    <div className="bg-pantalla border-[0.4px] border-borde rounded-[8px] overflow-hidden">
      <div className="aspect-[2/3] bg-pantalla-soft animate-pulse" />
      <div className="px-3 pt-[10px] pb-3">
        <div className="h-[10px] w-[70%] bg-pantalla-soft rounded-[2px] mb-[6px] animate-pulse" />
        <div className="h-2 w-[30%] bg-pantalla-soft rounded-[2px] animate-pulse" />
      </div>
    </div>
  )
}

export default function SearchPage(): React.ReactElement {
  const [query, setQuery] = useState<string>('')
  const { results, isLoading, error } = useMovieSearch(query)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const trimmed: string = query.trim()
  const tooShort: boolean = trimmed.length < 2
  const hasSearched: boolean = !tooShort && !isLoading
  const noResults: boolean = hasSearched && results.length === 0 && error === null

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Barra de búsqueda ── */}
      <div className="lumen-anim-1 px-11 pt-9 pb-6 shrink-0 border-b-[0.4px] border-borde">
        <div className="flex items-center gap-3 bg-pantalla-soft border-[0.5px] border-borde rounded-[10px] px-4 py-[13px] transition-colors focus-within:border-amber">
          <LumenSymbol size={17} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            placeholder="¿Qué escena no puedes dejar de pensar?"
            aria-label="Buscar película"
            className="bg-transparent border-none text-celuloide font-sans text-[13.5px] flex-1 p-0 focus:outline-none placeholder:text-gray-soft"
          />
          {query !== '' ? (
            <button
              type="button"
              onClick={() => { setQuery('') }}
              aria-label="Limpiar búsqueda"
              className="bg-transparent border-none cursor-pointer text-gray-mid flex p-0 hover:text-celuloide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto px-11 pt-7 pb-14">

        {/* Error */}
        {error !== null ? (
          <p role="alert" className="font-sans text-[13px] text-warn text-center py-10">
            {error}
          </p>
        ) : null}

        {/* Skeleton carga */}
        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : null}

        {/* Resultados */}
        {!isLoading && error === null && results.length > 0 ? (
          <div className="lumen-anim-2">
            <div className="flex items-center justify-between mb-6">
              <span className="lumen-overline">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
              {results.map((movie) => (
                <SearchResultCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => { navigate(`/movie/${movie.id.toString()}`) }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Sin resultados */}
        {noResults ? (
          <div className="text-center px-5 py-[60px]">
            <p className="font-serif italic text-[20px] text-gray-mid leading-[1.5]">
              No encontramos películas para "{trimmed}".
            </p>
            <p className="font-sans text-[12.5px] text-gray-soft mt-2">
              Intenta con otro título o nombre del director.
            </p>
          </div>
        ) : null}

        {/* Estado vacío inicial */}
        {tooShort && error === null && !isLoading ? (
          <div className="lumen-anim-1 mt-5">
            <p className="font-serif italic text-[24px] font-normal text-celuloide leading-[1.3] mb-8 max-w-[520px]">
              Empieza por el título. O por lo que todavía estás procesando.
            </p>
            <p className="lumen-overline mb-4">Por género</p>
            <div className="flex flex-wrap gap-2">
              {['Drama', 'Terror', 'Sci-Fi', 'Comedia', 'Thriller', 'Animación', 'Documental', 'Romance'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => { setQuery(g) }}
                  className="lumen-chip-suggestion text-[11.5px] px-3 py-[6px]"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
