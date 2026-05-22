"""Servicio de tiers/planes de usuario.

Determina el límite diario de mensajes LLM para cada usuario según su tier.
Los tiers actuales son 'free' y 'pro'. La columna `tier` vive en `user_profile`.
"""
from __future__ import annotations

import logging

from supabase import AsyncClient

from app.config import get_settings

logger: logging.Logger = logging.getLogger(__name__)


async def get_user_daily_limit(client: AsyncClient, user_id: str) -> int:
    """Retorna el límite diario de mensajes del usuario según su tier.

    Retorna 0 si el tier no tiene límite (pro ilimitado).
    Si el usuario no tiene perfil, asume tier 'free'.
    """
    settings = get_settings()

    try:
        result = await (
            client.table("user_profile")
            .select("tier")
            .eq("user_id", user_id)
            .execute()
        )
        tier: str = result.data[0].get("tier", "free") if result.data else "free"
    except Exception:
        logger.warning("tier_service_get_tier_failed user_id=%s — defaulting to free", user_id)
        tier = "free"

    if tier == "pro":
        return settings.pro_daily_message_limit
    return settings.free_daily_message_limit
