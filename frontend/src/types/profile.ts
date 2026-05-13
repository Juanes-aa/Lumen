export interface TopItem {
  value: string
  count: number
}

export interface SemanticProfile {
  user_id: string
  temas_frecuentes: TopItem[]
  directores_afines: TopItem[]
  narrativa_predominante: string | null
  nivel_filosofico_promedio: string | null
  total_sesiones_analizadas: number
  has_profile: boolean
}

export interface MemoryNote {
  id: string
  user_id: string
  content: string
  created_at: string
}

export interface UserPreferences {
  favorite_genres: string[]
  reference_directors: string[]
}

export interface UserInstructions {
  instructions: string
}
