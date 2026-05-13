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
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13.5,
        color: '#FAF9F6',
        lineHeight: 1.75,
        marginBottom: i < paragraphs.length - 1 ? 12 : 0,
      }}
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
      <div style={{ flex: 1, padding: '28px 44px', overflowY: 'auto' }}>
        <div style={{ height: 16, width: 140, background: '#252421', borderRadius: 4, marginBottom: 24 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 70,
                background: '#1E1D1B',
                border: '0.4px solid #2E2D2B',
                borderRadius: 10,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div style={{ flex: 1, padding: '28px 44px' }}>
        <button
          type="button"
          onClick={() => {
            navigate('/history')
          }}
          className="lumen-btn-ghost"
          style={{ marginBottom: 16 }}
        >
          ← Volver al historial
        </button>
        <p style={{ color: '#E24B4A', marginBottom: 16 }}>{error}</p>
        <button
          type="button"
          className="lumen-btn-primary"
          onClick={() => {
            setFetchTrigger((n) => n + 1)
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  const isActive: boolean = session?.status === 'active'

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div
        className="lumen-anim-1"
        style={{
          padding: '20px 44px',
          borderBottom: '0.4px solid #2E2D2B',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <button
          type="button"
          onClick={() => {
            navigate('/history')
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888780',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FAF9F6'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#888780'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Historial
        </button>

        {session !== null && (
          <>
            <span style={{ color: '#444441', fontSize: 12 }}>·</span>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18,
                fontWeight: 500,
                color: '#FAF9F6',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 360,
              }}
            >
              {session.movie_title}
            </p>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: '#888780',
                letterSpacing: '0.06em',
              }}
            >
              {dateFormatter.format(new Date(session.started_at))}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: isActive ? '#04342C' : '#252421',
                border: `0.4px solid ${isActive ? 'rgba(29, 158, 117, 0.25)' : '#2E2D2B'}`,
                borderRadius: 4,
                padding: '2px 7px',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: isActive ? '#1D9E75' : '#888780',
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 9.5,
                  color: isActive ? '#1D9E75' : '#888780',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {isActive ? 'Activa' : 'Cerrada'}
              </span>
            </span>
            {isActive && (
              <button
                type="button"
                className="lumen-btn-primary sm"
                onClick={() => {
                  navigate(`/analysis/${session.id}`)
                }}
              >
                Retomar
              </button>
            )}
          </>
        )}
      </div>

      <div
        className="lumen-anim-2"
        style={{
          flex: 1,
          padding: '28px 44px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          maxWidth: 880,
          width: '100%',
          marginInline: 'auto',
        }}
      >
        {messages.length === 0 ? (
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic',
              fontSize: 16,
              color: '#888780',
              textAlign: 'center',
              padding: '40px 0',
            }}
          >
            Esta sesión no tiene mensajes todavía.
          </p>
        ) : (
          messages.map((m) => {
            if (m.role === 'user') {
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      maxWidth: '62%',
                      background: '#252421',
                      border: '0.4px solid #2E2D2B',
                      borderRadius: '10px 10px 2px 10px',
                      padding: '10px 14px',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: '#FAF9F6',
                        lineHeight: 1.65,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {m.content}
                    </p>
                    <p
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 9.5,
                        color: '#444441',
                        letterSpacing: '0.05em',
                        marginTop: 6,
                        textAlign: 'right',
                      }}
                    >
                      {timeFormatter.format(new Date(m.created_at))}
                    </p>
                  </div>
                </div>
              )
            }
            return (
              <div
                key={m.id}
                style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '68%' }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: '#888780',
                    letterSpacing: '0.06em',
                  }}
                >
                  Lumen
                </span>
                <div style={{ borderLeft: '2px solid #FAC775', paddingLeft: 14 }}>
                  {renderParagraphs(m.content)}
                </div>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9.5,
                    color: '#444441',
                    letterSpacing: '0.05em',
                    marginTop: 4,
                  }}
                >
                  {timeFormatter.format(new Date(m.created_at))}
                </span>
              </div>
            )
          })
        )}

        {session?.has_tags === true && (
          <div className="lumen-section" style={{ marginTop: 16 }}>
            <span className="lumen-overline" style={{ marginBottom: 10 }}>
              Etiquetas extraídas
            </span>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12.5,
                color: '#888780',
                lineHeight: 1.6,
              }}
            >
              Las etiquetas semánticas alimentan tu perfil. Velas en{' '}
              <button
                type="button"
                onClick={() => {
                  navigate('/profile')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FAC775',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                tu perfil
              </button>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
