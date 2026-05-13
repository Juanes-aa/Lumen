import { useState } from 'react'
import { streamMessage } from '../../api/analysis'
import { useAuthStore } from '../../stores/authStore'
import type { AnalysisMessage } from '../../types/analysis'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function fromApi(messages: AnalysisMessage[]): ChatMessage[] {
  return messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
}

export interface UseChatStreamResult {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  streamingContent: string
  isStreaming: boolean
  error: string | null
  resetError: () => void
  send: (content: string) => Promise<void>
}

export function useChatStream(
  sessionId: string | undefined,
  initialMessages: ChatMessage[] = [],
): UseChatStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  async function send(content: string): Promise<void> {
    const token: string | null = useAuthStore.getState().access_token
    if (token === null || token === '' || sessionId === undefined || isStreaming) return
    const trimmed: string = content.trim()
    if (trimmed === '') return

    setError(null)

    const optimisticUser: ChatMessage = {
      id: `user-${Date.now().toString()}`,
      role: 'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, optimisticUser])

    setIsStreaming(true)
    setStreamingContent('')
    let accumulated: string = ''
    let finalId: string | null = null
    let streamError: string | null = null

    try {
      await streamMessage(sessionId, trimmed, token, (event) => {
        if ('token' in event) {
          accumulated += event.token
          setStreamingContent(accumulated)
        } else if ('done' in event) {
          finalId = event.message_id
        } else if ('error' in event) {
          streamError = event.error
        }
      })
    } catch {
      streamError = 'Error de conexión durante el streaming.'
    }

    if (streamError !== null && accumulated === '') {
      setError(streamError)
      setIsStreaming(false)
      setStreamingContent('')
      return
    }

    setMessages((prev) => [
      ...prev,
      {
        id: finalId ?? `assistant-${Date.now().toString()}`,
        role: 'assistant',
        content: accumulated,
      },
    ])
    setStreamingContent('')
    setIsStreaming(false)
  }

  return {
    messages,
    setMessages,
    streamingContent,
    isStreaming,
    error,
    resetError: () => {
      setError(null)
    },
    send,
  }
}
