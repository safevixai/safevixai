from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

import logging

logger = logging.getLogger(__name__)

# JWT secrets must come from environment in production. In development, an
# ephemeral key avoids shipping a static secret while keeping local auth usable.
_ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").lower()
_env_secret = os.environ.get("JWT_SECRET_KEY")
if _env_secret:
    SECRET_KEY = _env_secret
elif _ENVIRONMENT == "production":
    raise RuntimeError("JWT_SECRET_KEY is required when ENVIRONMENT=production")
else:
    SECRET_KEY = secrets.token_urlsafe(64)
    logger.warning(
        "JWT_SECRET_KEY not set; generated an ephemeral key. "
        "Tokens will not survive server restarts."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.environ.get("ACCESS_TOKEN_EXPIRE_HOURS", "24"))
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
SUPABASE_JWT_AUDIENCE = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated").strip()
REJECTED_STATIC_TOKENS = {
    "mock-jwt-token-for-hackathon",
    "mock-jwt-token",
    "fake-token",
    "test-token",
}

security = HTTPBearer(auto_error=False)


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _unauthorized() -> HTTPException:
    return HTTPException(status_code=401, detail="Invalid authentication credentials")


def _normalize_user_payload(payload: dict[str, Any], *, provider: str) -> dict[str, Any]:
    user_id = payload.get("sub")
    if not user_id:
        raise _unauthorized()
    return {
        **payload,
        "sub": str(user_id),
        "role": payload.get("role") or payload.get("app_metadata", {}).get("role") or "authenticated",
        "auth_provider": provider,
    }


def _decode_app_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return _normalize_user_payload(payload, provider="operator_jwt")


def _decode_supabase_token(token: str) -> dict[str, Any]:
    if not SUPABASE_JWT_SECRET:
        raise JWTError("SUPABASE_JWT_SECRET is not configured")
    options = {"verify_aud": bool(SUPABASE_JWT_AUDIENCE)}
    payload = jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=[ALGORITHM],
        audience=SUPABASE_JWT_AUDIENCE or None,
        options=options,
    )
    return _normalize_user_payload(payload, provider="supabase")


def _decode_bearer_token(token: str) -> dict[str, Any]:
    token = token.strip()
    if not token or token in REJECTED_STATIC_TOKENS:
        raise _unauthorized()
    try:
        return _decode_app_token(token)
    except JWTError as app_error:
        try:
            return _decode_supabase_token(token)
        except JWTError:
            logger.info("Bearer token rejected by app and Supabase JWT validators")
            raise _unauthorized() from app_error


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
) -> dict[str, Any] | None:
    """Return the authenticated caller when a valid bearer token is present."""
    if credentials is None:
        return None
    return _decode_bearer_token(credentials.credentials)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
) -> dict[str, Any]:
    """
    Validate either a Supabase Auth JWT or the temporary operator JWT.

    Static demo tokens are never accepted. User-facing clients should send
    Supabase Auth access tokens; /api/v1/auth/login remains only as an
    operator fallback until Supabase admin claims are fully wired.
    """
    user = await get_current_user_optional(credentials)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
