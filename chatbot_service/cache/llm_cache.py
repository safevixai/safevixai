"""C9: LLM response cache with Redis backend.

Caches identical queries to avoid redundant LLM API calls.
Uses SHA-256 hash of (message + intent + tool_summaries) as cache key.
TTL defaults to 1 hour for fresh responses.
"""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import asdict, dataclass
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

_DEFAULT_TTL_SECONDS = 3600  # 1 hour


@dataclass(slots=True)
class CacheEntry:
    text: str
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class LLMResponseCache:
    def __init__(self, redis_url: str | None, *, ttl_seconds: int = _DEFAULT_TTL_SECONDS) -> None:
        self._client = Redis.from_url(redis_url, encoding='utf-8', decode_responses=True) if redis_url else None
        self._ttl_seconds = ttl_seconds
        self._healthy = self._client is not None

    @property
    def backend_name(self) -> str:
        return 'redis' if self._healthy else 'memory'

    def _make_key(self, message: str, intent: str, tool_summaries: list[str]) -> str:
        """Create a deterministic cache key from query components."""
        payload = json.dumps({
            'message': message,
            'intent': intent,
            'tools': tool_summaries[:4],  # Only hash first 4 tool summaries
        }, sort_keys=True)
        digest = hashlib.sha256(payload.encode()).hexdigest()[:16]
        return f'cache:llm:{digest}'

    async def get(self, message: str, intent: str, tool_summaries: list[str]) -> CacheEntry | None:
        if not self._client:
            return None
        try:
            key = self._make_key(message, intent, tool_summaries)
            raw = await self._client.get(key)
            if raw:
                data = json.loads(raw)
                self._healthy = True
                return CacheEntry(**data)
        except (RedisError, json.JSONDecodeError, OSError) as exc:
            logger.warning("LLM cache GET failed: %s", exc)
            self._healthy = False
        return None

    async def set(
        self,
        message: str,
        intent: str,
        tool_summaries: list[str],
        entry: CacheEntry,
    ) -> None:
        if not self._client:
            return
        try:
            key = self._make_key(message, intent, tool_summaries)
            await self._client.setex(key, self._ttl_seconds, json.dumps(asdict(entry)))
            self._healthy = True
        except (RedisError, OSError) as exc:
            logger.warning("LLM cache SET failed: %s", exc)
            self._healthy = False

    async def ping(self) -> bool:
        if not self._client:
            return False
        try:
            await self._client.ping()
            self._healthy = True
            return True
        except (RedisError, OSError) as exc:
            logger.warning("LLM cache PING failed: %s", exc)
            self._healthy = False
            return False

    async def close(self) -> None:
        if self._client:
            try:
                await self._client.aclose()
            except (RedisError, OSError) as exc:
                logger.warning("LLM cache CLOSE failed: %s", exc)
