from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    groq_api_key: str = ""
    tmdb_api_key: str = ""

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
        ]
    )

    # Cookie de refresh_token. En producción cross-domain (Vercel ⇄ Render)
    # debe ser `cookie_secure=True` y `cookie_samesite=none`. En dev local
    # con mismo origen basta con `lax` y secure=False.
    cookie_secure: bool = False
    cookie_samesite: str = "lax"  # "lax" | "strict" | "none"
    refresh_cookie_max_age_seconds: int = 60 * 60 * 24 * 30  # 30 días

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


class ConfigurationError(RuntimeError):
    """Variables de entorno críticas ausentes o malformadas."""


def validate_critical_settings(settings: Settings) -> None:
    """Valida al arranque que la configuración mínima sea utilizable.

    Si falta o tiene formato sospechoso alguna variable crítica, aborta
    el arranque con un mensaje que las lista todas (evita rondas de
    "falló otra cosa" tras desplegar).
    """
    errors: list[str] = []

    if not settings.supabase_url:
        errors.append("SUPABASE_URL ausente")
    elif not settings.supabase_url.startswith("https://"):
        errors.append("SUPABASE_URL debe empezar con https://")

    if not settings.supabase_anon_key:
        errors.append("SUPABASE_ANON_KEY ausente")
    if not settings.supabase_service_role_key:
        errors.append("SUPABASE_SERVICE_ROLE_KEY ausente")
    if not settings.groq_api_key:
        errors.append("GROQ_API_KEY ausente")
    if not settings.tmdb_api_key:
        errors.append("TMDB_API_KEY ausente")

    if not isinstance(settings.cookie_secure, bool):
        errors.append("COOKIE_SECURE debe ser booleano (true/false)")

    if not settings.cors_origins:
        errors.append("CORS_ORIGINS debe contener al menos un origen")

    if errors:
        bullets: str = "\n  - ".join(errors)
        raise ConfigurationError(
            "Configuración del backend inválida:\n  - " + bullets
        )
