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
    <article className="flex flex-col bg-pantalla border-[0.4px] border-borde rounded-[10px] overflow-hidden cursor-pointer transition-[border-color,transform] hover:border-borde-soft hover:-translate-y-[2px]">
      <div className="border-b-[0.4px] border-borde">
        <Poster url={rec.poster_url} alt={rec.title} fluid rounded="none" />
      </div>
      <div className="px-4 pt-4 pb-[14px] flex flex-col gap-3 flex-1">
        {/* Title + meta */}
        <div>
          <p className="font-serif text-[18px] font-medium text-celuloide leading-[1.15] tracking-[-0.01em] mb-1">
            {rec.title}
          </p>
        </div>

        {/* Reason */}
        <div>
          <p className="font-mono text-[9.5px] text-amber tracking-[0.16em] uppercase mb-[7px]">
            Por qué para ti
          </p>
          <p className="font-sans text-[12.5px] text-gray-mid leading-[1.65]">{rec.reason}</p>
        </div>

        {rec.themes.length > 0 ? (
          <div className="flex flex-wrap gap-[6px]">
            {rec.themes.map((t) => (
              <span key={t} className="lumen-tag-pill">
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto pt-[6px] border-t-[0.4px] border-borde">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="bg-transparent border-none text-gray-dark font-sans text-[11px] cursor-pointer py-1 transition-colors text-left hover:text-gray-mid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
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
      className={`rounded-full flex items-center justify-center font-mono text-[13px] font-medium ${
        filled
          ? 'w-9 h-9 bg-amber text-amber-dark'
          : 'w-8 h-8 bg-transparent border-[0.4px] border-borde text-gray-mid'
      }`}
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
    <div className="flex flex-col items-center justify-center flex-1 gap-7 px-10 py-[60px]">
      <div className="flex gap-3 items-center">
        <StepCircle n={1} filled />
        <div className="w-7 h-[0.4px] bg-borde" aria-hidden="true" />
        <StepCircle n={2} filled={false} />
        <div className="w-7 h-[0.4px] bg-borde" aria-hidden="true" />
        <StepCircle n={3} filled={false} />
      </div>
      <div className="text-center max-w-[440px]">
        <p className="font-serif italic text-[22px] font-normal text-celuloide leading-[1.3] mb-[14px]">
          {title}
        </p>
        <p className="font-sans text-[13px] text-gray-mid leading-[1.6]">{hint}</p>
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
      <div className="flex-1 px-11 py-9 overflow-y-auto">
        <div className="h-9 w-[220px] bg-pantalla rounded-[4px] mb-7 animate-pulse" />
        <div className="grid gap-4 grid-cols-3">
          {[0, 1, 2].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="lumen-anim-1 px-11 pt-10 pb-0 shrink-0">
        <p className="lumen-overline mb-2">Basado en cómo piensas</p>
        <h1 className="font-serif text-[32px] font-medium text-celuloide tracking-[-0.02em] leading-[1.1] mb-2">
          Lo que viene después
        </h1>
        <p className="font-sans text-[13.5px] text-gray-mid leading-[1.6] max-w-[540px] mb-6">
          No porque otros lo vieron. Porque tú, específicamente, estás listo para esto.
        </p>
        <div className="lumen-anim-2 flex gap-2 mb-8 flex-wrap items-center">
          {activeRecs.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generando…' : 'Generar nuevas'}
            </Button>
          ) : null}
          {activeRecs.length > 0 ? (
            <span className="font-mono text-[10px] text-gray-mid ml-2">
              {activeRecs.length} película{activeRecs.length !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-11 pt-6 pb-12">
        {error !== null ? (
          <p role="alert" className="font-sans text-[13px] text-warn mb-4">
            {error}
          </p>
        ) : null}

        {needsMoreAnalysis ? (
          <EmptyState
            title="Analiza 3 películas para que Lumen entienda cómo piensas."
            hint="Una película no es suficiente. Con tres, Lumen empieza a ver un patrón."
            primaryLabel="Ir a tu biblioteca"
            onPrimary={() => {
              navigate('/library')
            }}
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
          <div className="grid gap-4 grid-cols-3">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : null}

        {activeRecs.length > 0 ? (
          <div className="lumen-anim-2 grid gap-4 grid-cols-3">
            {activeRecs.map((rec) => (
              <RecCard
                key={rec.id}
                rec={rec}
                onDismiss={() => {
                  handleDismiss(rec.id)
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
