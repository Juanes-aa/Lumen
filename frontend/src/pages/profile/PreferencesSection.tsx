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
      className={`rounded-[4px] font-sans cursor-pointer transition-colors select-none border-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
        selected
          ? 'bg-[rgba(250,199,117,0.06)] border-amber text-celuloide'
          : 'bg-pantalla border-borde text-gray-mid hover:border-borde-soft'
      }`}
      style={{ fontSize: 12, padding: '6px 12px' }}
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
      <span className="lumen-overline" style={{ display: 'block', marginBottom: 16 }}>Preferencias declaradas</span>

      <div style={{ marginBottom: 20 }}>
        <p className="font-sans text-gray-mid" style={{ fontSize: 12, marginBottom: 12 }}>Géneros favoritos</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {ALL_GENRES.map((g) => (
            <GenreChip
              key={g}
              genre={g}
              selected={favoriteGenres.includes(g)}
              onClick={() => { toggleGenre(g) }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label
          htmlFor="profile-directors"
          className="font-sans text-gray-mid"
          style={{ fontSize: 12, display: 'block', marginBottom: 10 }}
        >
          Directores de referencia
        </label>
        <input
          id="profile-directors"
          className="lumen-input focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          value={directorsInput}
          onChange={(e) => { setDirectorsInput(e.target.value) }}
          placeholder="Ej. Tarkovski, Bresson, Varda…"
        />
        <p className="font-mono text-gray-dark" style={{ fontSize: 10, letterSpacing: '0.05em', marginTop: 8 }}>
          Separados por coma
        </p>
      </div>

      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Guardando…' : 'Guardar preferencias'}
      </Button>
    </section>
  )
}
