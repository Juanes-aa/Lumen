"""Helper legado para ejecutar IO bloqueante de supabase-py sync.

DEPRECADO: los repositorios de datos usan AsyncClient directamente
(supabase-py 2.x tiene AsyncClient estable). Este módulo se mantiene
únicamente para el router de Auth (GoTrue sync API).

No usar en código nuevo — usar ``await client.table(...).execute()`` directamente.
"""
from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")


async def run_sync(fn: Callable[[], T]) -> T:
    """Ejecuta `fn` en el threadpool por defecto y devuelve el resultado."""
    return await asyncio.to_thread(fn)
