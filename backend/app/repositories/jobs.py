"""Repositorio para la tabla `background_jobs`.

Acceso exclusivo vía service_role (sin RLS de usuario).
"""
from datetime import UTC, datetime

from supabase import AsyncClient


async def create_job(client: AsyncClient, job_type: str, payload: dict) -> str:
    result = await (
        client.table("background_jobs")
        .insert({"job_type": job_type, "payload": payload})
        .execute()
    )
    return str(result.data[0]["id"])


async def mark_running(client: AsyncClient, job_id: str) -> None:
    now = datetime.now(UTC).isoformat()
    await (
        client.table("background_jobs")
        .update({"status": "running", "started_at": now})
        .eq("id", job_id)
        .execute()
    )


async def mark_done(client: AsyncClient, job_id: str) -> None:
    now = datetime.now(UTC).isoformat()
    await (
        client.table("background_jobs")
        .update({"status": "done", "completed_at": now})
        .eq("id", job_id)
        .execute()
    )


async def mark_failed(client: AsyncClient, job_id: str, error: str) -> None:
    now = datetime.now(UTC).isoformat()
    # Leer retry_count actual para incrementarlo. No atómico pero suficiente
    # para auditoría: el campo solo se escribe aquí y la ventana de race es
    # despreciable dado que cada job tiene un único writer.
    current_result = await (
        client.table("background_jobs")
        .select("retry_count")
        .eq("id", job_id)
        .execute()
    )
    current_count: int = int(current_result.data[0]["retry_count"]) if current_result.data else 0
    await (
        client.table("background_jobs")
        .update({
            "status": "failed",
            "completed_at": now,
            "error": error[:2000],
            "retry_count": current_count + 1,
        })
        .eq("id", job_id)
        .execute()
    )
