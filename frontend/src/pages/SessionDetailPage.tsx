import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getSessionMessages, getSessions } from '../api/analysis'
import type { AnalysisMessage, SessionSummary } from '../types/analysis'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
})

function renderParagraphs(text: string): React.ReactNode {
  const paragraphs: string[] = text.split('\n\n')
  return paragraphs.map((para, i) => (
    <p
      key={i}
      className={`font-sans text-[13.5px] text-celuloide leading-[1.75] ${i < paragraphs.length - 1 ? 'mb-3' : ''}`}
    >
      {para}
    </p>
  ))
}

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const token = useAuthStore((s) => s.access_token)
  const navigate = useNavigate()

  const [messages, setMessages] = useState<AnalysisMessage[]>([])
  const [session, setSession] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState<number>(0)

  useEffect(() => {
    async function fetchData(): Promise<void> {
      if (!token || !sessionId) return
      try {
        setLoading(true)
        setError(null)
        const [messagesData, sessionsData] = await Promise.all([
          getSessionMessages(sessionId, token),
          getSessions(token),
        ])
        setMessages(messagesData)
        const current = sessionsData.find((s) => s.id === sessionId) ?? null
        if (current !== null) setSession(current)
      } catch {
        setError('Error al cargar la conversación.')
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [token, sessionId, fetchTrigger])

  if (loading) {
    return (
      <div className="flex-1 px-11 py-7 overflow-y-auto">
        <div className="h-4 w-[140px] bg-pantalla rounded-[4px] mb-6 animate-pulse" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[70px] bg-pantalla-soft border-[0.4px] border-borde rounded-[10px] animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className="flex-1 px-11 py-7">
        <button
          type="button"
          onClick={() => { navigate('/history') }}
          className="lumen-btn-ghost mb-4"
        >
          ← Volver al historial
        </button>
        <p role="alert" className="text-warn mb-4">{error}</p>
        <button
          type="button"
          className="lumen-btn-primary"
          onClick={() => { setFetchTrigger((n) => n + 1) }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  const isActive: boolean = session?.status === 'active'

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="lumen-anim-1 px-11 py-5 border-b-[0.4px] border-borde shrink-0 flex items-center gap-[14px]">
        <button
          type="button"
          onClick={() => { navigate('/history') }}
          className="inline-flex items-center gap-[6px] bg-transparent border-none text-gray-mid font-sans text-[12px] cursor-pointer p-0 transition-colors hover:text-celuloide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Historial
        </button>

        {session !== null ? (
          <>
            <span className="text-gray-dark text-[12px]">·</span>
            <p className="font-serif text-[18px] font-medium text-celuloide tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis max-w-[360px]">
              {session.movie_title}
            </p>
            <span className="font-mono text-[10px] text-gray-mid tracking-[0.06em]">
              {dateFormatter.format(new Date(session.started_at))}
            </span>
            <span
              className={`ml-auto inline-flex items-center gap-[5px] rounded-[4px] px-[7px] py-[2px] border-[0.4px] ${
                isActive
                  ? 'bg-teal-dark border-[rgba(29,158,117,0.25)]'
                  : 'bg-pantalla border-borde'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-[5px] h-[5px] rounded-full inline-block ${isActive ? 'bg-teal' : 'bg-gray-mid'}`}
              />
              <span
                className={`font-mono text-[9.5px] tracking-[0.06em] uppercase ${isActive ? 'text-teal' : 'text-gray-mid'}`}
              >
                {isActive ? 'Activa' : 'Cerrada'}
              </span>
            </span>
            {isActive ? (
              <button
                type="button"
                className="lumen-btn-primary sm"
                onClick={() => { navigate(`/analysis/${session.id}`) }}
              >
                Retomar
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Messages */}
      <div className="lumen-anim-2 flex-1 px-11 py-7 flex flex-col gap-7 max-w-[880px] w-full mx-auto">
        {messages.length === 0 ? (
          <p className="font-serif italic text-base text-gray-mid text-center py-10">
            Esta sesión no tiene mensajes todavía.
          </p>
        ) : (
          messages.map((m) => {
            if (m.role === 'user') {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[62%] bg-pantalla border-[0.4px] border-borde rounded-[10px_10px_2px_10px] px-[14px] py-[10px]">
                    <p className="font-sans text-[13px] text-celuloide leading-[1.65] whitespace-pre-wrap">
                      {m.content}
                    </p>
                    <p className="font-mono text-[9.5px] text-gray-dark tracking-[0.05em] mt-[6px] text-right">
                      {timeFormatter.format(new Date(m.created_at))}
                    </p>
                  </div>
                </div>
              )
            }
            return (
              <div key={m.id} className="flex flex-col gap-[6px] max-w-[68%]">
                <span className="font-mono text-[11px] text-gray-mid tracking-[0.06em]">Lumen</span>
                <div className="border-l-2 border-amber pl-[14px]">
                  {renderParagraphs(m.content)}
                </div>
                <span className="font-mono text-[9.5px] text-gray-dark tracking-[0.05em] mt-1">
                  {timeFormatter.format(new Date(m.created_at))}
                </span>
              </div>
            )
          })
        )}

        {session?.has_tags === true ? (
          <div className="lumen-section mt-4">
            <span className="lumen-overline mb-[10px]">Etiquetas extraídas</span>
            <p className="font-sans text-[12.5px] text-gray-mid leading-[1.6]">
              Las etiquetas semánticas alimentan tu perfil. Vélas en{' '}
              <button
                type="button"
                onClick={() => { navigate('/profile') }}
                className="bg-transparent border-none text-amber font-sans text-[12.5px] cursor-pointer p-0 underline underline-offset-[2px]"
              >
                tu perfil
              </button>
              .
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
