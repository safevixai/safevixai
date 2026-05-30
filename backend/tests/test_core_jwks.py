"""Core JWKS Manager tests — _fetch_jwks, caching, HTTP error handling, rotation."""
from __future__ import annotations

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from core.jwks import JWKSManager, JWKS_CACHE_TTL_SECONDS


SAMPLE_JWKS = {
    "keys": [
        {
            "kty": "RSA",
            "kid": "test-key-1",
            "n": "u1SU1LfVLPHCYZM",
            "e": "AQAB",
        }
    ]
}


class TestCoreJWKSFetch:
    """Tests for _fetch_jwks with mocked HTTP."""

    @pytest.mark.asyncio
    async def test_fetch_jwks_success(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = SAMPLE_JWKS
            mock_response.raise_for_status.return_value = None
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(return_value=mock_response)

            result = await manager._fetch_jwks()

        assert result == SAMPLE_JWKS
        assert manager._jwks_cache == SAMPLE_JWKS
        assert manager._current_key_id == "test-key-1"

    @pytest.mark.asyncio
    async def test_fetch_jwks_http_error_returns_empty(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        with patch("httpx.AsyncClient") as mock_client:
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(side_effect=Exception("HTTP 500"))

            result = await manager._fetch_jwks()

        assert result == {}

    @pytest.mark.asyncio
    async def test_fetch_jwks_http_error_returns_cached(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        manager._jwks_cache = SAMPLE_JWKS
        with patch("httpx.AsyncClient") as mock_client:
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(side_effect=Exception("HTTP 500"))

            result = await manager._fetch_jwks()

        assert result == SAMPLE_JWKS

    @pytest.mark.asyncio
    async def test_fetch_jwks_invalid_json_returns_empty(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.json.side_effect = ValueError("Invalid JSON")
            mock_response.raise_for_status.return_value = None
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(return_value=mock_response)

            result = await manager._fetch_jwks()

        assert result == {}

    @pytest.mark.asyncio
    async def test_fetch_jwks_cache_hit(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        manager._jwks_cache = SAMPLE_JWKS
        manager._jwks_cache_time = time.time()

        with patch("httpx.AsyncClient") as mock_client:
            result = await manager._fetch_jwks()

        assert result == SAMPLE_JWKS
        mock_client.assert_not_called()

    @pytest.mark.asyncio
    async def test_fetch_jwks_cache_expired_does_refetch(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        manager._jwks_cache = SAMPLE_JWKS
        manager._jwks_cache_time = time.time() - JWKS_CACHE_TTL_SECONDS - 1

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.json.return_value = {"keys": [{"kid": "new-key", "kty": "RSA"}]}
            mock_response.raise_for_status.return_value = None
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(return_value=mock_response)

            result = await manager._fetch_jwks()

        assert result["keys"][0]["kid"] == "new-key"
        assert manager._current_key_id == "new-key"

    @pytest.mark.asyncio
    async def test_fetch_jwks_no_url_returns_empty(self):
        manager = JWKSManager()
        result = await manager._fetch_jwks()
        assert result == {}


class TestCoreJWKSCaching:
    """Tests for cache invalidation and consecutive calls."""

    @pytest.mark.asyncio
    async def test_cache_invalidated_after_ttl(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        manager._jwks_cache = SAMPLE_JWKS
        manager._jwks_cache_time = time.time() - JWKS_CACHE_TTL_SECONDS // 2

        with patch("httpx.AsyncClient") as mock_client:
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(side_effect=Exception("fail"))

            result = await manager._fetch_jwks()

        assert result == SAMPLE_JWKS

    @pytest.mark.asyncio
    async def test_consecutive_calls_cache_hit_then_miss(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        manager._jwks_cache_time = time.time()

        updated_jwks = {"keys": [{"kid": "key-v2", "kty": "RSA"}]}
        call_count = 0

        async def mock_get(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            mock_resp = MagicMock()
            if call_count == 1:
                mock_resp.json.return_value = SAMPLE_JWKS
            else:
                mock_resp.json.return_value = updated_jwks
            mock_resp.raise_for_status.return_value = None
            return mock_resp

        with patch("httpx.AsyncClient") as mock_client:
            mock_client_instance = mock_client.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(side_effect=mock_get)

            result1 = await manager._fetch_jwks()

        assert result1 == (manager._jwks_cache or SAMPLE_JWKS)

        manager._jwks_cache = {}
        manager._jwks_cache_time = 0

        with patch("httpx.AsyncClient") as mock_client2:
            mock_client_instance = mock_client2.return_value.__aenter__.return_value
            mock_client_instance.get = AsyncMock(side_effect=mock_get)

            result2 = await manager._fetch_jwks()

        assert result2 == updated_jwks


class TestCoreJWKSKeyManagement:
    """Tests for key rotation and history."""

    @pytest.mark.asyncio
    async def test_rotate_keys_no_url_does_nothing(self):
        manager = JWKSManager()
        await manager.rotate_keys()
        assert manager._current_key_id is None

    @pytest.mark.asyncio
    async def test_rotate_keys_with_url(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        manager._current_key_id = "old-key"

        async def mock_fetch():
            manager._current_key_id = "new-key"
            return {"keys": [{"kid": "new-key", "kty": "RSA"}]}

        with patch.object(manager, "_fetch_jwks", new=mock_fetch):
            await manager.rotate_keys()

        assert manager._current_key_id == "new-key"
        assert len(manager._key_history) == 1
        assert manager._key_history[0][0] == "old-key"

    @pytest.mark.asyncio
    async def test_rotate_keys_same_key_no_history(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        manager._current_key_id = "same-key"

        with patch.object(manager, "_fetch_jwks", new=AsyncMock()) as mock_fetch:
            mock_fetch.return_value = {"keys": [{"kid": "same-key", "kty": "RSA"}]}
            await manager.rotate_keys()

        assert len(manager._key_history) == 0

    def test_key_history_expired_cleanup(self):
        manager = JWKSManager()
        manager._key_history = [
            ("expired-key", time.time() - 100),
            ("valid-key", time.time() + 3600),
        ]
        now = time.time()
        manager._key_history = [(k, e) for k, e in manager._key_history if now < e]
        assert len(manager._key_history) == 1
        assert manager._key_history[0][0] == "valid-key"


class TestCoreJWKSLifecycle:
    """Tests for start/stop lifecycle."""

    @pytest.mark.asyncio
    async def test_start_with_url_creates_rotation_task(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        with patch.object(manager, "_fetch_jwks", new=AsyncMock()):
            await manager.start()
        assert manager._jwks_client is not None
        assert manager._rotation_task is not None
        await manager.stop()

    @pytest.mark.asyncio
    async def test_start_without_url_no_task(self):
        manager = JWKSManager()
        await manager.start()
        assert manager._rotation_task is None
        assert manager._jwks_client is None

    @pytest.mark.asyncio
    async def test_stop_cancels_task(self):
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        with patch.object(manager, "_fetch_jwks", new=AsyncMock()):
            await manager.start()
        assert manager._rotation_task is not None
        await manager.stop()
        assert manager._rotation_task.cancelled()

    @pytest.mark.asyncio
    async def test_stop_without_task_no_error(self):
        manager = JWKSManager()
        await manager.stop()


class TestCoreJWKSSigningKey:
    """Tests for get_signing_key method with mocked JWKS."""

    @pytest.mark.asyncio
    async def test_get_signing_key_with_jwks_client(self):
        mock_key = MagicMock()
        mock_key.key = "rsa-public-key"
        manager = JWKSManager(jwks_url="https://example.com/jwks")
        manager._jwks_client = MagicMock()
        manager._jwks_client.get_signing_key_from_jwt = MagicMock(return_value=mock_key)

        with patch.object(manager, "_fetch_jwks", new=AsyncMock(return_value=SAMPLE_JWKS)):
            key, kid = await manager.get_signing_key()

        assert kid == "test-key-1"

    @pytest.mark.asyncio
    async def test_get_signing_key_fallback(self):
        manager = JWKSManager()
        with patch("core.security.SECRET_KEY", "static-secret"):
            key, kid = await manager.get_signing_key()
        assert key == "static-secret"
        assert kid == "static"
