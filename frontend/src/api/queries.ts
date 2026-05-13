import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import {
  addWatchedMovie,
  deleteWatchedMovie,
  getWatchedMovies,
} from './library'
import {
  closeSession,
  createSession,
  deleteSession,
  getSessionMessages,
  getSessions,
  getSuggestions,
} from './analysis'
import {
  addMemoryNote,
  deleteMemoryNote,
  getInstructions,
  getMemoryNotes,
  getPreferences,
  getSemanticProfile,
  updateInstructions,
  updatePreferences,
} from './profile'
import {
  dismissRecommendation,
  generateRecommendations,
  getRecommendations,
} from './recommendations'
import type {
  WatchedMovie,
  WatchedMoviePayload,
} from '../types/library'
import type {
  AnalysisMessage,
  AnalysisSession,
  SessionSummary,
} from '../types/analysis'
import type {
  MemoryNote,
  SemanticProfile,
  UserInstructions,
  UserPreferences,
} from '../types/profile'
import type {
  GenerateRecommendationsResponse,
  RecommendationOut,
} from '../types/recommendations'

/* ─── Query keys ──────────────────────────────────────────── */

export const queryKeys = {
  watched: ['watched'] as const,
  sessions: ['sessions'] as const,
  sessionMessages: (id: string) => ['sessions', id, 'messages'] as const,
  sessionSuggestions: (id: string) => ['sessions', id, 'suggestions'] as const,
  recommendations: ['recommendations'] as const,
  semanticProfile: ['profile', 'semantic'] as const,
  preferences: ['profile', 'preferences'] as const,
  instructions: ['profile', 'instructions'] as const,
  memoryNotes: ['profile', 'memory'] as const,
}

/* ─── Helpers ─────────────────────────────────────────────── */

function requireToken(): string {
  const token: string | null = useAuthStore.getState().access_token
  if (token === null || token === '') {
    throw new Error('No hay sesión activa.')
  }
  return token
}

function useToken(): string | null {
  return useAuthStore((s) => s.access_token)
}

/* ─── Queries ─────────────────────────────────────────────── */

export function useWatchedMoviesQuery(): UseQueryResult<WatchedMovie[]> {
  const token: string | null = useToken()
  return useQuery({
    queryKey: queryKeys.watched,
    queryFn: () => getWatchedMovies(requireToken()),
    enabled: token !== null && token !== '',
  })
}

export function useSessionsQuery(): UseQueryResult<SessionSummary[]> {
  const token: string | null = useToken()
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => getSessions(requireToken()),
    enabled: token !== null && token !== '',
  })
}

export function useSessionMessagesQuery(
  sessionId: string | undefined,
): UseQueryResult<AnalysisMessage[]> {
  const token: string | null = useToken()
  return useQuery({
    queryKey: sessionId !== undefined ? queryKeys.sessionMessages(sessionId) : ['sessions', 'noop', 'messages'],
    queryFn: () => getSessionMessages(sessionId as string, requireToken()),
    enabled: sessionId !== undefined && token !== null && token !== '',
  })
}

export function useSessionSuggestionsQuery(
  sessionId: string | undefined,
  enabled: boolean = true,
): UseQueryResult<string[]> {
  const token: string | null = useToken()
  return useQuery({
    queryKey:
      sessionId !== undefined
        ? queryKeys.sessionSuggestions(sessionId)
        : ['sessions', 'noop', 'suggestions'],
    queryFn: () => getSuggestions(sessionId as string, requireToken()),
    enabled: enabled && sessionId !== undefined && token !== null && token !== '',
  })
}

export function useRecommendationsQuery(): UseQueryResult<RecommendationOut[]> {
  const token: string | null = useToken()
  return useQuery({
    queryKey: queryKeys.recommendations,
    queryFn: () => getRecommendations(requireToken()),
    enabled: token !== null && token !== '',
  })
}

export function useSemanticProfileQuery(): UseQueryResult<SemanticProfile> {
  const token: string | null = useToken()
  return useQuery({
    queryKey: queryKeys.semanticProfile,
    queryFn: () => getSemanticProfile(requireToken()),
    enabled: token !== null && token !== '',
  })
}

export function usePreferencesQuery(): UseQueryResult<UserPreferences> {
  const token: string | null = useToken()
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => getPreferences(requireToken()),
    enabled: token !== null && token !== '',
  })
}

export function useInstructionsQuery(): UseQueryResult<UserInstructions> {
  const token: string | null = useToken()
  return useQuery({
    queryKey: queryKeys.instructions,
    queryFn: () => getInstructions(requireToken()),
    enabled: token !== null && token !== '',
  })
}

export function useMemoryNotesQuery(): UseQueryResult<MemoryNote[]> {
  const token: string | null = useToken()
  return useQuery({
    queryKey: queryKeys.memoryNotes,
    queryFn: () => getMemoryNotes(requireToken()),
    enabled: token !== null && token !== '',
  })
}

/* ─── Mutations ───────────────────────────────────────────── */

export function useAddWatchedMutation(): UseMutationResult<
  WatchedMovie,
  Error,
  WatchedMoviePayload
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: WatchedMoviePayload) => addWatchedMovie(requireToken(), payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.watched })
    },
  })
}

export function useDeleteWatchedMutation(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWatchedMovie(requireToken(), id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.watched })
    },
  })
}

export function useDismissRecommendationMutation(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dismissRecommendation(id, requireToken()),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.recommendations })
      const previous: RecommendationOut[] | undefined = qc.getQueryData(queryKeys.recommendations)
      if (previous !== undefined) {
        qc.setQueryData<RecommendationOut[]>(
          queryKeys.recommendations,
          previous.filter((r) => r.id !== id),
        )
      }
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      const context = ctx as { previous?: RecommendationOut[] } | undefined
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKeys.recommendations, context.previous)
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.recommendations })
    },
  })
}

export function useGenerateRecommendationsMutation(): UseMutationResult<
  GenerateRecommendationsResponse,
  Error,
  void
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => generateRecommendations(requireToken()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.recommendations })
    },
  })
}

export function useUpdatePreferencesMutation(): UseMutationResult<
  UserPreferences,
  Error,
  UserPreferences
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UserPreferences) => updatePreferences(data, requireToken()),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.preferences, data)
    },
  })
}

export function useUpdateInstructionsMutation(): UseMutationResult<
  UserInstructions,
  Error,
  UserInstructions
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UserInstructions) => updateInstructions(data, requireToken()),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.instructions, data)
    },
  })
}

export function useCreateMemoryNoteMutation(): UseMutationResult<MemoryNote, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => addMemoryNote(content, requireToken()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.memoryNotes })
    },
  })
}

export function useDeleteMemoryNoteMutation(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMemoryNote(id, requireToken()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.memoryNotes })
    },
  })
}

export function useCreateSessionMutation(): UseMutationResult<AnalysisSession, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (watchedMovieId: string) => createSession(watchedMovieId, requireToken()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.sessions })
    },
  })
}

export function useCloseSessionMutation(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => closeSession(sessionId, requireToken()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.sessions })
    },
  })
}

export function useDeleteSessionMutation(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId, requireToken()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.sessions })
    },
  })
}
