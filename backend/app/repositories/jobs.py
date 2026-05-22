"""Repositorio para la tabla `background_jobs`.

Acceso exclusivo vía service_role (sin RLS de usuario).
"""
from datetime import datetime, timezone

from supabase import AsyncClient


async def create_job(client: AsyncClient, job_type: str, payload: dict) -> str:
    result = await (
        client.table("background_jobs")
        .insert({"job_type": job_type, "payload": payload})
        .execute()
    )
    return str(result.data[0]["id"])


async def mark_running(client: AsyncClient, job_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    await (
        client.table("background_jobs")
        .update({"status": "running", "started_at": now})
        .eq("id", job_id)
        .execute()
    )


async def mark_done(client: AsyncClient, job_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    await (
        client.table("background_jobs")
        .update({"status": "done", "completed_at": now})
        .eq("id", job_id)
        .execute()
    )


async def mark_failed(client: AsyncClient, job_id: str, error: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    await (
        client.table("background_jobs")
        .update({"status": "failed", "completed_at": now, "error": error[:2000]})
        .eq("id", job_id)
        .execute()
    )
