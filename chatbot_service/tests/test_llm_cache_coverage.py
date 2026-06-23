# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""Coverage tests for cache/llm_cache.py — uncovered lines: 98-105, 108-113."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from redis.exceptions import RedisError

from cache.llm_cache import LLMResponseCache


class TestLLMResponseCacheProviderUnavailable:
    """LLMResponseCache.get_provider_unavailable_until and set (lines 98-113)."""

    @pytest.mark.asyncio
    async def test_get_provider_unavailable_no_client(self):
        """Line 98-99: no Redis client returns None."""
        cache = LLMResponseCache(None)
        result = await cache.get_provider_unavailable_until("groq")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_provider_unavailable_found(self):
        """Line 101-102: value found and returned as float."""
        mock_redis = MagicMock()
        mock_redis.get = AsyncMock(return_value="1735689600.0")
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            result = await cache.get_provider_unavailable_until("groq")
        assert result == 1735689600.0

    @pytest.mark.asyncio
    async def test_get_provider_unavailable_not_found(self):
        """Line 102: value is None returns None."""
        mock_redis = MagicMock()
        mock_redis.get = AsyncMock(return_value=None)
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            result = await cache.get_provider_unavailable_until("groq")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_provider_unavailable_redis_error(self):
        """Lines 103-105: RedisError caught and warning logged."""
        mock_redis = MagicMock()
        mock_redis.get = AsyncMock(side_effect=RedisError("Connection lost"))
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            with patch("cache.llm_cache.logger") as mock_log:
                cache = LLMResponseCache("redis://localhost:6379")
                result = await cache.get_provider_unavailable_until("groq")
        assert result is None
        mock_log.warning.assert_called()

    @pytest.mark.asyncio
    async def test_get_provider_unavailable_generic_exception(self):
        """Lines 103-105: generic exception caught."""
        mock_redis = MagicMock()
        mock_redis.get = AsyncMock(side_effect=RuntimeError("Unexpected"))
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            with patch("cache.llm_cache.logger") as mock_log:
                cache = LLMResponseCache("redis://localhost:6379")
                result = await cache.get_provider_unavailable_until("groq")
        assert result is None
        mock_log.warning.assert_called()

    @pytest.mark.asyncio
    async def test_set_provider_unavailable_no_client(self):
        """Line 108-109: no Redis client returns None/void."""
        cache = LLMResponseCache(None)
        await cache.set_provider_unavailable_until("groq", 1735689600.0, 3600)
        # Should not raise

    @pytest.mark.asyncio
    async def test_set_provider_unavailable_success(self):
        """Line 111: setex called with correct args."""
        mock_redis = MagicMock()
        mock_redis.setex = AsyncMock()
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            await cache.set_provider_unavailable_until("groq", 1735689600.0, 3600)
        mock_redis.setex.assert_called_once()
        args = mock_redis.setex.call_args[0]
        assert args[0] == "circuit:unavailable:groq"
        assert args[1] == 3600

    @pytest.mark.asyncio
    async def test_set_provider_unavailable_redis_error(self):
        """Lines 112-113: RedisError caught and warning logged."""
        mock_redis = MagicMock()
        mock_redis.setex = AsyncMock(side_effect=RedisError("Write failed"))
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            with patch("cache.llm_cache.logger") as mock_log:
                cache = LLMResponseCache("redis://localhost:6379")
                await cache.set_provider_unavailable_until("groq", 1735689600.0, 3600)
        mock_log.warning.assert_called()

    @pytest.mark.asyncio
    async def test_set_provider_unavailable_generic_exception(self):
        """Lines 112-113: generic exception caught."""
        mock_redis = MagicMock()
        mock_redis.setex = AsyncMock(side_effect=RuntimeError("Unexpected"))
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            with patch("cache.llm_cache.logger") as mock_log:
                cache = LLMResponseCache("redis://localhost:6379")
                await cache.set_provider_unavailable_until("groq", 1735689600.0, 3600)
        mock_log.warning.assert_called()


class TestLLMResponseCacheEdgeCases:
    """Additional edge cases for LLMResponseCache."""

    def test_make_key_with_tool_summaries_truncated(self):
        """Only first 4 tool summaries are hashed."""
        cache = LLMResponseCache(None)
        key1 = cache._make_key("msg", "intent", ["a", "b", "c", "d", "e", "f"])
        key2 = cache._make_key("msg", "intent", ["a", "b", "c", "d", "g", "h"])
        assert key1 == key2

    @pytest.mark.asyncio
    async def test_get_oserror_fallback(self):
        """OSError during get is caught."""
        mock_redis = MagicMock()
        mock_redis.get = AsyncMock(side_effect=OSError("Connection reset"))
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            result = await cache.get("msg", "general", [])
        assert result is None
        assert cache._healthy is False
