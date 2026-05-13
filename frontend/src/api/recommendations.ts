import type { GenerateRecommendationsResponse, RecommendationOut } from '../types/recommendations'
import { apiFetch } from './client'

export async function getRecommendations(token: string): Promise<RecommendationOut[]> {
  const data = await apiFetch<{ recommendations: RecommendationOut[] }>(
    '/recommendations/',
    { method: 'GET' },
    { token },
  )
  return data.recommendations
}

export async function generateRecommendations(
  token: string,
): Promise<GenerateRecommendationsResponse> {
  return apiFetch<GenerateRecommendationsResponse>(
    '/recommendations/generate',
    { method: 'POST' },
    { token },
  )
}

export async function dismissRecommendation(id: string, token: string): Promise<void> {
  await apiFetch<void>(
    `/recommendations/${id}/dismiss`,
    { method: 'PATCH' },
    { token },
  )
}
