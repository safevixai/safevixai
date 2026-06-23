# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""Weather Tool — Open-Meteo (primary) + OpenWeatherMap (fallback).

Provides weather data for risk assessment and chatbot context.
Open-Meteo is free with no API key. OWM is the fallback if Open-Meteo fails.
"""

from __future__ import annotations

import asyncio
import json
import logging

import httpx

from config import Settings

logger = logging.getLogger(__name__)
from tools.open_meteo import OpenMeteoClient


class WeatherTool:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._open_meteo = OpenMeteoClient(settings)
        self._owm_client = httpx.AsyncClient(
            timeout=settings.http_timeout_seconds,
            headers={'User-Agent': settings.http_user_agent},
        )

    async def lookup(self, *, lat: float, lon: float) -> dict | None:
        """Try Open-Meteo first (free, no key), fall back to OpenWeatherMap."""

        # Primary: Open-Meteo — free, unlimited, no key
        result = await self._open_meteo.lookup(lat=lat, lon=lon)
        if result is not None:
            return result

        # Fallback: OpenWeatherMap — needs API key
        return await self._owm_lookup(lat=lat, lon=lon)

    async def _owm_lookup(self, *, lat: float, lon: float) -> dict | None:
        """OpenWeatherMap fallback — requires OPENWEATHER_API_KEY with robust retries."""
        if not self.settings.openweather_api_key:
            return None
        for attempt in range(3):
            try:
                response = await self._owm_client.get(
                    f'{self.settings.openweather_base_url}/weather',
                    params={
                        'lat': lat,
                        'lon': lon,
                        'appid': self.settings.openweather_api_key,
                        'units': self.settings.openweather_units,
                    },
                )
                response.raise_for_status()
                payload = response.json()
                weather = payload.get('weather') or [{}]
                main = payload.get('main') or {}
                return {
                    'summary': weather[0].get('description') or 'Weather unavailable',
                    'temperature': main.get('temp'),
                    'source': 'openweathermap',
                }
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code not in (429, 500, 502, 503, 504):
                    break
                logger.warning("OpenWeatherMap failed (attempt %d/3) with status %d: %s", attempt + 1, exc.response.status_code, exc)
                if attempt < 2:
                    await asyncio.sleep(0.5 * (2 ** attempt))
            except (httpx.RequestError, json.JSONDecodeError) as exc:
                logger.warning("OpenWeatherMap failed (attempt %d/3): %s", attempt + 1, exc)
                if attempt < 2:
                    await asyncio.sleep(0.5 * (2 ** attempt))
        return None

    async def aclose(self) -> None:
        await self._open_meteo.aclose()
        await self._owm_client.aclose()

