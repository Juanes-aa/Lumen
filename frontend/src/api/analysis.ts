import type {
  SessionSummary,
  AnalysisMessage,
  AnalysisSession,
  StreamEvent,
} from '../types/analysis'
import { apiFetch, apiFetchRaw } from './client'

interface SessionsResponse {
  sessions: SessionSummary[]
  total: number
}

interface MessagesResponse {
  session_id: string
  messages: AnalysisMessage[]
}

export async function getSessions(token: string): Promise<SessionSummary[]> {
  const result = await apiFetch<SessionsResponse>(
    '/analysis/sessions',
    { method: 'GET' },
    { token },
  )
  return result.sessions
}

export async function getSessionMessages(
  sessionId: string,
  token: string,
): Promise<AnalysisMessage[]> {
  const result = await apiFetch<MessagesResponse>(
    `/analysis/sessions/${sessionId}/messages`,
    { method: 'GET' },
    { token },
  )
  return result.messages
}

export async function createSession(
  watchedMovieId: string,
  token: string,
): Promise<AnalysisSession> {
  return apiFetch<AnalysisSession>(
    '/analysis/sessions',
    { method: 'POST', body: { watched_movie_id: watchedMovieId } },
    { token },
  )
}

export async function closeSession(sessionId: string, token: string): Promise<void> {
  await apiFetch<void>(
    `/analysis/sessions/${sessionId}/close`,
    { method: 'PATCH' },
    { token },
  )
}

export async function getSuggestions(
  sessionId: string,
  token: string,
): Promise<string[]> {
  const result = await apiFetch<{ suggestions: string[] }>(
    `/analysis/sessions/${sessionId}/suggestions`,
    { method: 'GET' },
    { token },
  )
  return result.suggestions
}

export async function streamMessage(
  sessionId: string,
  content: string,
  token: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response: Response = await apiFetchRaw(
    `/analysis/sessions/${sessionId}/messages/stream`,
    { method: 'POST', body: { content } },
    { token, signal },
  )

  if (response.body === null) {
    throw new Error(`Error al enviar mensaje: respuesta sin cuerpo`)
  }

  const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader()
  const decoder: TextDecoder = new TextDecoder()
  let buffer: string = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let separatorIndex: number = buffer.indexOf('\n\n')
    while (separatorIndex !== -1) {
      const rawEvent: string = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)

      const dataLine: string | undefined = rawEvent
        .split('\n')
        .find((line) => line.startsWith('data: '))

      if (dataLine !== undefined) {
        const payload: string = dataLine.slice(6)
        try {
          const parsed: StreamEvent = JSON.parse(payload) as StreamEvent
          onEvent(parsed)
        } catch {
          // skip malformed event
        }
      }

      separatorIndex = buffer.indexOf('\n\n')
    }
  }
}

export async function deleteSession(sessionId: string, token: string): Promise<void> {
  await apiFetch<void>(
    `/analysis/sessions/${sessionId}`,
    { method: 'DELETE' },
    { token },
  )
}
