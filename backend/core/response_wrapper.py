import json
from datetime import datetime, timezone

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from models.schemas import ApiResponse


class ApiResponseMiddleware(BaseHTTPMiddleware):
    """Wraps all 2xx JSON responses in the ApiResponse<T> envelope."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        if not (200 <= response.status_code < 300):
            return response

        media_type = response.media_type or ""
        if "json" not in media_type:
            return response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        if not body:
            return response

        data = json.loads(body)
        wrapped = ApiResponse(
            success=True,
            data=data,
            error=None,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        return JSONResponse(
            status_code=response.status_code,
            content=wrapped.model_dump(mode="json"),
            headers=dict(response.headers),
        )
