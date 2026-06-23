# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("safevixai.query_profiler")

SLOW_QUERY_THRESHOLD_MS = 500


class QueryProfilerMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: FastAPI,
        threshold_ms: int = SLOW_QUERY_THRESHOLD_MS,
    ) -> None:
        super().__init__(app)
        self.threshold_ms = threshold_ms

    async def dispatch(self, request: Request, call_next: Callable[[Request], Any]) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        elapsed_ms = (time.monotonic() - start) * 1000

        if elapsed_ms > self.threshold_ms:
            logger.warning(
                "SLOW QUERY: %s %s completed in %.0fms (threshold: %dms)",
                request.method,
                request.url.path,
                elapsed_ms,
                self.threshold_ms,
            )
        else:
            logger.debug(
                "QUERY: %s %s completed in %.0fms",
                request.method,
                request.url.path,
                elapsed_ms,
            )

        response.headers["X-Response-Time-Ms"] = str(round(elapsed_ms, 1))
        return response


def setup_query_profiler(app: FastAPI, threshold_ms: int = SLOW_QUERY_THRESHOLD_MS) -> None:
    app.add_middleware(QueryProfilerMiddleware, threshold_ms=threshold_ms)
