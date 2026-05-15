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
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir sesión: ${session.movie_title}`}
      className={`group border-b-[0.4px] border-borde cursor-pointer transition-colors hover:bg-pantalla first:border-t-[0.4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${isSelected ? 'bg-pantalla' : ''}`}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px' }}
    >
      <Poster url={session.movie_poster_url} alt={session.movie_title} width={44} height={66} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span
            aria-hidden="true"
            className={`rounded-full ${isActive ? 'bg-amber shadow-[0_0_5px_rgba(250,199,117,0.6)]' : 'bg-teal'}`}
            style={{ width: 6, height: 6, flexShrink: 0 }}
          />
          <p className="font-serif text-celuloide" style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.movie_title}
          </p>
          <span className="font-mono text-gray-dark" style={{ fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>
            {dateStr}
          </span>
        </div>
        <p className="font-sans text-gray-mid" style={{ fontSize: 12, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
          {isActive ? 'Sesión activa — en curso' : 'Sesión cerrada'}
        </p>
        {session.has_tags ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="lumen-chip-teal" style={{ fontSize: 10, padding: '2px 8px' }}>Con etiquetas</span>
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
      className="border-l-[0.4px] border-borde"
      style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slide-in-detail 0.22s ease both' }}
    >
      <style>{`@keyframes slide-in-detail { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }`}</style>

      <div className="border-b-[0.4px] border-borde" style={{ padding: '20px 22px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="font-serif text-celuloide" style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.15, marginBottom: 4 }}>
              {session.movie_title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="bg-transparent border-none text-gray-mid cursor-pointer hover:text-celuloide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
            style={{ padding: 4, flexShrink: 0, marginLeft: 8 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <span className={`font-mono uppercase ${isActive ? 'text-amber' : 'text-gray-mid'}`} style={{ fontSize: 9.5, letterSpacing: '0.08em' }}>
          {isActive ? 'En curso' : 'Cerrada'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="font-sans text-gray-dark italic" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
          {isActive
            ? 'Esta sesión sigue abierta. Retómala cuando quieras.'
            : 'El análisis está cerrado. Puedes ver el historial o iniciar una nueva sesión.'}
        </p>
      </div>

      <div className="border-t-[0.4px] border-borde" style={{ padding: '14px 22px', display: 'flex', gap: 8, flexShrink: 0 }}>
        {isActive ? (
          <button
            type="button"
            onClick={onResume}
            className="lumen-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            style={{ fontSize: 12, flex: 1 }}
          >
            Retomar sesión
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onResume}
              className="lumen-btn-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
              style={{ fontSize: 12, flex: 1 }}
            >
              Nueva sesión
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="lumen-btn-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
              style={{ fontSize: 12 }}
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
      <div style={{ flex: 1, padding: '36px 44px', overflowY: 'auto' }}>
        <div style={{ height: 36, width: 200, background: '#252421', borderRadius: 4, marginBottom: 24 }} className="animate-pulse" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-pantalla-soft border-b-[0.4px] border-borde animate-pulse" style={{ height: 88 }} />
          ))}
        </div>
      </div>
    )
  }

  if (sessionsQuery.isError) {
    return (
      <div style={{ flex: 1, padding: '36px 44px' }}>
        <h1 className="font-serif text-celuloide" style={{ fontSize: 30, marginBottom: 12 }}>Análisis</h1>
        <p role="alert" className="font-sans text-warn" style={{ marginBottom: 16 }}>Error al cargar el historial.</p>
        <Button onClick={() => { void sessionsQuery.refetch() }}>Reintentar</Button>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 44px', gap: 20 }}>
        <p className="font-serif italic text-celuloide" style={{ fontSize: 22, textAlign: 'center', maxWidth: 460, lineHeight: 1.4 }}>
          Aquí vivirán tus conversaciones. La primera dice mucho.
        </p>
        <Button onClick={() => { navigate('/library') }}>Ir a tu biblioteca</Button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div className="lumen-anim-1" style={{ padding: '36px 44px 0', flexShrink: 0 }}>
        <h1 className="font-serif text-celuloide" style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Análisis
        </h1>
        <p className="font-sans text-gray-mid" style={{ fontSize: 13.5, marginBottom: 20 }}>
          Cada conversación construye algo.
        </p>
        <div className="lumen-anim-2" style={{ display: 'flex', gap: 7, paddingBottom: 18, borderBottom: '0.4px solid #2E2D2B', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['Todos', 'Activas', 'Cerradas'] as HistoryFilter[]).map((f) => {
            const active: boolean = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => { setFilter(f); setSelected(null) }}
                aria-pressed={active}
                className={`rounded-[4px] font-sans cursor-pointer transition-colors border-[0.4px] select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
                  active
                    ? 'bg-[rgba(250,199,117,0.08)] border-amber text-celuloide'
                    : 'bg-transparent border-borde text-gray-mid hover:border-borde-soft'
                }`}
                style={{ fontSize: 12, padding: '5px 12px' }}
              >
                {f}
              </button>
            )
          })}
          <span className="font-mono text-gray-mid" style={{ fontSize: 10, marginLeft: 'auto', letterSpacing: '0.06em' }}>
            {filtered.length} sesión{filtered.length !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      {/* Content row */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 44px 0' }}>
              <p className="font-sans text-gray-dark" style={{ fontSize: 13, lineHeight: 1.6 }}>
                Ninguna sesión coincide con el filtro seleccionado.
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  isSelected={selected?.id === s.id}
                  onClick={() => { handleRowClick(s) }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected !== null ? (
          <SessionDetail
            session={selected}
            onClose={() => { setSelected(null) }}
            onResume={() => {
              if (selected.status === 'active') navigate(`/analysis/${selected.id}`)
              else navigate('/library')
            }}
            onDelete={() => { handleDelete(selected) }}
          />
        ) : null}
      </div>
    </div>
  )
}
