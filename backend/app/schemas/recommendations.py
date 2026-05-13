from pydantic import BaseModel


class RecommendationOut(BaseModel):
    id: str
    title: str
    tmdb_id: int
    poster_url: str | None
    reason: str
    themes: list[str]
    status: str
    created_at: str


class RecommendationsListResponse(BaseModel):
    recommendations: list[RecommendationOut]


class GenerateRecommendationsResponse(BaseModel):
    recommendations: list[RecommendationOut]
    generated_count: int
