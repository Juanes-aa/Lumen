import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getSessionMessages, getSessions, getSuggestions } from '../api/analysis'
import {
  useCloseSessionMutation,
} from '../api/queries'
import Button from '../components/ui/Button'
import ChatHeader from './chat/ChatHeader'
import MessageList from './chat/MessageList'
import Composer from './chat/Composer'
import { useChatStream, fromApi } from './chat/useChatStream'
import type { SessionSummary } from '../types/analysis'

export default function AnalysisChatPage(): React.ReactElement {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.access_token)

  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set())
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false)
  const [session, setSession] = useState<SessionSummary | null>(null)

  const stream = useChatStream(sessionId)
  const closeMutation = useCloseSessionMutation()

  useEffect(() => {
    let cancelled: boolean = false
    async function load(): Promise<void> {
      if (token === null || token === '' || sessionId === undefined) return
      try {
        setIsLoadingHistory(true)
        const [history, allSessions] = await Promise.all([
          getSessionMessages(sessionId, token),
          getSessions(token).catch(() => []),
        ])
        if (cancelled) return
        stream.setMessages(fromApi(history))
        const found = allSessions.find((s) => s.id === sessionId) ?? null
        setSession(found)

        if (history.length === 0 && (found === null || found.status === 'active')) {
          setIsLoadingSuggestions(true)
          try {
            const sugs = await getSuggestions(sessionId, token)
            if (!cancelled) setSuggestions(sugs)
          } catch {
            if (!cancelled) setSuggestions([])
          } finally {
            if (!cancelled) setIsLoadingSuggestions(false)
          }
        }
      } catch {
        if (!cancelled) setLoadError('Error al cargar la sesión.')
      } finally {
        if (!cancelled) setIsLoadingHistory(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sessionId])

  function handleSend(content: string): void {
    setSuggestions([])
    setUsedSuggestions((prev) => new Set([...prev, content.trim()]))
    void stream.send(content)
  }

  function handleConfirmClose(): void {
    if (sessionId === undefined) return
    closeMutation.mutate(sessionId, {
      onSuccess: () => {
        navigate(`/history/${sessionId}`)
      },
    })
  }

  const isClosed: boolean = session?.status === 'closed'
  const error: string | null =
    loadError !== null
      ? loadError
      : stream.error !== null
        ? stream.error
        : closeMutation.isError
          ? 'No se pudo cerrar la sesión.'
          : null

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <ChatHeader
        session={session}
        messagesCount={stream.messages.length}
        isStreaming={stream.isStreaming}
        isClosing={closeMutation.isPending}
        onConfirmClose={handleConfirmClose}
      />

      <MessageList
        messages={stream.messages}
        streamingContent={stream.streamingContent}
        isStreaming={stream.isStreaming}
        isLoadingHistory={isLoadingHistory}
        isClosed={isClosed}
        session={session}
        suggestions={suggestions}
        usedSuggestions={usedSuggestions}
        isLoadingSuggestions={isLoadingSuggestions}
        onPickSuggestion={handleSend}
      />

      {/* Input area */}
      <div
        className={`px-10 pt-4 pb-5 shrink-0 ${
          stream.messages.length > 0 ? 'border-t-[0.4px] border-borde' : ''
        }`}
      >
        {error !== null ? (
          <p className="font-sans text-xs text-warn mb-2">{error}</p>
        ) : null}

        {isClosed ? (
          <div className="text-center py-2">
            <p className="font-serif italic text-base text-gray-mid">
              Esta conversación está cerrada.
            </p>
            <Button
              className="mt-[10px]"
              onClick={() => {
                navigate('/library')
              }}
            >
              Ir a biblioteca
            </Button>
          </div>
        ) : (
          <Composer
            disabled={stream.isStreaming || isClosed}
            isStreaming={stream.isStreaming}
            onSend={handleSend}
          />
        )}
      </div>
    </div>
  )
}
