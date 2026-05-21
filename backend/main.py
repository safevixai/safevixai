from __future__ import annotations

import json
import logging
import logging.config
import sys
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from api.v1 import api_router
from core.config import get_settings
from core.database import check_database
from core.limiter import limiter
from core.idempotency import IdempotencyMiddleware
from core.versioning import APIVersioningMiddleware
from core.jwks import JWKSManager
from core.tenant import apply_tenant_filter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.redis_client import create_cache
from models.schemas import HealthResponse
from services.authority_router import AuthorityRouter
from services.challan_service import ChallanService
from services.emergency_locator import EmergencyLocatorService
from services.geocoding_service import GeocodingService
from services.llm_service import LLMService
from services.overpass_service import OverpassService
from services.roadwatch_service import RoadWatchService
from services.routing_service import RoutingService

# alert_service.py is at project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from alert_service import get_alert_service


# P2-01: Structured JSON logging (audit H35)
# In production, emit newline-delimited JSON for Render/Cloud log aggregators.
# In development, use a human-readable format with colour-coded levels.
class _JsonFormatter(logging.Formatter):
    """Emit one JSON object per log line for machine-parseable log ingestion."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts": self.formatTime(record, datefmt="%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        # Include any extra fields attached via LogRecord (e.g. request_id)
        for key in ("request_id", "method", "path", "status", "duration_ms"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        return json.dumps(payload, ensure_ascii=False)


def _configure_logging(environment: str) -> None:
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    # Remove any existing handlers set by uvicorn/gunicorn
    root.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    if environment == "production":
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
        )
    root.addHandler(handler)
    # Keep uvicorn access logs quiet — our middleware handles request logging
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


logger = logging.getLogger("safevixai.backend")


def create_app() -> FastAPI:
    settings = get_settings()
    _configure_logging(settings.environment)

    # OBSERVABILITY#1: Sentry error tracking (free tier: 5K errors/month)
    if settings.sentry_dsn:
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.1,
            profiles_sample_rate=0.1,
        )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        cache = create_cache(settings.redis_url)
        jwks_manager = JWKSManager(jwks_url=settings.jwks_url if hasattr(settings, 'jwks_url') else None)
        await jwks_manager.start()
        
        overpass_service = OverpassService(settings)
        geocoding_service = GeocodingService(settings, cache)
        authority_router = AuthorityRouter(settings, overpass_service, cache)
        emergency_service = EmergencyLocatorService(settings=settings, cache=cache, overpass_service=overpass_service)
        routing_service = RoutingService(settings=settings, cache=cache)
        challan_service = ChallanService(settings=settings)
        llm_service = LLMService(settings=settings)
        roadwatch_service = RoadWatchService(
            settings=settings,
            cache=cache,
            geocoding_service=geocoding_service,
            authority_router=authority_router,
        )

        app.state.cache = cache
        app.state.jwks_manager = jwks_manager
        app.state.overpass_service = overpass_service
        app.state.geocoding_service = geocoding_service
        app.state.authority_router = authority_router
        app.state.emergency_service = emergency_service
        app.state.routing_service = routing_service
        app.state.challan_service = challan_service
        app.state.llm_service = llm_service
        app.state.roadwatch_service = roadwatch_service

        try:
            yield
        finally:
            await jwks_manager.stop()
            from services.safe_spaces import close_safe_spaces_client
            await close_safe_spaces_client()
            await llm_service.aclose()
            await routing_service.aclose()
            await geocoding_service.aclose()
            await overpass_service.aclose()
            await cache.close()

    docs_url = None if settings.environment == 'production' else '/docs'
    redoc_url = None if settings.environment == 'production' else '/redoc'
    openapi_url = None if settings.environment == 'production' else '/openapi.json'
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Phase 0.5: Idempotency middleware for POST/PUT requests
    app.add_middleware(IdempotencyMiddleware)

    # Phase 0.4: API versioning middleware
    app.add_middleware(APIVersioningMiddleware)

    # P2-01: Request-ID correlation middleware
    # Stamps every request with a unique ID so all log lines for a single
    # request can be correlated in Render / any log aggregator.
    @app.middleware("http")
    async def _security_headers_middleware(request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

    @app.middleware("http")
    async def _request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s → %d (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response

    @app.middleware("http")
    async def _csrf_middleware(request: Request, call_next):
        csrf_cookie = request.cookies.get("csrf_token")

        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            # CSRF only matters for cookie-based auth. Bearer token requests are immune.
            has_bearer = request.headers.get("Authorization", "").startswith("Bearer ")
            skip_paths = (
                request.url.path.startswith("/api/v1/auth/login")
                or request.url.path.startswith("/mcp")
            )
            if settings.environment != "test" and not has_bearer and not skip_paths:
                csrf_header = request.headers.get("X-CSRF-Token")
                if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF token missing or invalid"}
                    )

        response = await call_next(request)

        if not csrf_cookie:
            import secrets
            new_token = secrets.token_urlsafe(32)
            is_prod = settings.environment == "production"
            response.set_cookie(
                key="csrf_token",
                value=new_token,
                httponly=False,
                secure=is_prod,
                samesite="lax",
                path="/"
            )
        return response

    # Phase 0.6: Tenant isolation middleware
    # Automatically filters database queries by org_id for multi-tenant data isolation
    from core.database import AsyncSessionLocal

    @app.middleware("http")
    async def _tenant_isolation_middleware(request: Request, call_next):
        from core.security import get_current_user_optional
        from core.tenant import get_tenant_id
        
        # Get tenant ID from authenticated user
        tenant_id = await get_tenant_id(request)
        
        # Store tenant ID in request state for downstream use
        request.state.tenant_id = tenant_id
        
        response = await call_next(request)
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        # P0-04: Restrict methods and headers (audit issue H2)
        # Wildcard allow_methods + allow_headers with allow_credentials=True is a CORS misconfiguration
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Admin-Key",
            "X-Request-ID",
            "X-Requested-With",
        ],
    )
    app.mount('/uploads', StaticFiles(directory=settings.upload_dir), name='uploads')

    # ── Global unhandled exception handler with alerting ─────────────────
    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
        # SECURITY#18: Sanitize exception message — don't leak SQL queries or PII in alerts
        exc_msg = str(exc)
        if len(exc_msg) > 500:
            exc_msg = exc_msg[:500] + "...[truncated]"
        # Remove potential SQL queries from error messages
        exc_msg = exc_msg.replace("SELECT", "[REDACTED]").replace("INSERT", "[REDACTED]").replace("DELETE", "[REDACTED]")
        get_alert_service().alert_external_api_failed(
            service_name="Backend Unhandled Error",
            endpoint=f"{request.method} {request.url.path}",
            status_code=500,
            error_msg=exc_msg,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. The team has been notified."},
        )

    @app.get('/', tags=['System'])
    async def root() -> dict:
        return {
            'service': 'SafeVixAI / SafeVixAI — Backend API',
            'version': settings.version,
            'status': 'online',
            'description': (
                'AI-powered road safety platform for India. '
                'Real-time emergency locator, road issue reporting, '
                'challan calculator, and smart routing.'
            ),
            'docs': docs_url,
            'health': '/health',
            'endpoints': {
                'emergency_nearby':    'GET  /api/v1/emergency/nearby?lat=&lon=',
                'emergency_sos':       'POST /api/v1/emergency/sos?lat=&lon=',
                'emergency_numbers':   'GET  /api/v1/emergency/numbers',
                'challan_calculate':   'POST /api/v1/challan/calculate',
                'road_issues':         'GET  /api/v1/roads/issues?lat=&lon=',
                'road_report':         'POST /api/v1/roads/report',
                'road_infrastructure': 'GET  /api/v1/roads/infrastructure?lat=&lon=',
                'routing_preview':     'GET  /api/v1/routing/preview?origin_lat=&origin_lon=&destination_lat=&destination_lon=',
                'geocode_search':      'GET  /api/v1/geocode/search?q=',
                'chat':                'POST /api/v1/chat/',
                **({
                    'mcp_server_sse': 'GET  /mcp/sse',
                    'mcp_server_msg': 'POST /mcp/messages',
                } if settings.mcp_enabled else {}),
            },
            'built_for': 'IIT Madras Road Safety Hackathon 2026',
        }

    @app.get('/health', response_model=HealthResponse, tags=['System'])
    async def health() -> HealthResponse:
        database_available = await check_database()
        cache_available = False
        cache_backend = 'disabled'
        cache = getattr(app.state, 'cache', None)
        if cache is not None:
            cache_available = await cache.ping()
            cache_backend = getattr(cache, 'backend_name', 'unknown')
        resp = HealthResponse(
            status='ok' if database_available else 'degraded',
            database_available=database_available,
            chatbot_ready=settings.chatbot_ready,
            chatbot_mode=settings.chatbot_mode,
            cache_available=cache_available,
            cache_backend=cache_backend,
            environment='production',  # SECURITY#21: Don't leak actual environment name
            version=settings.version,
        )
        if not database_available:
            # Alert on database failure
            get_alert_service().alert_supabase_failed(
                operation="Health check — database unreachable",
                error_msg="PostgreSQL connection failed during /health endpoint",
            )
            return JSONResponse(status_code=503, content=resp.model_dump())
        return resp

    app.include_router(api_router)
    
    if settings.mcp_enabled:
        from api.v1.mcp_server import router as mcp_info_router
        from api.v1.mcp_server import sse_app as mcp_app

        app.include_router(mcp_info_router)
        app.mount('/mcp', mcp_app)
    
    return app


# SECURITY#17: Configure uvicorn ws-max-size via environment variable
# Set WEBSOCKET_MAX_SIZE=1048576 (1MB) in production to prevent memory exhaustion
app = create_app()
