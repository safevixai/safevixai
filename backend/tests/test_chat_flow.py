from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from core.config import Settings
from models.schemas import ChatRequest, ChatResponse
from services.llm_service import LLMService


class FakeChatService:
    async def send_message(self, payload):
        return ChatResponse(
            response=f"Handled: {payload.message}",
            intent="general",
            sources=["unit:test"],
            session_id=payload.session_id or "generated-session",
        )


class TimeoutChatService:
    async def send_message(self, payload):
        await asyncio.sleep(10)
        raise AssertionError("Should have timed out")


class ErrorChatService:
    async def send_message(self, payload):
        raise RuntimeError("Chatbot service unavailable")


def test_chat_proxy_success(app, auth_headers):
    with TestClient(app) as client:
        client.app.state.llm_service = FakeChatService()
        response = client.post(
            "/api/v1/chat/",
            json={"message": "What is Section 185?", "session_id": "session-123"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    body = response.json()
    payload = body.get("data", body)
    assert payload["response"] == "Handled: What is Section 185?"
    assert payload["intent"] == "general"
    assert payload["sources"] == ["unit:test"]
    assert payload["session_id"] == "session-123"


def test_chat_unauthorized(app):
    with TestClient(app) as client:
        client.app.state.llm_service = FakeChatService()
        response = client.post(
            "/api/v1/chat/",
            json={"message": "What is Section 185?"},
        )

    assert response.status_code in (401, 403)


def test_chat_timeout_fallback(app, auth_headers):
    with TestClient(app) as client:
        client.app.state.llm_service = TimeoutChatService()
        response = client.post(
            "/api/v1/chat/",
            json={
                "message": "I need help after an accident",
                "session_id": "timeout-session",
            },
            headers=auth_headers,
        )

    assert response.status_code == 200
    body = response.json()
    payload = body.get("data", body)
    assert "fallback" in payload["sources"][0] or "unavailable" in payload["response"].lower()


def test_chat_error_fallback(app, auth_headers):
    with TestClient(app) as client:
        client.app.state.llm_service = ErrorChatService()
        response = client.post(
            "/api/v1/chat/",
            json={
                "message": "I need ambulance help",
                "session_id": "error-session",
            },
            headers=auth_headers,
        )

    assert response.status_code == 200
    body = response.json()
    payload = body.get("data", body)
    assert "fallback" in payload["sources"][0] or "unavailable" in payload["response"].lower()


def test_chat_message_length_validation(app, auth_headers):
    with TestClient(app) as client:
        client.app.state.llm_service = FakeChatService()
        long_message = "x" * 5000
        response = client.post(
            "/api/v1/chat/",
            json={"message": long_message, "session_id": "long-session"},
            headers=auth_headers,
        )

    assert response.status_code == 422


def test_chat_stream_endpoint_exists(app, auth_headers):
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/chat/stream",
            json={"message": "Hello", "session_id": "stream-session"},
            headers=auth_headers,
        )

    assert response.status_code in (200, 405, 501)


@pytest.mark.asyncio
async def test_llm_service_emergency_fallback():
    service = LLMService(Settings(chatbot_request_timeout_seconds=0.01))
    await service._client.aclose()

    class SlowClient:
        async def post(self, *args, **kwargs):
            await asyncio.sleep(0.05)
            raise AssertionError("wait_for should timeout")

    service._client = SlowClient()

    response = await service.send_message(
        ChatRequest(message="Need ambulance help", session_id="emergency-timeout")
    )

    assert response.intent == "emergency"
    assert response.session_id == "emergency-timeout"
    assert response.sources == ["fallback:emergency"]


@pytest.mark.asyncio
async def test_llm_service_challan_fallback():
    service = LLMService(Settings(chatbot_request_timeout_seconds=0.01))
    await service._client.aclose()

    class SlowClient:
        async def post(self, *args, **kwargs):
            await asyncio.sleep(0.05)
            raise AssertionError("wait_for should timeout")

    service._client = SlowClient()

    response = await service.send_message(
        ChatRequest(message="What is the fine for section 185?", session_id="challan-timeout")
    )

    assert response.intent == "challan"
    assert response.sources == ["fallback:challan"]
