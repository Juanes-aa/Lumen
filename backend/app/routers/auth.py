import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from supabase import Client, create_client
from supabase_auth.errors import AuthApiError

from app.config import get_settings
from app.dependencies.auth import get_current_user_id
from app.dependencies.rate_limit import limiter
from app.dependencies.supabase import get_supabase_admin
from app.utils.async_supabase import run_sync
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    RefreshResponse,
    RegisterPendingResponse,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
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


@router.post("/register", response_model=RegisterPendingResponse, status_code=201)
@limiter.limit("10/minute")
async def register(
    request: Request, response: Response, data: RegisterRequest
) -> RegisterPendingResponse:
    """Registra el usuario y envía un email de verificación.

    Devuelve `status=verification_pending` — el usuario debe verificar su email
    antes de poder iniciar sesión. No se crea sesión en este punto.
    """
    client: Client = get_supabase_admin()

    try:
        admin_response = await run_sync(
            lambda: client.auth.admin.create_user(
                {
                    "email": data.email,
                    "password": data.password,
                    # False → Supabase envía email de verificación.
                    # El usuario no puede iniciar sesión hasta confirmar.
                    "email_confirm": False,
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

    return RegisterPendingResponse(status="verification_pending", email=data.email)


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
        logger.warning("auth_refresh_no_session_returned")
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    # Si Supabase rota el refresh_token, lo actualizamos en la cookie.
    new_refresh: str | None = getattr(session, "refresh_token", None)
    if isinstance(new_refresh, str) and new_refresh != "":
        _set_refresh_cookie(response, new_refresh)

    # Extraer datos del usuario de la sesión
    user = refresh_response.user
    user_id: str = str(user.id) if user else ""
    email: str = str(user.email) if user and user.email else ""

    # Buscar username en el perfil
    username: str = email
    if user_id:
        try:
            profile_response = await run_sync(
                lambda: client.table("profiles")
                .select("username")
                .eq("id", user_id)
                .execute()
            )
            raw = profile_response.data[0].get("username") if profile_response.data else None
            if isinstance(raw, str) and raw.strip():
                username = raw
        except Exception:
            pass  # No bloquear el refresh si el perfil falla

    return RefreshResponse(
        access_token=session.access_token,
        user_id=user_id,
        email=email,
        username=username,
    )


@router.post("/resend-verification", status_code=200)
@limiter.limit("3/minute")
async def resend_verification(
    request: Request, data: ResendVerificationRequest
) -> dict[str, str]:
    """Reenvía el email de verificación de registro. Siempre responde 200."""
    client: Client = get_supabase_admin()
    try:
        # gotrue-py usa `resend({"type": "signup", "email": ...})`.
        await run_sync(
            lambda: client.auth.resend({"type": "signup", "email": data.email})
        )
    except Exception:
        logger.debug("auth_resend_verification_failed email=%s — best effort", data.email)
    return {
        "message": "Si el email está registrado y pendiente de verificación, recibirás el enlace"
    }


@router.post("/forgot-password", status_code=200)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request, data: ForgotPasswordRequest
) -> dict[str, str]:
    """Envía un email de recuperación. Siempre responde 200 para no revelar
    si el email existe en el sistema (evita enumeración de usuarios)."""
    client: Client = get_supabase_admin()
    settings = get_settings()
    try:
        redirect_to: str = f"{settings.frontend_url}/reset-password"
        await run_sync(
            lambda: client.auth.reset_password_for_email(
                data.email, options={"redirect_to": redirect_to}
            )
        )
    except Exception:
        logger.debug("auth_forgot_password_failed email=%s — best effort", data.email)
    return {"message": "Si el email está registrado, recibirás un enlace de recuperación"}


@router.post("/reset-password", status_code=200)
async def reset_password(
    data: ResetPasswordRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    """Actualiza la contraseña usando el access_token del magic link de recuperación.
    El cliente debe enviar el token como Bearer en el header Authorization."""
    client: Client = get_supabase_admin()
    try:
        await run_sync(
            lambda: client.auth.admin.update_user_by_id(
                user_id, {"password": data.new_password}
            )
        )
    except AuthApiError as exc:
        logger.warning(
            "auth_reset_password_failed user_id=%s status=%s code=%s",
            user_id,
            getattr(exc, "status", None),
            getattr(exc, "code", None),
        )
        raise HTTPException(
            status_code=400,
            detail="No se pudo actualizar la contraseña",
        ) from exc
    return {"message": "Contraseña actualizada correctamente"}


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response) -> Response:
    refresh_token_val: str | None = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token_val:
        # Best-effort: revocar la sesión en Supabase para invalidar el
        # refresh_token activo. Cliente temporal para no contaminar el singleton
        # admin con estado de sesión de otro usuario.
        # El access_token sigue válido hasta su expiración (~1h), pero sin
        # refresh_token el usuario no puede renovarlo.
        try:
            settings = get_settings()
            temp_client: Client = await run_sync(
                lambda: create_client(settings.supabase_url, settings.supabase_anon_key)
            )
            session_resp = await run_sync(
                lambda: temp_client.auth.refresh_session(refresh_token_val)
            )
            if session_resp and session_resp.session:
                await run_sync(lambda: temp_client.auth.sign_out())
        except Exception:
            logger.debug("auth_logout_revoke_failed — best effort, continuing logout")

    _clear_refresh_cookie(response)
    response.status_code = 204
    return response
