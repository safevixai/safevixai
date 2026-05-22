from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
import jwt

import core.security as security_module
from api.v1.user import get_user_profile
from core.security import ALGORITHM, create_access_token


def test_verify_rejects_missing_token(app):
    with TestClient(app) as client:
        response = client.get('/api/v1/auth/verify')

    assert response.status_code == 401


def test_verify_rejects_static_mock_token(app):
    with TestClient(app) as client:
        response = client.get(
            '/api/v1/auth/verify',
            headers={'Authorization': 'Bearer mock-jwt-token-for-hackathon'},
        )

    assert response.status_code == 401


def test_verify_accepts_operator_jwt(app):
    token = create_access_token({'sub': 'operator@example.com', 'role': 'operator'})

    with TestClient(app) as client:
        response = client.get(
            '/api/v1/auth/verify',
            headers={'Authorization': f'Bearer {token}'},
        )

    assert response.status_code == 200
    assert response.json()['sub'] == 'operator@example.com'


def test_verify_accepts_supabase_auth_jwt(app, monkeypatch):
    import secrets
    secret = secrets.token_hex(32)
    monkeypatch.setattr(security_module, 'SUPABASE_JWT_SECRET', secret)
    monkeypatch.setattr(security_module, 'SUPABASE_JWT_AUDIENCE', 'authenticated')
    token = jwt.encode(
        {
            'sub': 'supabase-user-id',
            'aud': 'authenticated',
            'role': 'authenticated',
            'email': 'user@example.com',
            'exp': datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        secret,
        algorithm=ALGORITHM,
    )

    with TestClient(app) as client:
        response = client.get(
            '/api/v1/auth/verify',
            headers={'Authorization': f'Bearer {token}'},
        )

    assert response.status_code == 200
    assert response.json()['sub'] == 'supabase-user-id'


def test_profile_endpoint_requires_auth(app):
    with TestClient(app) as client:
        response = client.get(f'/api/v1/users/{uuid.uuid4()}')

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_profile_owner_mismatch_returns_not_found():
    from starlette.requests import Request
    from starlette.datastructures import Headers

    class EmptyResult:
        def scalar_one_or_none(self):
            return None

    class FakeSession:
        async def execute(self, _query):
            return EmptyResult()

    mock_request = Request(scope={
        "type": "http",
        "method": "GET",
        "headers": Headers().raw,
        "path": "/api/v1/users/",
    })

    with pytest.raises(HTTPException) as exc:
        await get_user_profile(
            request=mock_request,
            user_id=uuid.uuid4(),
            db=FakeSession(),  # type: ignore[arg-type]
            current_user={'sub': 'caller-user-id'},
        )

    assert exc.value.status_code == 404
