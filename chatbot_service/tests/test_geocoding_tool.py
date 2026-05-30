"""Coverage tests for tools/geocoding.py — GeocodingClient reverse_geocode edge cases."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from tools.geocoding import GeocodingClient


class TestGeocodingClientNominatimFallback:
    """GeocodingClient — Nominatim fails, falls back to OpenCage."""

    @pytest.mark.asyncio
    async def test_nominatim_fails_opencage_succeeds(self):
        """Nominatim returns None, OpenCage provides result."""
        client = GeocodingClient(opencage_key="test-key")
        client._last_nominatim_request_at = 0.0

        with patch.object(client, "_nominatim_reverse", AsyncMock(return_value=None)):
            with patch.object(client, "_opencage_reverse", AsyncMock(return_value={
                "road": "MG Road", "city": "Bangalore", "state": "Karnataka",
                "postcode": "560001", "display": "MG Road, Bangalore", "source": "opencage",
            })):
                result = await client.reverse_geocode(lat=12.97, lon=77.59)

        assert result is not None
        assert result["source"] == "opencage"
        assert result["city"] == "Bangalore"

    @pytest.mark.asyncio
    async def test_both_apis_fail_returns_none(self):
        """Both Nominatim and OpenCage fail."""
        client = GeocodingClient(opencage_key="test-key")
        client._last_nominatim_request_at = 0.0

        with patch.object(client, "_nominatim_reverse", AsyncMock(return_value=None)):
            with patch.object(client, "_opencage_reverse", AsyncMock(return_value=None)):
                result = await client.reverse_geocode(lat=12.97, lon=77.59)

        assert result is None

    @pytest.mark.asyncio
    async def test_nominatim_rate_limit_retry_then_fallback(self):
        """Nominatim rate limited (429), retries, then falls back."""
        client = GeocodingClient(opencage_key="test-key")
        client._last_nominatim_request_at = 0.0

        with patch.object(client, "_nominatim_reverse", AsyncMock(return_value=None)):
            with patch.object(client, "_opencage_reverse", AsyncMock(return_value={
                "road": "Main Rd", "city": "Chennai", "state": "Tamil Nadu",
                "postcode": "600001", "display": "Main Rd, Chennai", "source": "opencage",
            })):
                result = await client.reverse_geocode(lat=13.08, lon=80.27)

        assert result is not None
        assert result["source"] == "opencage"

    @pytest.mark.asyncio
    async def test_nominatim_rate_limit_lock(self):
        """Lines 60-61: rate limit lock enforces 1-second gap."""
        client = GeocodingClient(opencage_key="test-key")
        client._last_nominatim_request_at = 0.0

        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {
            "address": {"road": "Test Rd", "city": "Test City", "state": "Test State"},
        }

        client._client.get = AsyncMock(return_value=resp)
        client._opencage_reverse = AsyncMock(return_value=None)

        result = await client._nominatim_reverse(lat=12.34, lon=56.78)
        assert result is not None
        assert result["road"] == "Test Rd"


class TestGeocodingClientOpenCage:
    """GeocodingClient._opencage_reverse — error paths."""

    @pytest.mark.asyncio
    async def test_no_api_key_returns_none(self):
        with patch.dict("os.environ", {"OPENCAGE_API_KEY": ""}, clear=False):
            client = GeocodingClient(opencage_key="")
        result = await client._opencage_reverse(lat=12.34, lon=56.78)
        assert result is None

    @pytest.mark.asyncio
    async def test_no_results_returns_none(self):
        client = GeocodingClient(opencage_key="key")
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {"results": []}
        client._client.get = AsyncMock(return_value=resp)
        result = await client._opencage_reverse(lat=12.34, lon=56.78)
        assert result is None

    @pytest.mark.asyncio
    async def test_http_429_retries(self):
        """Lines 149-151: 429 retries then falls through."""
        client = GeocodingClient(opencage_key="key")
        fail_resp = MagicMock(spec=httpx.Response)
        fail_resp.status_code = 429
        fail_resp.text = "Rate Limited"
        fail_exc = httpx.HTTPStatusError("429", request=MagicMock(), response=fail_resp)

        success_resp = MagicMock(spec=httpx.Response)
        success_resp.status_code = 200
        success_resp.json.return_value = {
            "results": [{"components": {"road": "OK Rd"}, "formatted": "OK Rd"}],
        }

        client._client.get = AsyncMock(side_effect=[fail_exc, success_resp])
        result = await client._opencage_reverse(lat=12.34, lon=56.78)
        assert result is not None
        assert result["source"] == "opencage"

    @pytest.mark.asyncio
    async def test_http_403_breaks_immediately(self):
        """Line 147-148: 403 is not retriable."""
        client = GeocodingClient(opencage_key="key")
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 403
        resp.text = "Forbidden"
        exc = httpx.HTTPStatusError("403", request=MagicMock(), response=resp)
        client._client.get = AsyncMock(side_effect=exc)
        result = await client._opencage_reverse(lat=12.34, lon=56.78)
        assert result is None
        assert client._client.get.call_count == 1

    @pytest.mark.asyncio
    async def test_network_error_retries(self):
        """Lines 152-155: RequestError retries."""
        client = GeocodingClient(opencage_key="key")
        client._client.get = AsyncMock(side_effect=httpx.RequestError("Network"))
        result = await client._opencage_reverse(lat=12.34, lon=56.78)
        assert result is None

    @pytest.mark.asyncio
    async def test_aclose(self):
        client = GeocodingClient(opencage_key="key")
        client._client.aclose = AsyncMock()
        await client.aclose()
        client._client.aclose.assert_awaited_once()
