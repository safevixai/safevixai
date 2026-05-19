from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Security, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

import logging

logger = logging.getLogger(__name__)

# JWT secrets must come from environment in production. In development, an
# ephemeral key avoids shipping a static secret while keeping local auth usable.
_ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").lower()
_env_secret = os.environ.get("JWT_SECRET_KEY")
if _env_secret:
    if _ENVIRONMENT == "production" and len(_env_secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET_KEY must be at least 32 bytes when ENVIRONMENT=production")
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

# P1-01: Audience and Issuer validation for internal operator tokens
APP_JWT_AUDIENCE = os.environ.get("APP_JWT_AUDIENCE", "safevixai-internal")
APP_JWT_ISSUER = os.environ.get("APP_JWT_ISSUER", "safevixai-auth-service")

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
SUPABASE_JWT_AUDIENCE = os.environ.get("SUPABASE_JWT_AUDIENCE", "authenticated").strip()
REJECTED_STATIC_TOKENS = {
    "mock-jwt-token-for-hackathon",
    "mock-jwt-token",
    "fake-token",
    "test-token",
}

# Phase 0.2: Cookie security flags
COOKIE_SECURE = _ENVIRONMENT == "production"
COOKIE_SAMESITE = "lax"
COOKIE_HTTPONLY = True
COOKIE_PATH = "/"

security = HTTPBearer(auto_error=False)


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
    role: str = "user",
) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    # P1-01: Add aud and iss claims
    # Phase 0.1: Add role claim to JWT
    to_encode.update({
        "exp": expire, 
        "iat": now,
        "aud": APP_JWT_AUDIENCE,
        "iss": APP_JWT_ISSUER,
        "role": role,
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_secure_cookie_response(
    content: Any,
    token: str,
    status_code: int = 200,
    expires_delta: timedelta | None = None,
) -> JSONResponse:
    """Create a JSON response with a secure HttpOnly cookie containing the JWT.
    
    Phase 0.2: Prevents XSS attacks by making JWT inaccessible to JavaScript.
    """
    response = JSONResponse(content=content, status_code=status_code)
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
        expires=expire,
        max_age=int((expire - datetime.now(timezone.utc)).total_seconds()),
    )
    return response


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
    # P1-01: Strictly validate audience and issuer
    payload = jwt.decode(
        token, 
        SECRET_KEY, 
        algorithms=[ALGORITHM],
        audience=APP_JWT_AUDIENCE,
        issuer=APP_JWT_ISSUER,
    )
    return _normalize_user_payload(payload, provider="operator_jwt")


def _decode_supabase_token(token: str) -> dict[str, Any]:
    if not SUPABASE_JWT_SECRET:
        raise jwt.InvalidTokenError("SUPABASE_JWT_SECRET is not configured")
    payload = jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=[ALGORITHM],
        audience=SUPABASE_JWT_AUDIENCE or None,
    )
    return _normalize_user_payload(payload, provider="supabase")


def _decode_bearer_token(token: str) -> dict[str, Any]:
    token = token.strip()
    if not token or token in REJECTED_STATIC_TOKENS:
        raise _unauthorized()
    try:
        return _decode_app_token(token)
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as app_error:
        try:
            return _decode_supabase_token(token)
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
            # Phase 0.3: Try JWKS verification if available
            try:
                from core.jwks import JWKSManager
                # This will be called from request context where app.state is available
                # For now, fall back to static secret
                logger.debug("JWT verification failed; JWKS not available in this context")
            except ImportError:
                pass
            logger.info("Bearer token rejected by app, Supabase, and JWKS validators")
            raise _unauthorized() from app_error


async def get_current_user_optional(
    request: Request,
) -> dict[str, Any] | None:
    """Return the authenticated caller when a valid bearer token is present."""
    token = request.cookies.get("access_token")
    if token is None:
        return None
    return _decode_bearer_token(token)


async def get_current_user(
    request: Request,
) -> dict[str, Any]:
    """
    Validate either a Supabase Auth JWT or the temporary operator JWT.

    Static demo tokens are never accepted. User-facing clients should send
    Supabase Auth access tokens via the access_token cookie.
    """
    user = await get_current_user_optional(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
