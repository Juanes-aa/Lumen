import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteSessionMutation, useSessionsQuery } from '../api/queries'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Poster from '../components/ui/Poster'
import type { SessionSummary } from '../types/analysis'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function TrashIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  )
}

interface SessionRowProps {
  session: SessionSummary
  onClick: () => void
  onDelete: () => void
  onResume: () => void
}

function SessionRow({
  session,
  onClick,
  onDelete,
  onResume,
}: SessionRowProps): React.ReactElement {
  const isActive: boolean = session.status === 'active'

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir sesión: ${session.movie_title}`}
      className="group flex items-center gap-[14px] px-[18px] py-[14px] bg-transparent border-[0.4px] border-borde rounded-[10px] cursor-pointer transition-colors hover:bg-pantalla hover:border-borde-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
    >
      <Poster url={session.movie_poster_url} alt={session.movie_title} width={44} height={66} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[10px] mb-1">
          <span
            aria-hidden="true"
            className={`w-[6px] h-[6px] rounded-full shrink-0 ${
              isActive ? 'bg-amber shadow-[0_0_5px_rgba(250,199,117,0.4)]' : 'bg-teal'
            }`}
          />
          <p className="font-serif text-base font-medium text-celuloide tracking-[-0.01em] overflow-hidden text-ellipsis whitespace-nowrap">
            {session.movie_title}
          </p>
          <span className="font-mono text-[10px] text-gray-dark ml-auto shrink-0">
            {dateFormatter.format(new Date(session.started_at))}
          </span>
        </div>
        <div className="flex gap-2 items-center mt-1">
          <span
            className={`font-mono text-[9.5px] uppercase tracking-[0.08em] ${
              isActive ? 'text-amber' : 'text-gray-mid'
            }`}
          >
            {isActive ? 'En curso' : 'Cerrada'}
          </span>
          {session.has_tags ? (
            <span className="lumen-chip-teal text-[10px] px-2 py-[2px]">Con etiquetas</span>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {isActive ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onResume()
            }}
          >
            Retomar
          </Button>
        ) : null}
        <IconButton
          variant="ghost"
          size="md"
          aria-label={`Eliminar sesión: ${session.movie_title}`}
          icon={<TrashIcon />}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        />
      </div>
    </div>
  )
}

type HistoryFilter = 'Todas' | 'Activas' | 'Cerradas'

export default function HistoryPage(): React.ReactElement {
  const navigate = useNavigate()
  const sessionsQuery = useSessionsQuery()
  const deleteMutation = useDeleteSessionMutation()

  const [filter, setFilter] = useState<HistoryFilter>('Todas')

  const sessions: SessionSummary[] = useMemo(() => {
    const data: SessionSummary[] = sessionsQuery.data ?? []
    return [...data].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )
  }, [sessionsQuery.data])

  function handleDelete(sessionId: string): void {
    const confirmed: boolean = window.confirm(
      '¿Eliminar esta sesión? Esta acción no se puede deshacer.',
    )
    if (!confirmed) return
    deleteMutation.mutate(sessionId, {
      onError: () => {
        window.alert('Error al eliminar la sesión.')
      },
    })
  }

  const filtered: SessionSummary[] = sessions.filter((s) => {
    if (filter === 'Activas') return s.status === 'active'
    if (filter === 'Cerradas') return s.status === 'closed'
    return true
  })
  const activeCount: number = sessions.filter((s) => s.status === 'active').length
  const closedCount: number = sessions.filter((s) => s.status === 'closed').length

  if (sessionsQuery.isPending) {
    return (
      <div className="flex-1 px-11 py-9 overflow-y-auto">
        <div className="h-9 w-[200px] bg-pantalla rounded-[4px] mb-6 animate-pulse" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[90px] bg-pantalla-soft border-[0.4px] border-borde rounded-[10px] animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (sessionsQuery.isError) {
    return (
      <div className="flex-1 px-11 py-9">
        <h1 className="font-serif text-[30px] text-celuloide mb-3">Análisis</h1>
        <p role="alert" className="text-warn mb-4">
          Error al cargar el historial.
        </p>
        <Button
          onClick={() => {
            void sessionsQuery.refetch()
          }}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-10 py-[60px] gap-5">
        <p className="font-serif italic text-[22px] text-celuloide text-center max-w-[460px] leading-[1.4]">
          Aún no has analizado ninguna película. Cada análisis va construyendo tu perfil.
        </p>
        <Button
          onClick={() => {
            navigate('/library')
          }}
        >
          Ir a tu biblioteca
        </Button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="lumen-anim-1 px-11 pt-9 shrink-0">
        <div className="flex justify-between items-end mb-[18px]">
          <div>
            <h1 className="font-serif text-[30px] font-medium text-celuloide tracking-[-0.02em] mb-[5px]">
              Análisis
            </h1>
            <p className="font-mono text-[11px] text-gray-mid tracking-[0.06em]">
              {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'} · {activeCount} en
              curso · {closedCount} cerradas
            </p>
          </div>
        </div>

        <div className="lumen-anim-2 flex gap-[6px] pb-[18px] border-b-[0.4px] border-borde">
          {(['Todas', 'Activas', 'Cerradas'] as const).map((f) => {
            const active: boolean = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFilter(f)
                }}
                aria-pressed={active}
                className={`rounded-[4px] font-sans text-[11.5px] px-[11px] py-[5px] cursor-pointer transition-colors border-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
                  active
                    ? 'bg-[rgba(250,199,117,0.08)] border-amber text-celuloide'
                    : 'bg-transparent border-borde text-gray-mid hover:border-borde-soft'
                }`}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-11 pt-6 pb-12">
        {filtered.length === 0 ? (
          <p className="font-serif italic text-lg text-gray-mid">
            Ninguna sesión coincide con el filtro.
          </p>
        ) : (
          <div className="lumen-anim-3 flex flex-col gap-[10px]">
            {filtered.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onClick={() => {
                  navigate(`/history/${s.id}`)
                }}
                onResume={() => {
                  navigate(`/analysis/${s.id}`)
                }}
                onDelete={() => {
                  handleDelete(s.id)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
