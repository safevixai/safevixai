from __future__ import annotations

import gzip
import logging
from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("safevixai.compression")

GZIP_MIN_SIZE = 1024  # Only compress responses larger than 1KB


class GeoJSONCompressionMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        min_size: int = GZIP_MIN_SIZE,
    ) -> None:
        super().__init__(app)
        self.min_size = min_size

    async def dispatch(self, request: Request, call_next: Callable[[Request], Any]) -> Response:
        accept_encoding = request.headers.get("Accept-Encoding", "")
        supports_gzip = "gzip" in accept_encoding

        response = await call_next(request)

        if not supports_gzip:
            return response

        content_type = response.headers.get("Content-Type", "")
        is_compressible = any(
            t in content_type
            for t in ["application/json", "application/geo+json", "text/plain"]
        )

        if not is_compressible:
            return response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        if len(body) < self.min_size:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        compressed = gzip.compress(body, compresslevel=6)
        headers = dict(response.headers)
        headers["Content-Encoding"] = "gzip"
        headers["Content-Length"] = str(len(compressed))

        logger.debug(
            "Compressed %s response from %d to %d bytes (%.1f%% reduction)",
            request.url.path,
            len(body),
            len(compressed),
            (1 - len(compressed) / max(len(body), 1)) * 100,
        )

        return Response(
            content=compressed,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
        )


def setup_compression(app: FastAPI, min_size: int = GZIP_MIN_SIZE) -> None:
    app.add_middleware(GeoJSONCompressionMiddleware, min_size=min_size)
