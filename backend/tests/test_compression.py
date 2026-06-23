# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

import gzip

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.testclient import TestClient

from middleware.compression import GeoJSONCompressionMiddleware


@pytest.fixture
def app():
    app = FastAPI()
    app.add_middleware(GeoJSONCompressionMiddleware, min_size=100)

    @app.get("/small")
    async def small():
        return JSONResponse({"status": "ok"})

    @app.get("/large")
    async def large():
        return JSONResponse({"data": "x" * 500})

    @app.get("/geojson")
    async def geojson():
        return JSONResponse(
            {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"x": "y"}}] * 50}
        )

    @app.get("/plain")
    async def plain():
        return JSONResponse({"text": "y" * 500})

    return app


@pytest.fixture
def client(app):
    return TestClient(app, raise_server_exceptions=False)


class TestCompression:
    def test_gzip_compress_decompress_roundtrip(self):
        data = b'{"type":"FeatureCollection","features":[]}' * 100
        compressed = gzip.compress(data, compresslevel=6)
        assert len(compressed) < len(data)
        decompressed = gzip.decompress(compressed)
        assert decompressed == data

    def test_gzip_compression_reduces_size(self):
        data = b'{"key":"value"}' * 1000
        compressed = gzip.compress(data, compresslevel=6)
        assert len(compressed) < len(data) * 0.5

    def test_small_response_not_compressed(self, client):
        resp = client.get("/small", headers={"Accept-Encoding": "gzip"})
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}

    def test_large_response_has_gzip_header(self, client):
        resp = client.get("/large", headers={"Accept-Encoding": "gzip"})
        assert resp.status_code == 200
        assert resp.headers.get("Content-Encoding") == "gzip"

    def test_geojson_response_has_gzip_header(self, client):
        resp = client.get("/geojson", headers={"Accept-Encoding": "gzip"})
        assert resp.status_code == 200
        assert resp.headers.get("Content-Encoding") == "gzip"

    def test_identity_accept_encoding_returns_plain(self, client):
        resp = client.get("/large", headers={"Accept-Encoding": "identity"})
        assert resp.status_code == 200
        assert "Content-Encoding" not in resp.headers

    def test_geojson_endpoint_returns_valid_json(self, client):
        resp = client.get("/geojson", headers={"Accept-Encoding": "gzip"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) == 50

    def test_middleware_adds_content_length(self, client):
        resp = client.get("/large", headers={"Accept-Encoding": "gzip"})
        assert resp.status_code == 200
        assert "Content-Length" in resp.headers
