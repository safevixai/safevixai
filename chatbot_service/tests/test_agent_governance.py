"""Coverage tests for agent/governance.py."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agent.governance import AIGovernance, GovernanceResult


class TestAIGovernanceCoverage:
    """Cover missing branches in governance.py."""

    @pytest.fixture
    def gov(self):
        return AIGovernance(redis_url=None)

    def test_detect_hallucination_empty_response(self, gov):
        """Empty response text yields 0.0."""
        score = gov._detect_hallucination("", [{"content": "some context"}])
        assert score == 0.0

    def test_score_factuality_no_facts(self, gov):
        """Tools with no string payload values yields neutral 0.5."""
        score = gov._score_factuality("response", [{"name": "test", "payload": {"num": 42}}])
        assert score == 0.5

    @pytest.mark.asyncio
    async def test_audit_log_to_redis(self):
        """_log_audit writes JSON to Redis rpush and sets expire."""
        mock_redis = AsyncMock(spec_set=["rpush", "expire"])
        mock_redis.rpush = AsyncMock()
        mock_redis.expire = AsyncMock()
        gov = AIGovernance(redis_url="redis://localhost:6379/0")
        gov._redis = mock_redis

        result = GovernanceResult(
            text="test",
            prompt_version="v1",
            hallucination_score=0.8,
            factuality_score=0.9,
            flagged=False,
            flag_reason=None,
            citations=["src.pdf"],
            cost_estimate=0.01,
        )
        await gov._log_audit(result, "some prompt")

        mock_redis.rpush.assert_awaited_once()
        args, _ = mock_redis.rpush.call_args
        assert args[0] == "audit:ai_governance"
        entry = json.loads(args[1])
        assert entry["prompt_version"] == "v1"
        assert entry["hallucination_score"] == 0.8
        assert entry["factuality_score"] == 0.9
        assert entry["flagged"] is False

        mock_redis.expire.assert_awaited_once_with("audit:ai_governance", 86400 * 30)

    def test_score_factuality_empty_tools(self, gov):
        """Empty tools list yields neutral 0.5."""
        score = gov._score_factuality("response", [])
        assert score == 0.5
