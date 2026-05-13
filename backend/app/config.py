from functools import lru_cache
import json

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""
    groq_api_key: str = ""
    tmdb_api_key: str = ""

    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:5174,http://localhost:5175"
    )

    # Cookie de refresh_token. En producción cross-domain (Vercel ⇄ Render)
    # debe ser `cookie_secure=True` y `cookie_samesite=none`. En dev local
    # con mismo origen basta con `lax` y secure=False.
    cookie_secure: bool = False
    cookie_samesite: str = "lax"  # "lax" | "strict" | "none"
    refresh_cookie_max_age_seconds: int = 60 * 60 * 24 * 30  # 30 días

    def get_cors_origins(self) -> list[str]:
        v = self.cors_origins.strip()
        if v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                pass
        return [s.strip() for s in v.split(",") if s.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
