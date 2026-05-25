from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from redis.exceptions import RedisError

from cache.llm_cache import CacheEntry, LLMResponseCache


@pytest.fixture
def mock_redis():
    client = MagicMock()
    client.get = AsyncMock()
    client.setex = AsyncMock()
    client.ping = AsyncMock()
    client.aclose = AsyncMock()
    return client


class TestCacheEntry:
    def test_default_values(self):
        entry = CacheEntry(text="hello", provider="groq", model="llama3")
        assert entry.prompt_tokens == 0
        assert entry.completion_tokens == 0
        assert entry.total_tokens == 0

    def test_all_fields(self):
        entry = CacheEntry(
            text="response",
            provider="gemini",
            model="gemini-pro",
            prompt_tokens=10,
            completion_tokens=20,
            total_tokens=30,
        )
        assert entry.total_tokens == 30


class TestLLMResponseCache:
    def test_init_no_redis(self):
        cache = LLMResponseCache(None)
        assert cache._client is None
        assert cache.backend_name == "memory"

    def test_init_with_redis(self, mock_redis):
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            assert cache._client is not None
            assert cache.backend_name == "redis"

    def test_backend_name_healthy(self, mock_redis):
        mock_redis.ping = AsyncMock(return_value=True)
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            cache._healthy = True
            assert cache.backend_name == "redis"

    def test_backend_name_unhealthy(self, mock_redis):
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            cache._healthy = False
            assert cache.backend_name == "memory"

    def test_make_key_deterministic(self, mock_redis):
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            key1 = cache._make_key("hello", "general", ["tool1", "tool2"])
            key2 = cache._make_key("hello", "general", ["tool1", "tool2"])
            assert key1 == key2
            assert key1.startswith("cache:llm:")

    def test_make_key_different_inputs(self, mock_redis):
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            key1 = cache._make_key("hello", "general", [])
            key2 = cache._make_key("world", "general", [])
            assert key1 != key2

    @pytest.mark.asyncio
    async def test_get_no_client(self):
        cache = LLMResponseCache(None)
        result = await cache.get("msg", "general", [])
        assert result is None

    @pytest.mark.asyncio
    async def test_get_cache_hit(self, mock_redis):
        mock_redis.get.return_value = '{"text": "cached", "provider": "groq", "model": "llama3", "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}'
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            result = await cache.get("msg", "general", [])
            assert result is not None
            assert result.text == "cached"

    @pytest.mark.asyncio
    async def test_get_cache_miss(self, mock_redis):
        mock_redis.get.return_value = None
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            result = await cache.get("msg", "general", [])
            assert result is None

    @pytest.mark.asyncio
    async def test_get_redis_error(self, mock_redis):
        mock_redis.get.side_effect = RedisError("Connection refused")
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            result = await cache.get("msg", "general", [])
            assert result is None
            assert cache._healthy is False

    @pytest.mark.asyncio
    async def test_get_json_decode_error(self, mock_redis):
        mock_redis.get.return_value = "invalid json"
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            result = await cache.get("msg", "general", [])
            assert result is None

    @pytest.mark.asyncio
    async def test_set_no_client(self):
        cache = LLMResponseCache(None)
        entry = CacheEntry(text="resp", provider="g", model="m")
        await cache.set("msg", "general", [], entry)

    @pytest.mark.asyncio
    async def test_set_success(self, mock_redis):
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            entry = CacheEntry(text="resp", provider="g", model="m")
            await cache.set("msg", "general", [], entry)
            mock_redis.setex.assert_called_once()

    @pytest.mark.asyncio
    async def test_set_redis_error(self, mock_redis):
        mock_redis.setex.side_effect = RedisError("Fail")
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            entry = CacheEntry(text="resp", provider="g", model="m")
            await cache.set("msg", "general", [], entry)
            assert cache._healthy is False

    @pytest.mark.asyncio
    async def test_ping_no_client(self):
        cache = LLMResponseCache(None)
        assert await cache.ping() is False

    @pytest.mark.asyncio
    async def test_ping_success(self, mock_redis):
        mock_redis.ping.return_value = True
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            assert await cache.ping() is True

    @pytest.mark.asyncio
    async def test_ping_redis_error(self, mock_redis):
        mock_redis.ping.side_effect = RedisError("Down")
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            assert await cache.ping() is False
            assert cache._healthy is False

    @pytest.mark.asyncio
    async def test_close_no_client(self):
        cache = LLMResponseCache(None)
        await cache.close()

    @pytest.mark.asyncio
    async def test_close_success(self, mock_redis):
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            await cache.close()
            mock_redis.aclose.assert_called_once()

    @pytest.mark.asyncio
    async def test_close_redis_error(self, mock_redis):
        mock_redis.aclose.side_effect = RedisError("Fail")
        with patch("cache.llm_cache.Redis.from_url", return_value=mock_redis):
            cache = LLMResponseCache("redis://localhost:6379")
            await cache.close()
