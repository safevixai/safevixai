from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.testclient import TestClient

from middleware.query_profiler import QueryProfilerMiddleware


@pytest.fixture
def app():
    app = FastAPI()
    app.add_middleware(QueryProfilerMiddleware, threshold_ms=1)

    @app.get("/fast")
    async def fast():
        return JSONResponse({"status": "ok"})

    return app


@pytest.fixture
def client(app):
    return TestClient(app, raise_server_exceptions=False)


class TestQueryProfiler:
    def test_response_time_header(self, client):
        resp = client.get("/fast")
        assert resp.status_code == 200
        assert "X-Response-Time-Ms" in resp.headers

    def test_fast_request(self, client):
        resp = client.get("/fast")
        elapsed = float(resp.headers["X-Response-Time-Ms"])
        assert elapsed >= 0

    def test_json_response(self, client):
        resp = client.get("/fast")
        assert resp.json() == {"status": "ok"}
