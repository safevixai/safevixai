"""AI Governance Framework for SafeVixAI Chatbot.

Implements:
- Hallucination detection (cross-reference with RAG sources)
- Prompt versioning and audit trail
- Factuality scoring
- Response validation against knowledge base
- Cost tracking per request

Phase 0.7: Ensures AI outputs are reliable, auditable, and compliant.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

# Thresholds for hallucination detection
_HALLUCINATION_THRESHOLD = 0.6  # Minimum relevance score to trust response
_FACTUALITY_MIN_SCORE = 0.7  # Minimum factuality score to accept response


@dataclass(slots=True)
class GovernanceResult:
    """Result of AI governance checks."""
    text: str
    hallucination_score: float = 0.0
    factuality_score: float = 0.0
    citations: list[str] = field(default_factory=list)
    flagged: bool = False
    flag_reason: str | None = None
    prompt_version: str = "v1"
    cost_estimate: float = 0.0


class AIGovernance:
    """AI governance engine for SafeVixAI chatbot."""

    def __init__(self, redis_url: str | None) -> None:
        self._redis = Redis.from_url(redis_url, encoding='utf-8', decode_responses=True) if redis_url else None
        self._prompt_versions: dict[str, str] = {}  # version -> prompt hash

    async def evaluate(
        self,
        response_text: str,
        retrieved_context: list[dict],
        tool_results: list[dict],
        prompt: str,
    ) -> GovernanceResult:
        """Evaluate AI response for hallucination, factuality, and compliance."""
        result = GovernanceResult(text=response_text)

        # 1. Hallucination detection
        result.hallucination_score = self._detect_hallucination(response_text, retrieved_context)
        
        # 2. Factuality scoring
        result.factuality_score = self._score_factuality(response_text, tool_results)
        
        # 3. Citation extraction
        result.citations = self._extract_citations(response_text, retrieved_context)
        
        # 4. Flag if below thresholds
        if result.hallucination_score < _HALLUCINATION_THRESHOLD:
            result.flagged = True
            result.flag_reason = "Low relevance to retrieved context"
        elif result.factuality_score < _FACTUALITY_MIN_SCORE:
            result.flagged = True
            result.flag_reason = "Low factuality score"
        
        # 5. Prompt versioning
        result.prompt_version = self._get_prompt_version(prompt)
        
        # 6. Log for audit
        await self._log_audit(result, prompt)
        
        return result

    def _detect_hallucination(self, response: str, context: list[dict]) -> float:
        """Detect hallucination by checking if response is supported by context.
        
        Returns a score between 0 and 1, where 1 means fully supported.
        """
        if not context:
            return 0.0
        
        # Simple keyword overlap heuristic
        response_words = set(response.lower().split())
        context_words = set()
        for item in context:
            context_words.update(item.get("content", "").lower().split())
        
        if not response_words:
            return 0.0
        
        overlap = len(response_words & context_words) / len(response_words)
        return min(1.0, overlap * 1.5)  # Scale up slightly

    def _score_factuality(self, response: str, tools: list[dict]) -> float:
        """Score factuality based on tool result alignment.
        
        Returns a score between 0 and 1.
        """
        if not tools:
            return 0.5  # Neutral if no tools used
        
        # Check if response mentions tool-provided facts
        tool_facts = []
        for tool in tools:
            if "payload" in tool:
                payload = tool["payload"]
                if isinstance(payload, dict):
                    tool_facts.extend(str(v).lower() for v in payload.values() if isinstance(v, str))
        
        if not tool_facts:
            return 0.5
        
        response_lower = response.lower()
        matches = sum(1 for fact in tool_facts if fact in response_lower)
        return min(1.0, matches / max(1, len(tool_facts)))

    def _extract_citations(self, response: str, context: list[dict]) -> list[str]:
        """Extract citations from response that match context sources."""
        citations = []
        for item in context:
            source = item.get("source", "")
            title = item.get("title", "")
            if source and source not in citations:
                citations.append(source)
            if title and title not in citations:
                citations.append(title)
        return citations[:5]  # Max 5 citations

    def _get_prompt_version(self, prompt: str) -> str:
        """Get or create prompt version hash."""
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:8]
        
        # Check if we've seen this prompt before
        for version, hash_val in self._prompt_versions.items():
            if hash_val == prompt_hash:
                return version
        
        # New prompt version
        version = f"v{len(self._prompt_versions) + 1}"
        self._prompt_versions[version] = prompt_hash
        return version

    async def _log_audit(self, result: GovernanceResult, prompt: str) -> None:
        """Log governance result for audit trail."""
        if not self._redis:
            return
        
        try:
            audit_entry = {
                "timestamp": time.time(),
                "prompt_version": result.prompt_version,
                "hallucination_score": result.hallucination_score,
                "factuality_score": result.factuality_score,
                "flagged": result.flagged,
                "flag_reason": result.flag_reason,
                "citations": result.citations,
                "cost_estimate": result.cost_estimate,
            }
            
            # Store in Redis with 30-day TTL
            await self._redis.rpush(
                "audit:ai_governance",
                json.dumps(audit_entry)
            )
            await self._redis.expire("audit:ai_governance", 86400 * 30)
        except Exception as e:
            logger.warning("Failed to log AI governance audit: %s", e)

    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            await self._redis.aclose()
