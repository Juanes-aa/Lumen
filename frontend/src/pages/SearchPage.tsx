import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMovieSearch } from '../hooks/useMovieSearch'
import { getPosterUrl } from '../services/tmdb'
import LumenSymbol from '../components/LumenSymbol'
import Poster from '../components/ui/Poster'
import type { TmdbSearchResult } from '../types/tmdb'

const TMDB_GENRE_MAP: Record<number, string> = {
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
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  10752: 'Bélica',
  37: 'Western',
}

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
      className="bg-pantalla border-[0.4px] border-borde rounded-[8px] cursor-pointer text-left flex flex-col overflow-hidden transition-[border-color,transform] hover:border-amber hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
    >
      <div className="border-b-[0.4px] border-borde">
        <Poster url={posterUrl} alt={movie.title} fluid rounded="none" />
      </div>
      <div style={{ padding: '10px 11px 12px' }}>
        <p className="font-serif text-celuloide" style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.2, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {movie.title}
        </p>
        <p className="font-mono text-gray-mid" style={{ fontSize: 9.5, letterSpacing: '0.04em' }}>{year}</p>
      </div>
    </button>
  )
}

function SkeletonCard(): React.ReactElement {
  return (
    <div className="bg-pantalla border-[0.4px] border-borde rounded-[10px] overflow-hidden">
      <div className="aspect-[2/3] bg-pantalla-soft animate-pulse" />
      <div style={{ padding: '10px 11px 12px' }}>
        <div style={{ height: 10, width: '70%', background: '#1E1D1B', borderRadius: 2, marginBottom: 6 }} className="animate-pulse" />
        <div style={{ height: 8, width: '30%', background: '#1E1D1B', borderRadius: 2 }} className="animate-pulse" />
      </div>
    </div>
  )
}

export default function SearchPage(): React.ReactElement {
  const [query, setQuery] = useState<string>('')
  const [activeGenreId, setActiveGenreId] = useState<number | null>(null)
  const { results, isLoading, error } = useMovieSearch(query)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setActiveGenreId(null)
  }, [query])

  const trimmed: string = query.trim()
  const tooShort: boolean = trimmed.length < 2
  const hasSearched: boolean = !tooShort && !isLoading
  const noResults: boolean = hasSearched && results.length === 0 && error === null

  const presentGenres: { id: number; name: string }[] = useMemo(() => {
    const ids = new Set<number>()
    results.forEach((m) => m.genre_ids.forEach((id) => ids.add(id)))
    return Array.from(ids)
      .filter((id) => id in TMDB_GENRE_MAP)
      .map((id) => ({ id, name: TMDB_GENRE_MAP[id] }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [results])

  const filtered: TmdbSearchResult[] = useMemo(() => {
    if (activeGenreId === null) return results
    return results.filter((m) => m.genre_ids.includes(activeGenreId))
  }, [results, activeGenreId])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Barra de búsqueda ── */}
      <div
        className="lumen-anim-1"
        style={{
          padding: '36px 44px 24px',
          flexShrink: 0,
          borderBottom: !tooShort ? '0.4px solid #2E2D2B' : 'none',
        }}
      >
        <div
          className="focus-within:border-amber transition-colors"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#1E1D1B', border: '0.5px solid #2E2D2B',
            borderRadius: 10, padding: '12px 16px', maxWidth: 720,
          }}
        >
          <LumenSymbol size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            placeholder="¿Qué escena no puedes dejar de pensar?"
            aria-label="Buscar película"
            style={{
              background: 'transparent', border: 'none',
              color: '#FAF9F6', fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, flex: 1, padding: 0,
            }}
          />
          {query !== '' ? (
            <button
              type="button"
              onClick={() => { setQuery('') }}
              aria-label="Limpiar búsqueda"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888780', display: 'flex', padding: 0 }}
              className="hover:text-celuloide"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 44px 48px' }}>

        {error !== null ? (
          <p role="alert" className="font-sans text-warn" style={{ fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : null}

        {!isLoading && error === null && results.length > 0 ? (
          <div className="lumen-anim-2">
            {/* Genre filter chips */}
            {presentGenres.length > 1 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => { setActiveGenreId(null) }}
                  aria-pressed={activeGenreId === null}
                  className={`rounded-[4px] font-sans cursor-pointer transition-colors select-none border-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${activeGenreId === null ? 'bg-[rgba(250,199,117,0.08)] border-amber text-celuloide' : 'bg-transparent border-borde text-gray-mid hover:border-borde-soft'}`}
                  style={{ fontSize: 11.5, padding: '5px 11px' }}
                >
                  Todos
                </button>
                {presentGenres.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { setActiveGenreId(activeGenreId === g.id ? null : g.id) }}
                    aria-pressed={activeGenreId === g.id}
                    className={`rounded-[4px] font-sans cursor-pointer transition-colors select-none border-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${activeGenreId === g.id ? 'bg-[rgba(250,199,117,0.08)] border-amber text-celuloide' : 'bg-transparent border-borde text-gray-mid hover:border-borde-soft'}`}
                    style={{ fontSize: 11.5, padding: '5px 11px' }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="font-mono text-gray-mid" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                {activeGenreId !== null ? ` · ${TMDB_GENRE_MAP[activeGenreId] ?? ''}` : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {filtered.map((movie) => (
                <SearchResultCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => { navigate(`/movie/${movie.id.toString()}`) }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {noResults ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p className="font-serif italic text-gray-mid" style={{ fontSize: 18, lineHeight: 1.5 }}>
              No encontramos películas para "{trimmed}".
            </p>
            <p className="font-sans text-gray-soft" style={{ fontSize: 12.5, marginTop: 8 }}>
              Intenta con otro título o nombre del director.
            </p>
          </div>
        ) : null}

        {tooShort && error === null && !isLoading ? (
          <div className="lumen-anim-1">
            <p className="font-serif italic text-celuloide" style={{ fontSize: 22, lineHeight: 1.3, maxWidth: 500 }}>
              Empieza por el título. O por lo que todavía estás procesando.
            </p>
          </div>
        ) : null}

      </div>
    </div>
  )
}
