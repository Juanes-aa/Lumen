export interface SessionSummary {
  id: string
  movie_id: string
  movie_title: string
  movie_poster_url: string | null
  status: 'active' | 'closed'
  started_at: string
  closed_at: string | null
  has_tags: boolean
}

export interface AnalysisMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface SemanticTag {
  id: string
  session_id: string
  tag_type: string
  tag_value: string
  confidence: number | null
}

export interface AnalysisSession {
  id: string
  user_id: string
  watched_movie_id: string
  movie_title: string
  tmdb_id: number
  poster_url: string | null
  status: 'active' | 'closed'
  started_at: string
  closed_at: string | null
}

export interface StreamTokenEvent {
  token: string
}

export interface StreamDoneEvent {
  done: true
  message_id: string
}

export interface StreamErrorEvent {
  error: string
}

export type StreamEvent = StreamTokenEvent | StreamDoneEvent | StreamErrorEvent
