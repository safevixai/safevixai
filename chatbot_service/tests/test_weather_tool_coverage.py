"""Coverage tests for tools/weather_tool.py — OWM fallback error paths (lines 68-74)."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from config import Settings
from tools.weather_tool import WeatherTool


class _FakeSettings:
    openweather_api_key = "test-owm-key"
    openweather_base_url = "https://api.openweathermap.org/data/2.5"
    openweather_units = "metric"
    http_timeout_seconds = 10.0
    http_user_agent = "SafeVixAI/1.0"


class TestWeatherToolOwmFallback:
    """WeatherTool — OpenWeatherMap fallback coverage."""

    @pytest.fixture
    def tool(self):
        t = WeatherTool.__new__(WeatherTool)
        t.settings = _FakeSettings()
        t._owm_client = MagicMock(spec=httpx.AsyncClient)
        t._owm_client.is_closed = False
        # Patch Open-Meteo to always return None (so we test OWM fallback)
        t._open_meteo = MagicMock()
        t._open_meteo.lookup = AsyncMock(return_value=None)
        return t

    @pytest.mark.asyncio
    async def test_no_api_key_returns_none(self):
        settings = _FakeSettings()
        settings.openweather_api_key = ""
        tool = WeatherTool.__new__(WeatherTool)
        tool.settings = settings
        tool._owm_client = MagicMock(spec=httpx.AsyncClient)
        tool._open_meteo = MagicMock()
        tool._open_meteo.lookup = AsyncMock(return_value=None)
        result = await tool._owm_lookup(lat=12.34, lon=56.78)
        assert result is None

    @pytest.mark.asyncio
    async def test_successful_owm_lookup(self, tool: WeatherTool):
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {
            "weather": [{"description": "clear sky"}],
            "main": {"temp": 32.5},
        }
        tool._owm_client.get = AsyncMock(return_value=resp)
        result = await tool._owm_lookup(lat=12.34, lon=56.78)
        assert result is not None
        assert result["summary"] == "clear sky"
        assert result["temperature"] == 32.5
        assert result["source"] == "openweathermap"

    @pytest.mark.asyncio
    async def test_api_429_retries(self, tool: WeatherTool):
        """Lines 68-70: 429 retries."""
        fail_resp = MagicMock(spec=httpx.Response)
        fail_resp.status_code = 429
        fail_resp.text = "Rate Limited"
        fail_exc = httpx.HTTPStatusError("429", request=MagicMock(), response=fail_resp)

        success_resp = MagicMock(spec=httpx.Response)
        success_resp.status_code = 200
        success_resp.json.return_value = {
            "weather": [{"description": "sunny"}],
            "main": {"temp": 30.0},
        }
        tool._owm_client.get = AsyncMock(side_effect=[fail_exc, success_resp])
        result = await tool._owm_lookup(lat=12.34, lon=56.78)
        assert result is not None
        assert result["summary"] == "sunny"

    @pytest.mark.asyncio
    async def test_api_403_breaks_immediately(self, tool: WeatherTool):
        """Line 66-67: 403 not retriable."""
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 403
        resp.text = "Forbidden"
        exc = httpx.HTTPStatusError("403", request=MagicMock(), response=resp)
        tool._owm_client.get = AsyncMock(side_effect=exc)
        result = await tool._owm_lookup(lat=12.34, lon=56.78)
        assert result is None
        assert tool._owm_client.get.call_count == 1

    @pytest.mark.asyncio
    async def test_network_error_retries(self, tool: WeatherTool):
        """Lines 72-74: RequestError retries."""
        tool._owm_client.get = AsyncMock(side_effect=httpx.RequestError("Timeout"))
        result = await tool._owm_lookup(lat=12.34, lon=56.78)
        assert result is None
        assert tool._owm_client.get.call_count == 3

    @pytest.mark.asyncio
    async def test_aclose(self, tool: WeatherTool):
        tool._open_meteo.aclose = AsyncMock()
        tool._owm_client.aclose = AsyncMock()
        await tool.aclose()
        tool._open_meteo.aclose.assert_awaited_once()
        tool._owm_client.aclose.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_no_weather_field(self, tool: WeatherTool):
        """Response missing 'weather' field."""
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {"main": {"temp": 25.0}}
        tool._owm_client.get = AsyncMock(return_value=resp)
        result = await tool._owm_lookup(lat=12.34, lon=56.78)
        assert result is not None
        assert result["summary"] == "Weather unavailable"

    @pytest.mark.asyncio
    async def test_no_main_field(self, tool: WeatherTool):
        """Response missing 'main' field."""
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {"weather": [{"description": "cloudy"}]}
        tool._owm_client.get = AsyncMock(return_value=resp)
        result = await tool._owm_lookup(lat=12.34, lon=56.78)
        assert result is not None
        assert result["temperature"] is None
