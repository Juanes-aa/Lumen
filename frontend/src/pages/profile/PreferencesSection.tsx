import { useEffect, useRef, useState } from 'react'
import Button from '../../components/ui/Button'
import {
  usePreferencesQuery,
  useUpdatePreferencesMutation,
} from '../../api/queries'
import type { UserPreferences } from '../../types/profile'

const ALL_GENRES: string[] = [
  'Drama',
  'Sci-Fi',
  'Thriller',
  'Documental',
  'Terror',
  'Histórico',
  'Experimental',
  'Romance',
  'Comedia',
  'Acción',
]

interface GenreChipProps {
  genre: string
  selected: boolean
  onClick: () => void
}

function GenreChip({ genre, selected, onClick }: GenreChipProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-[4px] font-sans text-xs px-3 py-[6px] cursor-pointer transition-colors select-none border-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
        selected
          ? 'bg-[rgba(250,199,117,0.06)] border-amber text-celuloide'
          : 'bg-pantalla border-borde text-gray-mid hover:border-borde-soft'
      }`}
    >
      {genre}
    </button>
  )
}

interface PreferencesSectionProps {
  onToast: (msg: string) => void
}

export default function PreferencesSection({ onToast }: PreferencesSectionProps): React.ReactElement {
  const prefsQuery = usePreferencesQuery()
  const updateMutation = useUpdatePreferencesMutation()

  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([])
  const [directorsInput, setDirectorsInput] = useState<string>('')
  const initializedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!initializedRef.current && prefsQuery.data !== undefined) {
      setFavoriteGenres(prefsQuery.data.favorite_genres)
      setDirectorsInput(prefsQuery.data.reference_directors.join(', '))
      initializedRef.current = true
    }
  }, [prefsQuery.data])

  function toggleGenre(genre: string): void {
    setFavoriteGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    )
  }

  function handleSave(): void {
    const directors: string[] = directorsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
    const payload: UserPreferences = {
      favorite_genres: favoriteGenres,
      reference_directors: directors,
    }
    updateMutation.mutate(payload, {
      onSuccess: () => {
        onToast('Preferencias guardadas')
      },
      onError: () => {
        onToast('Error al guardar')
      },
    })
  }

  return (
    <section className="lumen-anim-3 lumen-section">
      <span className="lumen-overline mb-4">Preferencias declaradas</span>

      <div className="mb-5">
        <p className="font-sans text-xs text-gray-mid mb-3">Géneros favoritos</p>
        <div className="flex flex-wrap gap-[7px]">
          {ALL_GENRES.map((g) => (
            <GenreChip
              key={g}
              genre={g}
              selected={favoriteGenres.includes(g)}
              onClick={() => {
                toggleGenre(g)
              }}
            />
          ))}
        </div>
      </div>

      <div className="mb-[14px]">
        <label
          htmlFor="profile-directors"
          className="font-sans text-xs text-gray-mid mb-[10px] block"
        >
          Directores de referencia
        </label>
        <input
          id="profile-directors"
          className="lumen-input focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          value={directorsInput}
          onChange={(e) => {
            setDirectorsInput(e.target.value)
          }}
          placeholder="Ej. Tarkovski, Bresson, Varda…"
        />
        <p className="font-mono text-[10px] text-gray-dark tracking-[0.05em] mt-2">
          Separados por coma
        </p>
      </div>

      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Guardando…' : 'Guardar preferencias'}
      </Button>
    </section>
  )
}
