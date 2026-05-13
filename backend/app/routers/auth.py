import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, Response
from supabase import Client
from supabase_auth.errors import AuthApiError

from app.config import get_settings
from app.dependencies.rate_limit import limiter
from app.dependencies.supabase import get_supabase_admin
from app.utils.async_supabase import run_sync
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
)

logger: logging.Logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth")

REFRESH_COOKIE_NAME: str = "refresh_token"
REFRESH_COOKIE_PATH: str = "/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    samesite_raw: str = settings.cookie_samesite.lower()
    samesite: Literal["lax", "strict", "none"]
    if samesite_raw in ("lax", "strict", "none"):
        samesite = samesite_raw  # type: ignore[assignment]
    else:
        samesite = "lax"
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.refresh_cookie_max_age_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=samesite,
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
    )

# Códigos estructurados de supabase_auth que indican email/usuario duplicado.
_DUPLICATE_AUTH_CODES: frozenset[str] = frozenset({"email_exists", "user_already_exists"})


def _is_duplicate_user_error(exc: AuthApiError) -> bool:
    code = getattr(exc, "code", None)
    if isinstance(code, str) and code in _DUPLICATE_AUTH_CODES:
        return True
    # TODO: eliminar este fallback cuando supabase_auth garantice siempre `code`.
    # Algunos backends devuelven status=422 sin code. Detectamos por mensaje
    # como último recurso y registramos para auditarlo.
    msg: str = str(exc).lower()
    fallback_match: bool = (
        "already registered" in msg
        or "user already exists" in msg
        or "email exists" in msg
    )
    if fallback_match:
        logger.warning(
            "auth_duplicate_fallback status=%s code=%s message=%r",
            getattr(exc, "status", None),
            code,
            str(exc),
        )
    return fallback_match


@router.post("/register", response_model=RegisterResponse, status_code=201)
@limiter.limit("10/minute")
async def register(
    request: Request, response: Response, data: RegisterRequest
) -> RegisterResponse:
    client: Client = get_supabase_admin()

    try:
        admin_response = await run_sync(
            lambda: client.auth.admin.create_user(
                {
                    "email": data.email,
                    "password": data.password,
                    "email_confirm": True,
                }
            )
        )
    except AuthApiError as exc:
        if _is_duplicate_user_error(exc):
            raise HTTPException(
                status_code=400,
                detail="Este email ya está registrado",
            ) from exc
        logger.exception(
            "auth_register_admin_create_failed status=%s code=%s",
            getattr(exc, "status", None),
            getattr(exc, "code", None),
        )
        raise HTTPException(
            status_code=500,
            detail="No se pudo registrar el usuario",
        ) from exc

    user = admin_response.user
    if user is None:
        logger.error("auth_register_no_user_returned")
        raise HTTPException(
            status_code=500, detail="No se pudo registrar el usuario"
        )

    user_id: str = str(user.id)
    try:
        await run_sync(
            lambda: client.table("profiles")
            .upsert({"id": user_id, "username": data.username})
            .execute()
        )
    except Exception as exc:
        logger.exception("auth_register_profile_upsert_failed user_id=%s", user_id)
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el perfil de usuario",
        ) from exc

    try:
        sign_in_response = await run_sync(
            lambda: client.auth.sign_in_with_password(
                {"email": data.email, "password": data.password}
            )
        )
    except AuthApiError as exc:
        logger.exception(
            "auth_register_signin_failed user_id=%s status=%s code=%s",
            user_id,
            getattr(exc, "status", None),
            getattr(exc, "code", None),
        )
        raise HTTPException(
            status_code=500,
            detail="No se pudo iniciar sesión tras el registro",
        ) from exc

    session = sign_in_response.session
    if session is None:
        raise HTTPException(status_code=500, detail="No se pudo crear la sesión")

    _set_refresh_cookie(response, session.refresh_token)

    return RegisterResponse(
        user_id=user_id,
        email=data.email,
        username=data.username,
        access_token=session.access_token,
    )


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request, response: Response, data: LoginRequest
) -> LoginResponse:
    client: Client = get_supabase_admin()

    try:
        sign_in_response = await run_sync(
            lambda: client.auth.sign_in_with_password(
                {"email": data.email, "password": data.password}
            )
        )
    except AuthApiError as exc:
        logger.warning(
            "auth_login_failed status=%s code=%s",
            getattr(exc, "status", None),
            getattr(exc, "code", None),
        )
        raise HTTPException(
            status_code=400, detail="Credenciales incorrectas"
        ) from exc

    session = sign_in_response.session
    if session is None:
        logger.error("auth_login_no_session_returned")
        raise HTTPException(status_code=500, detail="No se pudo iniciar sesión")

    user = sign_in_response.user
    if user is None:
        logger.error("auth_login_no_user_returned")
        raise HTTPException(status_code=500, detail="No se pudo iniciar sesión")

    profile_response = await run_sync(
        lambda: client.table("profiles")
        .select("username")
        .eq("id", str(user.id))
        .execute()
    )
    raw_username = profile_response.data[0].get("username") if profile_response.data else None
    username: str = raw_username if isinstance(raw_username, str) and raw_username.strip() != "" else data.email

    _set_refresh_cookie(response, session.refresh_token)

    return LoginResponse(
        user_id=str(user.id),
        email=data.email,
        username=username,
        access_token=session.access_token,
    )


@router.post("/refresh", response_model=RefreshResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, response: Response) -> RefreshResponse:
    refresh_token: str | None = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token is None or refresh_token == "":
        raise HTTPException(
            status_code=401, detail="Falta refresh token"
        )

    client: Client = get_supabase_admin()

    try:
        refresh_response = await run_sync(
            lambda: client.auth.refresh_session(refresh_token)
        )
    except AuthApiError as exc:
        logger.warning(
            "auth_refresh_failed status=%s code=%s",
            getattr(exc, "status", None),
            getattr(exc, "code", None),
        )
        # Cookie inválida: la borramos para no dejar al cliente en un loop.
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=401, detail="Token inválido o expirado"
        ) from exc

    session = refresh_response.session
    if session is None:
        logger.error("auth_refresh_no_session_returned")
        raise HTTPException(status_code=500, detail="No se pudo refrescar la sesión")

    # Si Supabase rota el refresh_token, lo refrescamos en la cookie.
    new_refresh: str | None = getattr(session, "refresh_token", None)
    if isinstance(new_refresh, str) and new_refresh != "":
        _set_refresh_cookie(response, new_refresh)

    return RefreshResponse(access_token=session.access_token)


@router.post("/logout", status_code=204)
async def logout(response: Response) -> Response:
    _clear_refresh_cookie(response)
    response.status_code = 204
    return response
