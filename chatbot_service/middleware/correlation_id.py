from __future__ import annotations

import contextvars
import logging
import uuid
from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("correlation_id", default="")

logger = logging.getLogger("safevixai.correlation_id")


class CorrelationIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = correlation_id_var.get() or "no-correlation-id"
        return True


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Any]) -> Response:
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())[:8]
        correlation_id_var.set(correlation_id)
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response


def generate_correlation_id() -> str:
    return str(uuid.uuid4())[:8]


def get_correlation_id() -> str:
    return correlation_id_var.get()


def setup_correlation_id(app: FastAPI) -> None:
    app.add_middleware(CorrelationIdMiddleware)
    root_logger = logging.getLogger()
    for handler in root_logger.handlers:
        if not any(isinstance(f, CorrelationIdFilter) for f in handler.filters):
            handler.addFilter(CorrelationIdFilter())
