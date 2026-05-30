from __future__ import annotations

import time
import uuid
from datetime import timedelta, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

import jwt
import pytest
from fastapi import HTTPException

from core.security import (
    create_access_token,
    create_refresh_token,
    create_secure_cookie_response,
    is_token_revoked,
    revoke_token,
    _normalize_user_payload,
    _decode_app_token,
    _decode_bearer_token,
    get_current_user_optional,
    APP_JWT_AUDIENCE,
    APP_JWT_ISSUER,
    ALGORITHM,
    SECRET_KEY,
)


class TestCreateAccessToken:
    def test_default_expires_delta(self):
        data = {"sub": "user-1"}
        token = create_access_token(data)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], audience=APP_JWT_AUDIENCE, issuer=APP_JWT_ISSUER)
        assert payload["sub"] == "user-1"
        assert payload["role"] == "user"
        assert "jti" in payload
        assert payload["aud"] == APP_JWT_AUDIENCE
        assert payload["iss"] == APP_JWT_ISSUER

    def test_custom_expires_delta(self):
        data = {"sub": "user-1"}
        token = create_access_token(data, expires_delta=timedelta(hours=1))
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], audience=APP_JWT_AUDIENCE, issuer=APP_JWT_ISSUER)
        assert payload["sub"] == "user-1"

    def test_with_org_id(self):
        data = {"sub": "user-1", "org_id": "org-42"}
        token = create_access_token(data)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], audience=APP_JWT_AUDIENCE, issuer=APP_JWT_ISSUER)
        assert payload["org_id"] == "org-42"

    def test_with_custom_role(self):
        data = {"sub": "admin-user"}
        token = create_access_token(data, role="admin")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], audience=APP_JWT_AUDIENCE, issuer=APP_JWT_ISSUER)
        assert payload["role"] == "admin"


class TestCreateRefreshToken:
    def test_purpose_claim(self):
        data = {"sub": "user-1"}
        token = create_refresh_token(data)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], audience=APP_JWT_AUDIENCE, issuer=APP_JWT_ISSUER)
        assert payload["purpose"] == "refresh"
        assert payload["sub"] == "user-1"
        assert "jti" in payload

    def test_custom_expires_delta(self):
        data = {"sub": "user-1"}
        token = create_refresh_token(data, expires_delta=timedelta(days=7))
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], audience=APP_JWT_AUDIENCE, issuer=APP_JWT_ISSUER)
        assert payload["purpose"] == "refresh"

    def test_aud_iss_claims(self):
        data = {"sub": "user-1"}
        token = create_refresh_token(data)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], audience=APP_JWT_AUDIENCE, issuer=APP_JWT_ISSUER)
        assert payload["aud"] == APP_JWT_AUDIENCE
        assert payload["iss"] == APP_JWT_ISSUER


class TestCreateSecureCookieResponse:
    def test_cookie_is_set(self):
        token = create_access_token({"sub": "user-1"})
        response = create_secure_cookie_response({"ok": True}, token)
        assert response.status_code == 200
        headers = dict(response.headers)
        set_cookie = headers.get("set-cookie")
        assert set_cookie is not None
        assert "access_token=" in set_cookie
        assert "HttpOnly" in set_cookie
        assert "SameSite=lax" in set_cookie or "samesite=lax" in set_cookie

    def test_custom_status_code(self):
        token = create_access_token({"sub": "user-1"})
        response = create_secure_cookie_response({"ok": True}, token, status_code=201)
        assert response.status_code == 201

    def test_custom_expires_delta(self):
        token = create_access_token({"sub": "user-1"})
        response = create_secure_cookie_response({"ok": True}, token, expires_delta=timedelta(hours=1))
        headers = dict(response.headers)
        assert "access_token=" in headers.get("set-cookie", "")

    def test_content(self):
        token = create_access_token({"sub": "user-1"})
        response = create_secure_cookie_response({"message": "ok", "user_id": "1"}, token)
        assert response.body is not None


class TestTokenRevocation:
    @pytest.mark.asyncio
    async def test_is_token_revoked_false_initially(self):
        result = await is_token_revoked("some-jti")
        assert result is False

    @pytest.mark.asyncio
    async def test_revoke_and_check(self):
        jti = str(uuid.uuid4())
        await revoke_token(jti)
        result = await is_token_revoked(jti)
        assert result is True

    @pytest.mark.asyncio
    async def test_revoke_with_cache(self):
        jti = str(uuid.uuid4())
        cache = AsyncMock()
        await revoke_token(jti, cache=cache)
        cache.set_json.assert_called_once()
        result = await is_token_revoked(jti, cache=cache)
        assert result is True

    @pytest.mark.asyncio
    async def test_is_revoked_cache_lookup(self):
        jti = str(uuid.uuid4())
        cache = AsyncMock()
        cache.get_json.return_value = True
        result = await is_token_revoked(jti, cache=cache)
        assert result is True

    @pytest.mark.asyncio
    async def test_is_revoked_cache_miss(self):
        jti = str(uuid.uuid4())
        cache = AsyncMock()
        cache.get_json.return_value = None
        result = await is_token_revoked(jti, cache=cache)
        assert result is False


class TestNormalizeUserPayload:
    def test_valid_user(self):
        payload = {"sub": "abc123", "role": "user"}
        result = _normalize_user_payload(payload, provider="supabase")
        assert result["sub"] == "abc123"
        assert result["role"] == "user"
        assert result["auth_provider"] == "supabase"
        assert result["org_id"] is None

    def test_missing_sub_raises(self):
        with pytest.raises(HTTPException) as exc:
            _normalize_user_payload({"role": "user"}, provider="test")
        assert exc.value.status_code == 401

    def test_authenticated_mapped_to_user(self):
        payload = {"sub": "abc123", "role": "authenticated"}
        result = _normalize_user_payload(payload, provider="supabase")
        assert result["role"] == "user"

    def test_invalid_role_raises(self):
        payload = {"sub": "abc123", "role": "superadmin"}
        with pytest.raises(HTTPException) as exc:
            _normalize_user_payload(payload, provider="test")
        assert exc.value.status_code == 401

    def test_org_id_from_app_metadata(self):
        payload = {"sub": "abc123", "role": "user", "app_metadata": {"org_id": "org-99"}}
        result = _normalize_user_payload(payload, provider="supabase")
        assert result["org_id"] == "org-99"

    def test_role_from_app_metadata(self):
        payload = {"sub": "abc123", "app_metadata": {"role": "admin"}}
        result = _normalize_user_payload(payload, provider="supabase")
        assert result["role"] == "admin"


class TestDecodeAppToken:
    def test_valid_token(self):
        token = create_access_token({"sub": "user-1", "org_id": "org-1"}, role="operator")
        payload = _decode_app_token(token)
        assert payload["sub"] == "user-1"
        assert payload["role"] == "operator"
        assert payload["org_id"] == "org-1"
        assert payload["auth_provider"] == "operator_jwt"

    def test_invalid_audience_rejected(self):
        payload = {
            "sub": "user-1",
            "aud": "wrong-audience",
            "iss": APP_JWT_ISSUER,
            "role": "user",
            "jti": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc),
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        with pytest.raises(jwt.InvalidTokenError):
            _decode_app_token(token)

    def test_invalid_issuer_rejected(self):
        payload = {
            "sub": "user-1",
            "aud": APP_JWT_AUDIENCE,
            "iss": "wrong-issuer",
            "role": "user",
            "jti": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc),
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        with pytest.raises(jwt.InvalidTokenError):
            _decode_app_token(token)

    def test_expired_token_rejected(self):
        payload = {
            "sub": "user-1",
            "aud": APP_JWT_AUDIENCE,
            "iss": APP_JWT_ISSUER,
            "role": "user",
            "jti": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        with pytest.raises(jwt.ExpiredSignatureError):
            _decode_app_token(token)

    def test_invalid_role_in_token_rejected(self):
        token = create_access_token({"sub": "user-1"}, role="nonexistent_role")
        with pytest.raises(HTTPException):
            _decode_app_token(token)


class TestDecodeBearerToken:
    def test_mock_token_rejected(self):
        with pytest.raises(HTTPException) as exc:
            _decode_bearer_token("mock-jwt-token-for-hackathon")
        assert exc.value.status_code == 401

    def test_rejected_token_pattern(self):
        with pytest.raises(HTTPException):
            _decode_bearer_token("this-is-a-fake-token-for-testing")

    def test_empty_token_rejected(self):
        with pytest.raises(HTTPException):
            _decode_bearer_token("")

    def test_whitespace_token_rejected(self):
        with pytest.raises(HTTPException):
            _decode_bearer_token("   ")

    def test_valid_app_token_accepted(self):
        token = create_access_token({"sub": "user-1"})
        payload = _decode_bearer_token(token)
        assert payload["sub"] == "user-1"

    @patch("core.security.SUPABASE_JWT_SECRET", "supabase-secret")
    @patch("core.security.APP_JWT_AUDIENCE", "safevixai-internal")
    def test_supabase_token_fallback(self):
        supabase_payload = {
            "sub": "supa-user",
            "aud": "authenticated",
            "role": "user",
            "jti": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc),
        }
        supabase_token = jwt.encode(supabase_payload, "supabase-secret", algorithm=ALGORITHM)
        payload = _decode_bearer_token(supabase_token)
        assert payload["sub"] == "supa-user"
        assert payload["auth_provider"] == "supabase"


class TestGetCurrentUserOptional:
    @pytest.mark.asyncio
    async def test_no_token_returns_none(self):
        request = MagicMock()
        request.headers = {}
        request.cookies = {}
        result = await get_current_user_optional(request)
        assert result is None

    @pytest.mark.asyncio
    async def test_bearer_token_from_header(self):
        token = create_access_token({"sub": "user-1"})
        request = MagicMock()
        request.headers = {"Authorization": f"Bearer {token}"}
        request.cookies = {}
        result = await get_current_user_optional(request)
        assert result is not None
        assert result["sub"] == "user-1"

    @pytest.mark.asyncio
    async def test_token_from_cookie(self):
        token = create_access_token({"sub": "cookie-user"})
        request = MagicMock()
        request.headers = {}
        request.cookies = {"access_token": token}
        result = await get_current_user_optional(request)
        assert result is not None
        assert result["sub"] == "cookie-user"

    @pytest.mark.asyncio
    async def test_mock_token_in_header_raises(self):
        request = MagicMock()
        request.headers = {"Authorization": "Bearer mock-jwt-token-for-hackathon"}
        request.cookies = {}
        with pytest.raises(HTTPException):
            await get_current_user_optional(request)

    @pytest.mark.asyncio
    async def test_invalid_token_raises(self):
        request = MagicMock()
        request.headers = {"Authorization": "Bearer not-a-valid-jwt"}
        request.cookies = {}
        with pytest.raises(HTTPException):
            await get_current_user_optional(request)

    @pytest.mark.asyncio
    async def test_internal_api_key_bypass(self):
        with patch("core.config.get_settings") as mock_get_settings:
            settings = MagicMock()
            settings.chatbot_internal_api_key = "internal-key-123"
            settings.admin_secret = None
            mock_get_settings.return_value = settings
            request = MagicMock()
            request.headers = {"X-Internal-Api-Key": "internal-key-123"}
            request.cookies = {}
            type(request).client = PropertyMock(return_value=MagicMock(host="127.0.0.1"))
            result = await get_current_user_optional(request)
            assert result is not None
            assert result["sub"] == "chatbot-service"
            assert result["role"] == "operator"

    @pytest.mark.asyncio
    async def test_internal_admin_secret_bypass(self):
        with patch("core.config.get_settings") as mock_get_settings:
            settings = MagicMock()
            settings.chatbot_internal_api_key = None
            settings.admin_secret = "admin-secret-456"
            mock_get_settings.return_value = settings
            request = MagicMock()
            request.headers = {"X-Internal-Api-Key": "admin-secret-456"}
            request.cookies = {}
            type(request).client = PropertyMock(return_value=MagicMock(host="127.0.0.1"))
            result = await get_current_user_optional(request)
            assert result is not None
            assert result["sub"] == "admin-system"
            assert result["role"] == "admin"

    @pytest.mark.asyncio
    async def test_internal_wrong_key_no_match(self):
        with patch("core.config.get_settings") as mock_get_settings:
            settings = MagicMock()
            settings.chatbot_internal_api_key = "internal-key-123"
            settings.admin_secret = None
            mock_get_settings.return_value = settings
            request = MagicMock()
            request.headers = {"X-Internal-Api-Key": "wrong-key"}
            request.cookies = {}
            type(request).client = PropertyMock(return_value=MagicMock(host="127.0.0.1"))
            result = await get_current_user_optional(request)
            assert result is None

    @pytest.mark.asyncio
    async def test_x_service_token_header(self):
        with patch("core.config.get_settings") as mock_get_settings:
            settings = MagicMock()
            settings.chatbot_internal_api_key = "svc-token-abc"
            settings.admin_secret = None
            mock_get_settings.return_value = settings
            request = MagicMock()
            request.headers = {"X-Service-Token": "svc-token-abc"}
            request.cookies = {}
            type(request).client = PropertyMock(return_value=MagicMock(host="127.0.0.1"))
            result = await get_current_user_optional(request)
            assert result is not None
            assert result["sub"] == "chatbot-service"

    @pytest.mark.asyncio
    async def test_internal_auth_rate_limit(self):
        with patch("core.config.get_settings") as mock_get_settings:
            settings = MagicMock()
            settings.chatbot_internal_api_key = "internal-key"
            settings.admin_secret = None
            mock_get_settings.return_value = settings
            request = MagicMock()
            request.headers = {"X-Internal-Api-Key": "internal-key"}
            request.cookies = {}
            type(request).client = PropertyMock(return_value=MagicMock(host="10.0.0.1"))
            for _ in range(5):
                result = await get_current_user_optional(request)
                assert result is not None
            with pytest.raises(HTTPException) as exc:
                await get_current_user_optional(request)
            assert exc.value.status_code == 429

    @pytest.mark.asyncio
    async def test_internal_auth_no_client_ip(self):
        with patch("core.config.get_settings") as mock_get_settings:
            settings = MagicMock()
            settings.chatbot_internal_api_key = "internal-key"
            settings.admin_secret = None
            mock_get_settings.return_value = settings
            request = MagicMock()
            request.headers = {"X-Internal-Api-Key": "internal-key"}
            request.cookies = {}
            request.client = None
            result = await get_current_user_optional(request)
            assert result is not None
            assert result["sub"] == "chatbot-service"
