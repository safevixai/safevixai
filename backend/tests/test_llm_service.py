# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""Tests for LLMService."""

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from core.config import Settings
from models.schemas import ChatRequest, ChatResponse
from services.llm_service import LLMService


@pytest.fixture
def settings():
    s = MagicMock(spec=Settings)
    s.chatbot_service_url = "http://localhost:8010/api/v1"
    s.chatbot_request_timeout_seconds = 20.0
    s.http_user_agent = "SafeVixAI/1.0"
    s.chatbot_internal_api_key = None
    return s


class TestConstructor:
    def test_creates_client_with_correct_config(self, settings):
        with patch("services.llm_service.httpx.AsyncClient") as mock_cls:
            LLMService(settings)

        mock_cls.assert_called_once_with(
            base_url="http://localhost:8010/api/v1",
            timeout=20.0,
            headers={
                "Accept": "application/json",
                "User-Agent": "SafeVixAI/1.0",
            },
        )

    def test_with_internal_api_key_sets_header(self, settings):
        settings.chatbot_internal_api_key = "secret-123"
        with patch("services.llm_service.httpx.AsyncClient") as mock_cls:
            LLMService(settings)

        _, kwargs = mock_cls.call_args
        assert kwargs["headers"]["X-Internal-Api-Key"] == "secret-123"

    def test_without_internal_api_key_omits_header(self, settings):
        settings.chatbot_internal_api_key = None
        with patch("services.llm_service.httpx.AsyncClient") as mock_cls:
            LLMService(settings)

        _, kwargs = mock_cls.call_args
        assert "X-Internal-Api-Key" not in kwargs["headers"]


class TestAclose:
    async def test_aclose_cleans_up_client(self, settings):
        mock_client = AsyncMock()
        with patch("services.llm_service.httpx.AsyncClient", return_value=mock_client):
            service = LLMService(settings)

        await service.aclose()

        mock_client.aclose.assert_awaited_once()


class TestSendMessage:
    @pytest.fixture(autouse=True)
    def _patch_json(self):
        with patch("services.llm_service.json", create=True) as mock_json:
            mock_json.JSONDecodeError = json.JSONDecodeError
            yield

    @pytest.fixture
    def service(self, settings):
        instance = MagicMock()
        with patch("services.llm_service.httpx.AsyncClient", return_value=instance):
            svc = LLMService(settings)
        return svc

    async def test_success(self, service):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.json.return_value = {
            "response": "I can help!",
            "intent": "general",
            "sources": ["chatbot"],
            "session_id": "sess-abc",
        }
        service._client.post = AsyncMock(return_value=mock_resp)

        result = await service.send_message(ChatRequest(message="hello"))

        service._client.post.assert_awaited_once_with(
            "/chat/",
            json={"message": "hello"},
        )
        assert isinstance(result, ChatResponse)
        assert result.response == "I can help!"
        assert result.intent == "general"
        assert result.sources == ["chatbot"]
        assert result.session_id == "sess-abc"

    async def test_timeout_returns_fallback(self, service):
        service._client.post = AsyncMock(side_effect=asyncio.TimeoutError)

        result = await service.send_message(ChatRequest(message="hello"))

        assert result.intent == "fallback"

    async def test_http_4xx_returns_fallback(self, service):
        exc = httpx.HTTPStatusError(
            "Not Found",
            request=MagicMock(),
            response=MagicMock(),
        )
        exc.response.status_code = 404
        service._client.post = AsyncMock(side_effect=exc)

        result = await service.send_message(ChatRequest(message="hello"))

        assert result.intent == "fallback"

    async def test_http_5xx_returns_fallback(self, service):
        exc = httpx.HTTPStatusError(
            "Server Error",
            request=MagicMock(),
            response=MagicMock(),
        )
        exc.response.status_code = 500
        service._client.post = AsyncMock(side_effect=exc)

        result = await service.send_message(ChatRequest(message="hello"))

        assert result.intent == "fallback"

    async def test_request_error_returns_fallback(self, service):
        service._client.post = AsyncMock(
            side_effect=httpx.RequestError("connection refused"),
        )

        result = await service.send_message(ChatRequest(message="hello"))

        assert result.intent == "fallback"

    async def test_bad_json_returns_fallback(self, service):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.json.side_effect = json.JSONDecodeError("bad json", "doc", 0)
        service._client.post = AsyncMock(return_value=mock_resp)

        result = await service.send_message(ChatRequest(message="hello"))

        assert result.intent == "fallback"

    async def test_invalid_response_format_returns_fallback(self, service):
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.json.return_value = {"invalid": "data"}
        service._client.post = AsyncMock(return_value=mock_resp)

        result = await service.send_message(ChatRequest(message="hello"))

        assert result.intent == "fallback"

    async def test_session_id_auto_generated_on_fallback(self, service):
        service._client.post = AsyncMock(side_effect=httpx.RequestError("error"))

        result = await service.send_message(ChatRequest(message="hi"))

        assert result.session_id is not None
        assert len(result.session_id) == 36
        assert "-" in result.session_id

    async def test_session_id_preserved_on_fallback(self, service):
        service._client.post = AsyncMock(side_effect=httpx.RequestError("error"))

        result = await service.send_message(
            ChatRequest(message="hi", session_id="keep-this"),
        )

        assert result.session_id == "keep-this"


class TestFallbackResponse:
    @pytest.fixture
    def service(self, settings):
        with patch("services.llm_service.httpx.AsyncClient"):
            return LLMService(settings)

    def _check(self, service, message, expected_intent):
        request = ChatRequest(message=message)
        result = service._fallback_response(request, session_id="sid-1")
        assert result.intent == expected_intent
        return result

    def test_ambulance_returns_emergency(self, service):
        result = self._check(service, "I need an ambulance", "emergency")
        assert "112" in result.response
        assert result.sources == ["fallback:emergency"]

    def test_hospital_returns_emergency(self, service):
        self._check(service, "nearest hospital", "emergency")

    def test_accident_returns_emergency(self, service):
        self._check(service, "accident on highway", "emergency")

    def test_sos_returns_emergency(self, service):
        self._check(service, "sos help me", "emergency")

    def test_emergency_returns_emergency(self, service):
        self._check(service, "this is an emergency", "emergency")

    def test_fine_for_speeding_returns_challan(self, service):
        result = self._check(service, "what's the fine for speeding", "challan")
        assert result.sources == ["fallback:challan"]

    def test_drunk_driving_fine_returns_challan(self, service):
        self._check(service, "fine for drunk driving", "challan")

    def test_helmet_returns_challan(self, service):
        self._check(service, "helmet fine", "challan")

    def test_section_185_returns_challan(self, service):
        self._check(service, "section 185 penalty", "challan")

    def test_seatbelt_returns_challan(self, service):
        self._check(service, "what is the seatbelt fine", "challan")

    def test_weather_returns_fallback(self, service):
        result = self._check(service, "what's the weather", "fallback")
        assert result.sources == ["fallback:service"]

    def test_greeting_returns_fallback(self, service):
        self._check(service, "hello", "fallback")

    def test_non_matching_returns_fallback(self, service):
        self._check(service, "how are you", "fallback")
