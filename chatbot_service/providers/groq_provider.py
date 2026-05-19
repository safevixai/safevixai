"""Groq Cloud provider — llama-3.1-8b-instant at 300+ tok/s.
Free tier: 14,400 req/day, 500K tok/day, 6,000 TPM. Sign up: console.groq.com
Env vars: GROQ_API_KEY, GROQ_MODEL (optional, default: llama-3.1-8b-instant)

P0-05 FIX (audit C5): Groq free tier = 6,000 TPM.
At MAX_RESPONSE_TOKENS=800 and 20 RPM that's 16,000 TPM — 2.67x the free limit.
Fix: Cap MAX_RESPONSE_TOKENS at 400 for Groq, skip if estimated context > 4,000 tokens.
"""
from __future__ import annotations

import logging

from providers.base import HttpProvider, ProviderRequest, ProviderResult, build_messages

logger = logging.getLogger(__name__)

# Groq-specific token limits (free tier)
_GROQ_MAX_RESPONSE_TOKENS = 400   # halved from 800 to stay within 6000 TPM at 20 RPM
_GROQ_TPM_GUARD = 4_000           # skip Groq if estimated total tokens exceed this


def _estimate_tokens(text: str) -> int:
    """Heuristic token estimator: ~4 chars per token (close enough for guards)."""
    return max(1, len(text) // 4)


def _estimate_request_tokens(request: ProviderRequest) -> int:
    """Estimate total token count for a provider request."""
    messages = build_messages(request)
    total_chars = sum(len(m.get("content", "")) for m in messages)
    return _estimate_tokens(total_chars) + _GROQ_MAX_RESPONSE_TOKENS


class GroqProvider(HttpProvider):
    """Primary provider — fastest for English queries.

    Overrides generate() to:
    1. Skip if estimated context > _GROQ_TPM_GUARD tokens (C5 fix)
    2. Use reduced MAX_RESPONSE_TOKENS to stay within 6000 TPM free tier
    """

    name = "groq"

    def api_key_env(self) -> str:
        return "GROQ_API_KEY"

    def base_url(self) -> str:
        return "https://api.groq.com/openai/v1/chat/completions"

    def default_model(self) -> str:
        return "llama-3.1-8b-instant"

    async def generate(self, request: ProviderRequest) -> ProviderResult:
        # P0-05: Skip Groq if estimated tokens would exceed TPM guard
        estimated = _estimate_request_tokens(request)
        if estimated > _GROQ_TPM_GUARD:
            logger.info(
                "Groq skipped: estimated ~%d tokens exceeds %d TPM guard. "
                "Passing to next provider.",
                estimated,
                _GROQ_TPM_GUARD,
            )
            from providers.base import ProviderUnavailableError
            raise ProviderUnavailableError(
                f"groq: context too large (~{estimated} tokens). "
                "Skipping to preserve free-tier TPM budget."
            )

        # Use Groq-specific reduced response token limit
        import os
        api_key = self._get_api_key()
        model = (
            os.getenv("GROQ_MODEL", "").strip() or self.default_model()
        )

        from providers.base import (
            MAX_RESPONSE_TOKENS,
            build_messages,
            raise_for_provider_status,
            check_prompt_injection,
            ProviderResult,
        )

        if check_prompt_injection(request.message):
            logger.warning("Groq: prompt injection blocked. Message: %.50s...", request.message)
            return ProviderResult(
                text=(
                    "I cannot fulfill this request. I am SafeVixAI, an AI assistant "
                    "focused strictly on Indian road safety and emergency response."
                ),
                provider=self.name,
                model="safety-filter",
            )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": build_messages(request),
            # P0-05: Use reduced token limit for Groq free tier
            "max_tokens": _GROQ_MAX_RESPONSE_TOKENS,
            "temperature": 0.5,
        }

        resp = await self._get_client().post(self.base_url(), headers=headers, json=payload)
        raise_for_provider_status(resp, provider=self.name, model=model)
        data = resp.json()
        text = data["choices"][0]["message"]["content"]

        usage = data.get("usage", {})
        total_tokens = usage.get("total_tokens", 0)
        logger.debug("Groq used %d tokens (limit guard: %d)", total_tokens, _GROQ_TPM_GUARD)

        return ProviderResult(text=text, provider=self.name, model=model)
