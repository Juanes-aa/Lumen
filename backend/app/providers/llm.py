"""Abstracción del proveedor LLM.

Todo el código de la aplicación trabaja contra LLMProvider (Protocol).
Para cambiar de Groq a otro proveedor (OpenAI, Anthropic, etc.) basta
con crear una nueva clase que implemente el Protocol y actualizar
get_llm_provider() — sin tocar servicios ni routers.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from functools import lru_cache
from typing import Protocol, runtime_checkable

from fastapi import HTTPException
from groq import AsyncGroq

from app.dependencies.groq_client import get_groq_client

_DEFAULT_MODEL = "llama-3.3-70b-versatile"


@runtime_checkable
class LLMProvider(Protocol):
    """Interfaz mínima para proveedores LLM de la aplicación."""

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str: ...

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]: ...


class GroqProvider:
    """LLMProvider respaldado por Groq (llama-3.3-70b-versatile por defecto)."""

    def __init__(self, client: AsyncGroq, model: str = _DEFAULT_MODEL) -> None:
        self._client = client
        self._model = model

    async def complete(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        try:
            response = await asyncio.wait_for(
                self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    stream=False,
                ),
                timeout=30.0,
            )
        except TimeoutError as exc:
            raise HTTPException(
                status_code=502,
                detail="El modelo tardó demasiado en responder",
            ) from exc
        return response.choices[0].message.content or ""

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        # Timeout en la conexión inicial; los tokens individuales se controlan
        # desde el caller (event_stream captura asyncio.TimeoutError).
        response_stream = await asyncio.wait_for(
            self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            ),
            timeout=60.0,
        )
        async for chunk in response_stream:
            token: str | None = chunk.choices[0].delta.content
            if token:
                yield token


@lru_cache(maxsize=1)
def get_llm_provider() -> GroqProvider:
    """Dependency injectable. Devuelve siempre la misma instancia (singleton)."""
    return GroqProvider(client=get_groq_client())
