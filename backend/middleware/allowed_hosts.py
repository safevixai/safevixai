from __future__ import annotations

import logging

from fastapi import FastAPI, Request, Response

logger = logging.getLogger("safevixai.allowed_hosts")

ALLOWED_HOSTS_ENV_VAR = "ALLOWED_HOSTS"


class AllowedHostsMiddleware:
    def __init__(self, app, allowed_hosts: list[str] | None = None):
        self.app = app
        self.allowed_hosts = allowed_hosts or []

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        host = request.headers.get("host", "").split(":")[0].lower()

        if self.allowed_hosts and host not in self.allowed_hosts:
            logger.warning("Blocked request from unauthorized host: %s", host)
            response = Response(
                content='{"detail":"Host not allowed"}',
                status_code=403,
                media_type="application/json",
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)


def setup_allowed_hosts(app: FastAPI, settings) -> None:
    env = settings.environment
    allowed_hosts_env = getattr(settings, "allowed_hosts_env", None)

    if env == "production" and (not allowed_hosts_env or allowed_hosts_env.strip() == ""):
        allowed_hosts = [settings.frontend_url.split("://")[-1].split("/")[0]] if settings.frontend_url else []
        if allowed_hosts:
            allowed_hosts.extend([
                host.split("://")[-1].split("/")[0]
                for host in [settings.chatbot_service_url]
            ])
        if not allowed_hosts:
            allowed_hosts = ["localhost", "127.0.0.1"]
            logger.warning("ALLOWED_HOSTS not configured — defaulting to localhost only")
        app.add_middleware(AllowedHostsMiddleware, allowed_hosts=allowed_hosts)
    elif allowed_hosts_env and allowed_hosts_env.strip():
        allowed_hosts = [h.strip() for h in allowed_hosts_env.split(",") if h.strip()]
        app.add_middleware(AllowedHostsMiddleware, allowed_hosts=allowed_hosts)
    else:
        logger.info("ALLOWED_HOSTS not set — skipping host validation (dev mode)")
