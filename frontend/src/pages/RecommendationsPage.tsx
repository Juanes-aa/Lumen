import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useDismissRecommendationMutation,
  useGenerateRecommendationsMutation,
  useRecommendationsQuery,
} from '../api/queries'
import { ApiError } from '../api/client'
import Button from '../components/ui/Button'
import Poster from '../components/ui/Poster'
import type { RecommendationOut } from '../types/recommendations'

interface RecCardProps {
  rec: RecommendationOut
  onDismiss: () => void
}

function RecCard({ rec, onDismiss }: RecCardProps): React.ReactElement {
  return (
    <article
      className="bg-pantalla border-[0.4px] border-borde rounded-[10px] overflow-hidden cursor-pointer transition-[border-color,transform] hover:border-borde-soft hover:-translate-y-[2px]"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div className="border-b-[0.4px] border-borde">
        <Poster url={rec.poster_url} alt={rec.title} fluid rounded="none" />
      </div>
      <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <p className="font-serif text-celuloide" style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 0 }}>
          {rec.title}
        </p>

        <div>
          <p className="font-mono text-amber" style={{ fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 7 }}>
            Por qué para ti
          </p>
          <p className="font-sans text-gray-mid" style={{ fontSize: 12.5, lineHeight: 1.65 }}>{rec.reason}</p>
        </div>

        {rec.themes.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rec.themes.map((t) => (
              <span key={t} className="lumen-tag-pill">{t}</span>
            ))}
          </div>
        ) : null}

        <div className="border-t-[0.4px] border-borde" style={{ marginTop: 'auto', paddingTop: 6 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismiss() }}
            className="bg-transparent border-none text-gray-dark font-sans cursor-pointer transition-colors text-left hover:text-gray-mid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
            style={{ fontSize: 11, padding: '4px 0' }}
            aria-label={`Descartar recomendación: ${rec.title}`}
          >
            No me interesa
          </button>
        </div>
      </div>
    </article>
  )
}

interface StepCircleProps {
  n: number
  filled: boolean
}

function StepCircle({ n, filled }: StepCircleProps): React.ReactElement {
  return (
    <div
      className={`rounded-full font-mono font-medium ${filled ? 'bg-amber text-amber-dark' : 'bg-transparent border-[0.4px] border-borde text-gray-mid'}`}
      style={{ width: filled ? 36 : 32, height: filled ? 36 : 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
      aria-hidden="true"
    >
      {n}
    </div>
  )
}

interface EmptyStateProps {
  onPrimary: () => void
  primaryLabel: string
  title: string
  hint: string
}

function EmptyState({ onPrimary, primaryLabel, title, hint }: EmptyStateProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 28, padding: '60px 44px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <StepCircle n={1} filled />
        <div className="bg-borde" style={{ width: 28, height: '0.4px' }} aria-hidden="true" />
        <StepCircle n={2} filled={false} />
        <div className="bg-borde" style={{ width: 28, height: '0.4px' }} aria-hidden="true" />
        <StepCircle n={3} filled={false} />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <p className="font-serif italic text-celuloide" style={{ fontSize: 22, lineHeight: 1.3, marginBottom: 14 }}>
          {title}
        </p>
        <p className="font-sans text-gray-mid" style={{ fontSize: 13, lineHeight: 1.6 }}>{hint}</p>
      </div>
      <Button onClick={onPrimary}>{primaryLabel}</Button>
    </div>
  )
}

function CardSkeleton(): React.ReactElement {
  return (
    <div className="bg-pantalla border-[0.4px] border-borde rounded-[10px] overflow-hidden">
      <div className="aspect-[2/3] bg-pantalla-soft" />
      <div className="p-4">
        <div className="h-[18px] w-[70%] bg-pantalla-soft rounded-[4px] mb-2" />
        <div className="h-3 w-full bg-pantalla-soft rounded-[4px] mb-[6px]" />
        <div className="h-3 w-[85%] bg-pantalla-soft rounded-[4px]" />
      </div>
    </div>
  )
}

export default function RecommendationsPage(): React.ReactElement {
  const navigate = useNavigate()

  const recsQuery = useRecommendationsQuery()
  const generateMutation = useGenerateRecommendationsMutation()
  const dismissMutation = useDismissRecommendationMutation()

  const recommendations: RecommendationOut[] = recsQuery.data ?? []
  const loading: boolean = recsQuery.isPending
  const generating: boolean = generateMutation.isPending

  const [needsMoreAnalysis, setNeedsMoreAnalysis] = useState<boolean>(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const error: string | null =
    generateError !== null
      ? generateError
      : recsQuery.isError
        ? 'Error al cargar las recomendaciones.'
        : null

  function handleGenerate(): void {
    setGenerateError(null)
    setNeedsMoreAnalysis(false)
    generateMutation.mutate(undefined, {
      onError: (err: Error) => {
        if (err instanceof ApiError && err.status === 422) {
          setNeedsMoreAnalysis(true)
        } else {
          setGenerateError('Error al generar recomendaciones. Inténtalo de nuevo.')
        }
      },
    })
  }

  function handleDismiss(id: string): void {
    dismissMutation.mutate(id)
  }

  const activeRecs: RecommendationOut[] = recommendations.filter((r) => r.status === 'active')

  if (loading) {
    return (
      <div style={{ flex: 1, padding: '36px 44px', overflowY: 'auto' }}>
        <div style={{ height: 36, width: 220, background: '#252421', borderRadius: 4, marginBottom: 28 }} className="animate-pulse" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div className="lumen-anim-1" style={{ padding: '36px 44px 0', flexShrink: 0 }}>
        <p className="lumen-overline" style={{ marginBottom: 8 }}>Basado en cómo piensas</p>
        <h1 className="font-serif text-celuloide" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8 }}>
          Lo que viene después
        </h1>
        <p className="font-sans text-gray-mid" style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 540, marginBottom: 24 }}>
          No porque otros lo vieron. Porque tú, específicamente, estás listo para esto.
        </p>
        <div className="lumen-anim-2" style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          {activeRecs.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generando…' : 'Generar nuevas'}
            </Button>
          ) : null}
          {activeRecs.length > 0 ? (
            <span className="font-mono text-gray-mid" style={{ fontSize: 10, marginLeft: 8 }}>
              {activeRecs.length} película{activeRecs.length !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 44px 48px' }}>
        {error !== null ? (
          <p role="alert" className="font-sans text-warn" style={{ fontSize: 13, marginBottom: 16 }}>{error}</p>
        ) : null}

        {needsMoreAnalysis ? (
          <EmptyState
            title="Analiza 3 películas para que Lumen entienda cómo piensas."
            hint="Una película no es suficiente. Con tres, Lumen empieza a ver un patrón."
            primaryLabel="Ir a tu biblioteca"
            onPrimary={() => { navigate('/library') }}
          />
        ) : null}

        {!needsMoreAnalysis && activeRecs.length === 0 && !generating ? (
          <EmptyState
            title="Aún no tienes recomendaciones activas."
            hint="Genera sugerencias personalizadas a partir de tu perfil cinematográfico."
            primaryLabel="Generar recomendaciones"
            onPrimary={handleGenerate}
          />
        ) : null}

        {generating && activeRecs.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
          </div>
        ) : null}

        {activeRecs.length > 0 ? (
          <div className="lumen-anim-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {activeRecs.map((rec) => (
              <RecCard key={rec.id} rec={rec} onDismiss={() => { handleDismiss(rec.id) }} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
