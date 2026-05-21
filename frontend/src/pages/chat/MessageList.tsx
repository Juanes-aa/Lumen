import { useEffect, useRef } from 'react'
import Poster from '../../components/ui/Poster'
import MessageBubble, { renderParagraphs } from './MessageBubble'
import StreamingIndicator from './StreamingIndicator'
import SuggestionChips from './SuggestionChips'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { ChatMessage } from './useChatStream'
import type { SessionSummary } from '../../types/analysis'

interface MessageListProps {
  messages: ChatMessage[]
  streamingContent: string
  isStreaming: boolean
  isLoadingHistory: boolean
  isClosed: boolean
  session: SessionSummary | null
  suggestions: string[]
  usedSuggestions: Set<string>
  isLoadingSuggestions: boolean
  onPickSuggestion: (s: string) => void
}

export default function MessageList({
  messages,
  streamingContent,
  isStreaming,
  isLoadingHistory,
  isClosed,
  session,
  suggestions,
  usedSuggestions,
  isLoadingSuggestions,
  onPickSuggestion,
}: MessageListProps): React.ReactElement {
  const endRef = useRef<HTMLDivElement | null>(null)
  const isMobile = useIsMobile()
  const px = isMobile ? '16px' : '40px'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const isEmpty: boolean = messages.length === 0 && !isStreaming

  if (isLoadingHistory) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: `20px ${px}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[0, 1].map((i) => (
          <div key={i} className="rounded-[10px] bg-pantalla-soft border-[0.4px] border-borde animate-pulse" style={{ height: 60 }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: `20px ${px} 16px`, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Empty state with film context + suggestions */}
      {isEmpty ? (
        <div className="lumen-fade-in" style={{ marginTop: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40, paddingBottom: 24, borderBottom: '0.4px solid #2E2D2B' }}>
            <Poster
              url={session?.movie_poster_url ?? null}
              alt={session?.movie_title ?? 'Película'}
              width={54}
              height={80}
            />
            <div>
              <p className="font-serif italic text-celuloide" style={{ fontSize: 22, fontWeight: 400, marginBottom: 6 }}>
                {session?.movie_title ?? '—'}
              </p>
              <p className="font-mono text-gray-mid" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
                Sesión activa
              </p>
            </div>
          </div>

          <div>
            <p className="lumen-overline" style={{ marginBottom: 14 }}>Por dónde empezar</p>
            <SuggestionChips
              suggestions={suggestions}
              usedSuggestions={usedSuggestions}
              isLoading={isLoadingSuggestions}
              onPick={onPickSuggestion}
            />
            <p className="font-sans text-gray-dark" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
              O escribe directamente. Las sugerencias son opcionales.
            </p>
          </div>
        </div>
      ) : null}

      {/* Messages */}
      {messages.length > 0 ? (
        <>
          {messages.length === 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5 }}>
              <Poster
                url={session?.movie_poster_url ?? null}
                alt={session?.movie_title ?? 'Película'}
                width={28}
                height={42}
              />
              <div>
                <p className="font-serif text-celuloide" style={{ fontSize: 14 }}>
                  {session?.movie_title ?? '—'}
                </p>
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </>
      ) : null}

      {/* Streaming bubble */}
      {isStreaming ? (
        <div className="lumen-msg-enter" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: isMobile ? '92%' : '68%' }}>
          <span className="font-mono text-[11px] text-gray-mid tracking-[0.06em]">Lumen</span>
          <div className="border-l-2 border-amber" style={{ paddingLeft: 20 }}>
            {streamingContent !== '' ? (
              renderParagraphs(streamingContent, true)
            ) : (
              <StreamingIndicator />
            )}
          </div>
        </div>
      ) : null}

      {isClosed && messages.length > 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '0.4px solid #2E2D2B', marginTop: 8 }}>
          <p className="font-mono text-gray-dark" style={{ fontSize: 10.5, letterSpacing: '0.06em' }}>Sesión cerrada</p>
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  )
}
