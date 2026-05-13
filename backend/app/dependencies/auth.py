import json

import httpx
import jwt
from cachetools import TTLCache, cached
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

_bearer_scheme = HTTPBearer()

_jwks_cache: TTLCache[str, dict[str, object]] = TTLCache(maxsize=1, ttl=3600)


@cached(cache=_jwks_cache)
def _fetch_jwks() -> dict[str, object]:
    supabase_url: str = get_settings().supabase_url
    url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return response.json()


def _public_key_for_kid(kid: str) -> object:
    jwks = _fetch_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwt.algorithms.ECAlgorithm.from_jwk(json.dumps(key_data))
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido: clave no encontrada",
    )


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> str:
    token: str = credentials.credentials

    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado",
        ) from exc

    # Supabase moderno firma todos los access tokens con ES256 vía JWKS.
    # Aceptar cualquier otro algoritmo (en particular HS256) abre la puerta
    # a ataques de "alg confusion" donde el atacante firma un token con la
    # clave pública. Forzamos ES256 + kid presente como única ruta válida.
    alg: object = header.get("alg")
    kid: object = header.get("kid")
    if alg != "ES256" or not isinstance(kid, str) or kid == "":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: algoritmo no soportado",
        )

    try:
        public_key = _public_key_for_kid(kid)
        payload: dict[str, object] = jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            options={"require": ["sub", "exp"]},
            audience="authenticated",
        )
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        ) from exc

    sub: object = payload.get("sub")
    if not isinstance(sub, str) or sub == "":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: falta el claim sub",
        )

    return sub