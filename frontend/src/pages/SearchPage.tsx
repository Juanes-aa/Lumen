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
      className="bg-pantalla border-[0.4px] border-borde rounded-[10px] cursor-pointer text-left flex flex-col overflow-hidden transition-colors hover:border-borde-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
    >
      <div className="border-b-[0.4px] border-borde">
        <Poster url={posterUrl} alt={movie.title} fluid rounded="none" />
      </div>
      <div className="px-[11px] pt-[10px] pb-3">
        <p className="font-serif text-[13.5px] font-medium text-celuloide leading-[1.2] mb-[3px] line-clamp-2 overflow-hidden">
          {movie.title}
        </p>
        <p className="font-mono text-[9.5px] text-gray-mid tracking-[0.04em]">{year}</p>
      </div>
    </button>
  )
}

function SkeletonCard(): React.ReactElement {
  return (
    <div className="bg-pantalla border-[0.4px] border-borde rounded-[10px] overflow-hidden">
      <div className="aspect-[2/3] bg-pantalla-soft animate-pulse" />
      <div className="px-[11px] pt-[10px] pb-3">
        <div className="h-[10px] w-[70%] bg-pantalla-soft rounded-[2px] mb-[6px]" />
        <div className="h-2 w-[30%] bg-pantalla-soft rounded-[2px]" />
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
      {/* Search header */}
      <div
        className={`lumen-anim-1 px-11 pt-9 pb-6 shrink-0 ${
          !tooShort ? 'border-b-[0.4px] border-borde' : ''
        }`}
      >
        <div className="flex items-center gap-3 bg-pantalla-soft border-[0.5px] border-borde rounded-[10px] px-4 py-3 transition-colors max-w-[720px] focus-within:border-amber">
          <LumenSymbol size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
            placeholder="¿Qué escena no puedes dejar de pensar?"
            aria-label="Buscar película"
            className="bg-transparent border-none text-celuloide font-sans text-sm flex-1 p-0 focus:outline-none"
          />
          {query !== '' ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
              }}
              aria-label="Limpiar búsqueda"
              className="bg-transparent border-none cursor-pointer text-gray-mid flex p-0 hover:text-celuloide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-11 pt-6 pb-12">
        {error !== null ? (
          <p role="alert" className="font-sans text-[13px] text-warn text-center py-10">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : null}

        {!isLoading && error === null && results.length > 0 ? (
          <div className="lumen-anim-2 grid grid-cols-5 gap-3">
            {results.map((movie) => (
              <SearchResultCard
                key={movie.id}
                movie={movie}
                onClick={() => {
                  navigate(`/movie/${movie.id.toString()}`)
                }}
              />
            ))}
          </div>
        ) : null}

        {noResults ? (
          <div className="text-center px-5 py-[60px]">
            <p className="font-serif italic text-lg text-gray-mid leading-[1.5]">
              No encontramos películas para “{trimmed}”.
            </p>
            <p className="font-sans text-[12.5px] text-gray-soft mt-2">
              Intenta con otro título o nombre del director.
            </p>
          </div>
        ) : null}

        {tooShort && error === null && !isLoading ? (
          <div className="text-center px-5 pt-20 pb-10">
            <p className="font-serif italic text-[22px] font-normal text-celuloide leading-[1.4] mb-[14px] max-w-[480px] mx-auto">
              Empieza por una película que aún no termina de cerrarse en tu cabeza.
            </p>
            <p className="font-sans text-[13px] text-gray-mid">
              Lumen funciona mejor con películas que te dejaron preguntas.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
