"""Helper para ejecutar IO bloqueante (supabase-py sync) en un thread
sin bloquear el event loop.

Uso:
    rows = await run_sync(lambda: client.table("...").select("*").execute())

Justificación: supabase-py todavía es sync y su variante async es
inestable. asyncio.to_thread libera el event loop durante la llamada,
lo que importa especialmente para SSE/streaming.
"""
from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")


async def run_sync(fn: Callable[[], T]) -> T:
    """Ejecuta `fn` en el threadpool por defecto y devuelve el resultado."""
    return await asyncio.to_thread(fn)
