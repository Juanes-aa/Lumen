import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from supabase import AsyncClient
from supabase_auth.errors import AuthApiError

from app.dependencies.auth import get_current_user_id
from app.dependencies.supabase import get_supabase_admin, get_supabase_user
from app.repositories import memory as memory_repo
from app.repositories import profile as profile_repo
from app.schemas.profile import (
    DeleteAccountRequest,
    InstructionsRequest,
    InstructionsResponse,
    MemoryListResponse,
    MemoryNoteCreate,
    MemoryNoteResponse,
    PreferencesRequest,
    PreferencesResponse,
    SemanticProfileResponse,
    TopItem,
)
from app.utils.async_supabase import run_sync
from app.utils.rows import get_int, get_list_str, get_str

logger: logging.Logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/semantic", response_model=SemanticProfileResponse)
async def get_semantic_profile(
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> SemanticProfileResponse:
    row = await profile_repo.get_profile(supabase, user_id)

    if row is None:
        return SemanticProfileResponse(
            user_id=user_id,
            temas_frecuentes=[],
            directores_afines=[],
            narrativa_predominante=None,
            nivel_filosofico_promedio=None,
            total_sesiones_analizadas=0,
            has_profile=False,
        )

    # temas_frecuentes y directores_afines ya son jsonb: list[list[item, count]].
    raw_temas: list[object] = list(row.get("temas_frecuentes") or [])
    temas: list[TopItem] = [
        TopItem(value=str(item[0]), count=int(item[1]))
        for item in raw_temas
        if isinstance(item, (list, tuple)) and len(item) >= 2
    ]

    raw_directores: list[object] = list(row.get("directores_afines") or [])
    directores: list[TopItem] = [
        TopItem(value=str(item[0]), count=int(item[1]))
        for item in raw_directores
        if isinstance(item, (list, tuple)) and len(item) >= 2
    ]

    return SemanticProfileResponse(
        user_id=user_id,
        temas_frecuentes=temas,
        directores_afines=directores,
        narrativa_predominante=get_str(row, "narrativa_predominante"),
        nivel_filosofico_promedio=get_str(row, "nivel_filosofico_promedio"),
        total_sesiones_analizadas=get_int(row, "total_sesiones_analizadas"),
        has_profile=True,
    )


@router.get("/preferences", response_model=PreferencesResponse)
async def get_preferences(
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> PreferencesResponse:
    row = await profile_repo.get_preferences_row(supabase, user_id)
    if row is None:
        return PreferencesResponse(
            user_id=user_id,
            favorite_genres=[],
            reference_directors=[],
        )
    favorite_genres: list[str] = get_list_str(row, "favorite_genres")
    reference_directors: list[str] = get_list_str(row, "reference_directors")
    return PreferencesResponse(
        user_id=user_id,
        favorite_genres=favorite_genres,
        reference_directors=reference_directors,
    )


@router.put("/preferences", response_model=PreferencesResponse)
async def update_preferences(
    data: PreferencesRequest,
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> PreferencesResponse:
    await profile_repo.upsert_preferences(
        supabase,
        user_id,
        data.favorite_genres,
        data.reference_directors,
    )
    return PreferencesResponse(
        user_id=user_id,
        favorite_genres=data.favorite_genres,
        reference_directors=data.reference_directors,
    )


@router.get("/instructions", response_model=InstructionsResponse)
async def get_instructions(
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> InstructionsResponse:
    row = await profile_repo.get_instructions_row(supabase, user_id)
    if row is None:
        return InstructionsResponse(user_id=user_id, instructions="")
    instructions: str = get_str(row, "instructions", "")
    return InstructionsResponse(user_id=user_id, instructions=instructions)


@router.put("/instructions", response_model=InstructionsResponse)
async def update_instructions(
    data: InstructionsRequest,
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> InstructionsResponse:
    await profile_repo.upsert_instructions(supabase, user_id, data.instructions)
    return InstructionsResponse(user_id=user_id, instructions=data.instructions)


@router.get("/memory", response_model=MemoryListResponse)
async def get_memory_notes(
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> MemoryListResponse:
    rows = await memory_repo.list_user_memory(supabase, user_id)
    notes: list[MemoryNoteResponse] = [
        MemoryNoteResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            content=str(row["content"]),
            created_at=str(row["created_at"]),
        )
        for row in rows
    ]
    return MemoryListResponse(notes=notes)


@router.post("/memory", response_model=MemoryNoteResponse, status_code=201)
async def add_memory_note(
    data: MemoryNoteCreate,
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> MemoryNoteResponse:
    if await memory_repo.count_user_memory(supabase, user_id) >= 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Has alcanzado el límite de 10 notas de memoria",
        )
    row = await memory_repo.insert_memory_note(supabase, user_id, data.content)
    return MemoryNoteResponse(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        content=str(row["content"]),
        created_at=str(row["created_at"]),
    )


@router.delete("/memory/{note_id}", status_code=200)
async def delete_memory_note(
    note_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> dict[str, str]:
    deleted: bool = await memory_repo.delete_memory_note(supabase, user_id, note_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nota no encontrada",
        )
    return {"message": "Note deleted successfully"}


@router.delete("/account", status_code=200)
async def delete_account(
    request: Request,
    response: Response,
    data: DeleteAccountRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    """Borra la cuenta del usuario de forma permanente (GDPR).

    Flujo:
    1. Obtiene el email del usuario vía Admin API.
    2. Verifica la contraseña con sign_in_with_password.
    3. Elimina al usuario con Admin API — ON DELETE CASCADE borra todos sus datos.
    4. Limpia la cookie de refresh_token.
    """
    from app.routers.auth import REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH

    admin = get_supabase_admin()

    # 1. Obtener email del usuario
    try:
        user_data = await run_sync(lambda: admin.auth.admin.get_user_by_id(user_id))
    except Exception as exc:
        logger.exception("delete_account_get_user_failed user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al verificar la cuenta",
        ) from exc

    if user_data.user is None or not user_data.user.email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    email: str = str(user_data.user.email)

    # 2. Verificar contraseña
    try:
        await run_sync(
            lambda: admin.auth.sign_in_with_password(
                {"email": email, "password": data.password}
            )
        )
    except AuthApiError as exc:
        logger.warning(
            "delete_account_wrong_password user_id=%s status=%s",
            user_id,
            getattr(exc, "status", None),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta",
        ) from exc

    # 3. Eliminar usuario (ON DELETE CASCADE elimina todos sus datos)
    try:
        await run_sync(lambda: admin.auth.admin.delete_user(user_id))
        logger.info("delete_account_success user_id=%s", user_id)
    except Exception as exc:
        logger.exception("delete_account_delete_failed user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo eliminar la cuenta",
        ) from exc

    # 4. Limpiar cookie de refresh_token
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)

    return {"message": "Cuenta eliminada correctamente"}
