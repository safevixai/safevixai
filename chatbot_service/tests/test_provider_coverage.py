"""Coverage tests for provider files: groq_provider, sarvam_provider, base."""
from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from providers.base import (
    HttpProvider,
    ProviderRequest,
    QuotaExhaustedError,
    RateLimitError,
    _enforce_token_budget,
    _sanitize_rag_snippet,
    raise_for_provider_status,
)
from providers.groq_provider import GroqProvider
from providers.sarvam_provider import SarvamProvider


class TestGroqProviderGenerateErrors:
    """GroqProvider.generate() — empty choices, empty content, non-data SSE lines."""

    @pytest.fixture
    def groq(self) -> GroqProvider:
        return GroqProvider()

    @pytest.fixture
    def preq(self) -> ProviderRequest:
        return ProviderRequest(message="test", intent="general", history=[])

    @pytest.mark.asyncio
    async def test_empty_choices(self, groq: GroqProvider, preq: ProviderRequest) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": []}
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            with patch.object(groq, "_get_client", return_value=mock_client):
                with pytest.raises(RuntimeError, match="empty choices"):
                    await groq.generate(preq)

    @pytest.mark.asyncio
    async def test_empty_content(self, groq: GroqProvider, preq: ProviderRequest) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": [{"message": {"content": ""}}]}
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            with patch.object(groq, "_get_client", return_value=mock_client):
                with pytest.raises(RuntimeError, match="empty content"):
                    await groq.generate(preq)

    @pytest.mark.asyncio
    async def test_stream_skip_non_data_line(self, groq: GroqProvider, preq: ProviderRequest) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200

        async def mock_aiter_text():
            yield "not-a-data-line\n"
            yield 'data: {"choices":[{"delta":{"content":"works"}}]}\n'
            yield "data: [DONE]\n"

        mock_response.aiter_text = mock_aiter_text
        mock_client = MagicMock()
        mock_client.stream.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_client.stream.return_value.__aexit__ = AsyncMock(return_value=False)

        with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}):
            with patch.object(groq, "_get_client", return_value=mock_client):
                chunks = [c async for c in groq.stream(preq)]
        assert chunks == ["works"]


class TestSarvamProviderGenerateErrors:
    """SarvamProvider.generate() — empty choices, empty content."""

    @pytest.fixture
    def sarvam(self) -> SarvamProvider:
        return SarvamProvider()

    @pytest.fixture
    def preq(self) -> ProviderRequest:
        return ProviderRequest(message="test", intent="general", history=[])

    @pytest.mark.asyncio
    async def test_empty_choices(self, sarvam: SarvamProvider, preq: ProviderRequest) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": []}
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch.dict(os.environ, {"HF_TOKEN": "test-token", "SARVAM_API_KEY": ""}):
            with patch.object(sarvam, "_get_client", return_value=mock_client):
                with pytest.raises(RuntimeError, match="empty choices"):
                    await sarvam.generate(preq)

    @pytest.mark.asyncio
    async def test_empty_content(self, sarvam: SarvamProvider, preq: ProviderRequest) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"choices": [{"message": {"content": ""}}]}
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch.dict(os.environ, {"HF_TOKEN": "test-token", "SARVAM_API_KEY": ""}):
            with patch.object(sarvam, "_get_client", return_value=mock_client):
                with pytest.raises(RuntimeError, match="empty content"):
                    await sarvam.generate(preq)


class TestRaiseForProviderStatus:
    """raise_for_provider_status — non-numeric Retry-After, 402 QuotaExhausted."""

    def test_non_numeric_retry_after(self):
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 429
        resp.headers = {"Retry-After": "invalid"}
        resp.text = ""
        with pytest.raises(RateLimitError) as exc:
            raise_for_provider_status(resp, provider="test", model="m")
        assert exc.value.retry_after == 60

    def test_quota_exhausted(self):
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 402
        resp.text = ""
        with pytest.raises(QuotaExhaustedError, match="test quota exhausted"):
            raise_for_provider_status(resp, provider="test", model="m")


class TestSanitizeRagSnippet:
    """_sanitize_rag_snippet — truncation at 400 chars with '…'."""

    def test_truncates_long_snippet(self):
        long = "a" * 450
        result = _sanitize_rag_snippet(long)
        assert len(result) == 401
        assert result.endswith("\u2026")


class TestEnforceTokenBudget:
    """_enforce_token_budget — snippet truncation when budget exceeded."""

    def test_truncates_snippets_when_budget_exceeded(self):
        request = ProviderRequest(
            message="hi",
            intent="general",
            history=[],
            document_snippets=["a" * 10000, "b" * 10000],
        )
        result = _enforce_token_budget(request)
        assert len(result.document_snippets) == 1

    def test_preserves_all_snippets_within_budget(self):
        request = ProviderRequest(
            message="hi",
            intent="general",
            history=[],
            document_snippets=["short", "tiny"],
        )
        result = _enforce_token_budget(request)
        assert len(result.document_snippets) == 2


class TestHttpProviderStreamMalformedJson:
    """HttpProvider.stream() — malformed SSE JSON is skipped."""

    @pytest.mark.asyncio
    async def test_skips_malformed_json(self):
        class TestProvider(HttpProvider):
            name = "test"
            def api_key_env(self): return "TEST_API_KEY"
            def base_url(self): return "http://test"
            def default_model(self): return "test-model"

        provider = TestProvider()
        req = ProviderRequest(message="hi", intent="general", history=[])
        mock_response = MagicMock()
        mock_response.status_code = 200

        async def mock_aiter_text():
            yield "data: {not-json}\n"
            yield 'data: {"choices":[{"delta":{"content":"After error"}}]}\n'
            yield "data: [DONE]\n"

        mock_response.aiter_text = mock_aiter_text
        mock_client = MagicMock()
        mock_client.stream.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_client.stream.return_value.__aexit__ = AsyncMock(return_value=False)

        with patch.dict(os.environ, {"TEST_API_KEY": "key", "TEST_MODEL": ""}):
            with patch.object(provider, "_get_client", return_value=mock_client):
                chunks = [c async for c in provider.stream(req)]
        assert chunks == ["After error"]
