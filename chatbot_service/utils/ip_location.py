# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""ip-api.com State Detection — FREE, no key, 45 req/min.

Auto-detects the user's Indian state from their IP address.
Used by DriveLegal to default state-specific fine calculations.

IMPORTANT: Use HTTP (not HTTPS) — HTTPS requires paid plan.
"""

from __future__ import annotations

import asyncio
import json
import logging

import httpx

logger = logging.getLogger(__name__)


async def detect_state_from_ip(
    ip: str | None = None,
    *,
    timeout: float = 5.0,
    default_state: str = "Tamil Nadu",
) -> dict:
    """Detect user's state and city from IP address with robust retries.

    Args:
        ip: Client IP address. If None, uses the caller's IP.
        timeout: Request timeout in seconds.
        default_state: Fallback state if detection fails.

    Returns:
        Dict with keys: state, city, country, lat, lon
    """
    url = f"https://ip-api.com/json/{ip}" if ip else "https://ip-api.com/json"
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

            if data.get("status") != "success":
                return _default_result(default_state)

            return {
                "state": data.get("regionName", default_state),
                "city": data.get("city", ""),
                "country": data.get("country", "India"),
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "isp": data.get("isp", ""),
                "timezone": data.get("timezone", "Asia/Kolkata"),
            }
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code not in (429, 500, 502, 503, 504):
                break
            logger.warning("IP location detection failed (attempt %d/3) with status %d: %s", attempt + 1, exc.response.status_code, exc)
            if attempt < 2:
                await asyncio.sleep(0.5 * (2 ** attempt))
        except (httpx.RequestError, json.JSONDecodeError) as exc:
            logger.warning("IP location detection failed (attempt %d/3): %s", attempt + 1, exc)
            if attempt < 2:
                await asyncio.sleep(0.5 * (2 ** attempt))

    return _default_result(default_state)


def _default_result(state: str) -> dict:
    return {
        "state": state,
        "city": "",
        "country": "India",
        "lat": None,
        "lon": None,
        "isp": "",
        "timezone": "Asia/Kolkata",
    }

