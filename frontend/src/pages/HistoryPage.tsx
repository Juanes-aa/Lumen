import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteSessionMutation, useSessionsQuery } from '../api/queries'
import Button from '../components/ui/Button'
import Poster from '../components/ui/Poster'
import type { SessionSummary } from '../types/analysis'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
})

interface SessionRowProps {
  session: SessionSummary
  isSelected: boolean
  onClick: () => void
}

function SessionRow({ session, isSelected, onClick }: SessionRowProps): React.ReactElement {
  const isActive: boolean = session.status === 'active'
  const dateStr: string = dateFormatter.format(new Date(session.started_at))

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
      className="group flex items-start gap-4 px-5 py-[18px] border-b-[0.4px] border-borde cursor-pointer transition-colors hover:bg-pantalla first:border-t-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
      style={{ background: isSelected ? '#252421' : 'transparent' }}
    >
      <Poster url={session.movie_poster_url} alt={session.movie_title} width={44} height={66} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[10px] mb-1">
          <span
            aria-hidden="true"
            className={`w-[6px] h-[6px] rounded-full shrink-0 ${
              isActive
                ? 'bg-amber shadow-[0_0_5px_rgba(250,199,117,0.6)]'
                : 'bg-teal'
            }`}
          />
          <p className="font-serif text-base font-medium text-celuloide tracking-[-0.01em] overflow-hidden text-ellipsis whitespace-nowrap">
            {session.movie_title}
          </p>
          <span className="font-mono text-[10px] text-gray-dark ml-auto shrink-0">
            {dateStr}
          </span>
        </div>
        <p className="font-sans text-[12px] leading-[1.5] text-gray-mid overflow-hidden text-ellipsis whitespace-nowrap max-w-full mb-2">
          {isActive ? 'Sesión activa — en curso' : 'Sesión cerrada'}
        </p>
        {session.has_tags ? (
          <div className="flex gap-[6px] flex-wrap">
            <span className="lumen-chip-teal text-[10px] px-2 py-[2px]">Con etiquetas</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface SessionDetailProps {
  session: SessionSummary
  onClose: () => void
  onResume: () => void
  onDelete: () => void
}

function SessionDetail({ session, onClose, onResume, onDelete }: SessionDetailProps): React.ReactElement {
  const isActive: boolean = session.status === 'active'

  return (
    <div
      className="w-[380px] shrink-0 border-l-[0.4px] border-borde flex flex-col overflow-hidden"
      style={{ animation: 'slide-in-detail 0.22s ease both' }}
    >
      <style>{`@keyframes slide-in-detail { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <div className="px-[22px] pt-5 pb-4 border-b-[0.4px] border-borde shrink-0">
        <div className="flex justify-between items-start mb-[10px]">
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[18px] font-medium text-celuloide leading-[1.15] mb-1">
              {session.movie_title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="bg-transparent border-none text-gray-mid cursor-pointer p-1 shrink-0 ml-2 hover:text-celuloide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex justify-between items-center">
          <span
            className={`font-mono text-[9.5px] uppercase tracking-[0.08em] ${
              isActive ? 'text-amber' : 'text-gray-mid'
            }`}
          >
            {isActive ? 'En curso' : 'Cerrada'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] py-4 flex flex-col gap-4">
        <p className="font-sans text-[12.5px] text-gray-dark italic leading-[1.6]">
          {isActive
            ? 'Esta sesión sigue abierta. Retómala cuando quieras.'
            : 'El análisis está cerrado. Puedes ver el historial o iniciar una nueva sesión.'}
        </p>
      </div>

      <div className="px-[22px] py-[14px] border-t-[0.4px] border-borde flex gap-2 shrink-0">
        {isActive ? (
          <button
            type="button"
            onClick={onResume}
            className="lumen-btn-primary text-[12px] py-2 px-4 flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            Retomar sesión
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onResume}
              className="lumen-btn-secondary text-[12px] py-2 px-[14px] flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            >
              Nueva sesión
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="lumen-btn-secondary text-[12px] py-2 px-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            >
              Eliminar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

type HistoryFilter = 'Todos' | 'Activas' | 'Cerradas'

export default function HistoryPage(): React.ReactElement {
  const navigate = useNavigate()
  const sessionsQuery = useSessionsQuery()
  const deleteMutation = useDeleteSessionMutation()

  const [filter, setFilter] = useState<HistoryFilter>('Todos')
  const [selected, setSelected] = useState<SessionSummary | null>(null)

  const sessions: SessionSummary[] = useMemo(() => {
    const data: SessionSummary[] = sessionsQuery.data ?? []
    return [...data].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )
  }, [sessionsQuery.data])

  function handleDelete(session: SessionSummary): void {
    const confirmed: boolean = window.confirm(
      '¿Eliminar esta sesión? Esta acción no se puede deshacer.',
    )
    if (!confirmed) return
    deleteMutation.mutate(session.id, {
      onSuccess: () => {
        if (selected?.id === session.id) setSelected(null)
      },
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

  function handleRowClick(s: SessionSummary): void {
    setSelected((prev) => (prev?.id === s.id ? null : s))
  }

  if (sessionsQuery.isPending) {
    return (
      <div className="flex-1 px-11 py-9 overflow-y-auto">
        <div className="h-9 w-[200px] bg-pantalla rounded-[4px] mb-6 animate-pulse" />
        <div className="flex flex-col">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[88px] bg-pantalla-soft border-b-[0.4px] border-borde animate-pulse"
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
          Aquí vivirán tus conversaciones. La primera dice mucho.
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
      {/* Header */}
      <div className="lumen-anim-1 px-11 pt-9 shrink-0">
        <h1 className="font-serif text-[30px] font-medium text-celuloide tracking-[-0.02em] mb-[6px]">
          Análisis
        </h1>
        <p className="font-sans text-[13.5px] text-gray-mid mb-5">
          Cada conversación construye algo.
        </p>
        <div className="lumen-anim-2 flex gap-[7px] pb-[18px] border-b-[0.4px] border-borde flex-wrap items-center">
          {(['Todos', 'Activas', 'Cerradas'] as HistoryFilter[]).map((f) => {
            const active: boolean = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFilter(f)
                  setSelected(null)
                }}
                aria-pressed={active}
                className={`rounded-[4px] font-sans text-[12px] px-3 py-[5px] cursor-pointer transition-colors border-[0.4px] select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
                  active
                    ? 'bg-[rgba(250,199,117,0.08)] border-amber text-celuloide'
                    : 'bg-transparent border-borde text-gray-mid hover:border-borde-soft'
                }`}
              >
                {f}
              </button>
            )
          })}
          <span className="font-mono text-[10px] text-gray-mid ml-auto tracking-[0.06em]">
            {filtered.length} sesión{filtered.length !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      {/* Content row */}
      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-11 pt-12">
              <p className="font-sans text-[13px] text-gray-dark leading-[1.6]">
                Ninguna sesión coincide con el filtro seleccionado.
              </p>
            </div>
          ) : (
            <div className="px-11">
              {filtered.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  isSelected={selected?.id === s.id}
                  onClick={() => {
                    handleRowClick(s)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected !== null ? (
          <SessionDetail
            session={selected}
            onClose={() => {
              setSelected(null)
            }}
            onResume={() => {
              if (selected.status === 'active') {
                navigate(`/analysis/${selected.id}`)
              } else {
                navigate(`/library`)
              }
            }}
            onDelete={() => {
              handleDelete(selected)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
