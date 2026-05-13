export interface RecommendationOut {
  id: string
  title: string
  tmdb_id: number
  poster_url: string | null
  reason: string
  themes: string[]
  status: 'active' | 'dismissed'
  created_at: string
}

export interface GenerateRecommendationsResponse {
  recommendations: RecommendationOut[]
  generated_count: number
}
