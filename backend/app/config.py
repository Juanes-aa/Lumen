from functools import lru_cache
import json

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ConfigurationError(RuntimeError):
    """Raised when required settings are missing or invalid at startup."""


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
    # supabase_jwt_secret eliminado: la validación JWT usa ES256 vía JWKS
    # (ver app/dependencies/auth.py → _fetch_jwks). El secret HS256 no se usa
    # en ninguna parte del código; mantenerlo generaba confusión sobre el mecanismo
    # de autenticación real. Si el entorno define SUPABASE_JWT_SECRET, pydantic-settings
    # lo ignorará silenciosamente (extra="ignore").
    groq_api_key: str = ""
    tmdb_api_key: str = ""

    # Acepta string CSV o lista (para construcción directa en tests)
    cors_origins: list[str] | str = Field(
        default="http://localhost:5173,http://localhost:5174,http://localhost:5175"
    )

    # Cookie de refresh_token. En producción cross-domain (Vercel ⇄ Render)
    # debe ser cookie_secure=True y cookie_samesite=none. El default ahora
    # es True; en desarrollo local con HTTP hay que setear COOKIE_SECURE=false.
    cookie_secure: bool = True
    cookie_samesite: str = "lax"
    refresh_cookie_max_age_seconds: int = 60 * 60 * 24 * 30  # 30 días

    # Rate limiting: si se configura REDIS_URL, slowapi usa Redis en lugar
    # de memoria del proceso (necesario para despliegues con >1 worker).
    redis_url: str | None = None

    # Límites diarios de mensajes LLM por tier (0 = ilimitado).
    free_daily_message_limit: int = 50
    pro_daily_message_limit: int = 0

    def get_cors_origins(self) -> list[str]:
        if isinstance(self.cors_origins, list):
            return [s.strip() for s in self.cors_origins if str(s).strip()]
        v = self.cors_origins.strip()
        if v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                pass
        return [s.strip() for s in v.split(",") if s.strip()]


def validate_critical_settings(settings: Settings) -> None:
    """Valida que los settings críticos estén presentes. Llamar en startup."""
    errors: list[str] = []

    if not settings.supabase_url:
        errors.append("SUPABASE_URL is required")
    elif not settings.supabase_url.startswith("https://"):
        errors.append("SUPABASE_URL must start with https://")

    if not settings.supabase_anon_key:
        errors.append("SUPABASE_ANON_KEY is required")

    if not settings.supabase_service_role_key:
        errors.append("SUPABASE_SERVICE_ROLE_KEY is required")

    if not settings.groq_api_key:
        errors.append("GROQ_API_KEY is required")

    if not settings.get_cors_origins():
        errors.append("CORS_ORIGINS must not be empty")

    if settings.cookie_samesite.lower() == "none" and not settings.cookie_secure:
        errors.append(
            "COOKIE_SECURE must be True when COOKIE_SAMESITE is 'none' "
            "(browsers reject SameSite=None without Secure flag)"
        )

    if errors:
        raise ConfigurationError("; ".join(errors))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
