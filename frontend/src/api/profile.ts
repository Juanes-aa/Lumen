import type { MemoryNote, SemanticProfile, UserInstructions, UserPreferences } from '../types/profile'
import { apiFetch } from './client'

export async function getSemanticProfile(token: string): Promise<SemanticProfile> {
  return apiFetch<SemanticProfile>('/profile/semantic', { method: 'GET' }, { token })
}

export async function getPreferences(token: string): Promise<UserPreferences> {
  return apiFetch<UserPreferences>('/profile/preferences', { method: 'GET' }, { token })
}

export async function updatePreferences(
  data: UserPreferences,
  token: string,
): Promise<UserPreferences> {
  return apiFetch<UserPreferences>(
    '/profile/preferences',
    { method: 'PUT', body: data },
    { token },
  )
}

export async function getInstructions(token: string): Promise<UserInstructions> {
  return apiFetch<UserInstructions>('/profile/instructions', { method: 'GET' }, { token })
}

export async function updateInstructions(
  data: UserInstructions,
  token: string,
): Promise<UserInstructions> {
  return apiFetch<UserInstructions>(
    '/profile/instructions',
    { method: 'PUT', body: data },
    { token },
  )
}

export async function getMemoryNotes(token: string): Promise<MemoryNote[]> {
  const data = await apiFetch<{ notes: MemoryNote[] }>(
    '/profile/memory',
    { method: 'GET' },
    { token },
  )
  return data.notes
}

export async function addMemoryNote(content: string, token: string): Promise<MemoryNote> {
  return apiFetch<MemoryNote>(
    '/profile/memory',
    { method: 'POST', body: { content } },
    { token },
  )
}

export async function deleteMemoryNote(noteId: string, token: string): Promise<void> {
  await apiFetch<void>(`/profile/memory/${noteId}`, { method: 'DELETE' }, { token })
}
