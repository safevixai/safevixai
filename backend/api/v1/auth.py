from __future__ import annotations

import hashlib
import hmac
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from core.limiter import limiter
from core.security import (
    APP_JWT_AUDIENCE,
    APP_JWT_ISSUER,
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    create_secure_cookie_response,
    create_refresh_token,
    get_current_user,
    is_token_revoked,
    revoke_token,
)
import jwt

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=256)

class LoginResponse(BaseModel):
    message: str
    operator_name: str

def _verify_pbkdf2_password(password: str, encoded_hash: str) -> bool:
    """Verify pbkdf2_sha256$iterations$salt$hex_digest from environment."""
    try:
        algorithm, iterations_raw, salt, expected = encoded_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
        return hmac.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


def _configured_operator() -> dict[str, str] | None:
    email = os.environ.get("AUTH_OPERATOR_EMAIL", "").strip().lower()
    password_hash = os.environ.get("AUTH_OPERATOR_PASSWORD_HASH", "").strip()
    name = os.environ.get("AUTH_OPERATOR_NAME", "SafeVixAI Operator").strip()
    if not email or not password_hash:
        return None
    return {"email": email, "password_hash": password_hash, "name": name}

@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    operator = _configured_operator()
    if operator is None:
        raise HTTPException(status_code=503, detail="Operator login is not configured")

    email = body.email.strip().lower()
    if email != operator["email"] or not _verify_pbkdf2_password(body.password, operator["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        data={"sub": email, "name": operator["name"]},
        role="operator",
    )
    
    # Phase 0.2: Use secure cookie helper (HttpOnly, Secure, SameSite)
    return create_secure_cookie_response(
        content={"message": "Login successful", "operator_name": operator["name"]},
        token=token,
    )

@router.post("/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax",
        secure=os.environ.get("ENVIRONMENT", "development").lower() == "production"
    )
    return response

@router.get("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Validate the caller's bearer token."""
    return {"status": "valid", "sub": current_user.get("sub"), "role": current_user.get("role")}


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=4096)


@router.post("/refresh")
@limiter.limit("5/minute")
async def refresh_access_token(request: Request, body: RefreshTokenRequest):
    """Issue a new access token from a valid refresh token."""
    try:
        payload = jwt.decode(
            body.refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=APP_JWT_AUDIENCE,
            issuer=APP_JWT_ISSUER,
        )
        if payload.get("purpose") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token purpose")
        jti = payload.get("jti")
        if jti:
            cache = getattr(request.app.state, 'cache', None)
            if await is_token_revoked(jti, cache):
                raise HTTPException(status_code=401, detail="Refresh token has been revoked")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc

    new_token = create_access_token(
        data={"sub": payload["sub"], "name": payload.get("name", "")},
        role=payload.get("role", "user"),
    )
    return create_secure_cookie_response(
        content={"access_token": new_token, "token_type": "bearer"},
        token=new_token,
    )


@router.post("/revoke")
async def revoke_access_token(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Revoke the current access token."""
    jti = current_user.get("jti")
    if jti:
        cache = getattr(request.app.state, 'cache', None)
        await revoke_token(jti, cache)
    return {"message": "Token revoked successfully"}
