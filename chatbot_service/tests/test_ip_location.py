"""Coverage tests for utils/ip_location.py — detect_state_from_ip edge cases."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from utils.ip_location import detect_state_from_ip


class TestDetectStateFromIP:
    """detect_state_from_ip — various API responses, errors, and edge cases."""

    @pytest.mark.asyncio
    async def test_successful_detection(self):
        """API returns valid data."""
        data = {
            "status": "success",
            "regionName": "Maharashtra",
            "city": "Mumbai",
            "country": "India",
            "lat": 19.07,
            "lon": 72.87,
            "isp": "Tata Communications",
            "timezone": "Asia/Kolkata",
        }
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = data

        with patch("httpx.AsyncClient.get", AsyncMock(return_value=resp)):
            result = await detect_state_from_ip("1.2.3.4")
        assert result["state"] == "Maharashtra"
        assert result["city"] == "Mumbai"
        assert result["lat"] == 19.07
        assert result["lon"] == 72.87
        assert result["isp"] == "Tata Communications"

    @pytest.mark.asyncio
    async def test_api_returns_non_success_status(self):
        """API returns status != 'success'."""
        data = {"status": "fail"}
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = data

        with patch("httpx.AsyncClient.get", AsyncMock(return_value=resp)):
            result = await detect_state_from_ip("1.2.3.4")
        assert result["state"] == "Tamil Nadu"
        assert result["city"] == ""

    @pytest.mark.asyncio
    async def test_api_http_error_retries_then_default(self):
        """HTTP error (500) retries then returns default."""
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 500
        resp.text = "Server Error"
        exc = httpx.HTTPStatusError("500", request=MagicMock(), response=resp)

        with patch("httpx.AsyncClient.get", AsyncMock(side_effect=[exc, exc, exc])):
            result = await detect_state_from_ip("1.2.3.4")
        assert result["state"] == "Tamil Nadu"
        assert result["lat"] is None

    @pytest.mark.asyncio
    async def test_api_429_retries_then_default(self):
        """429 rate limit retries then returns default."""
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 429
        resp.text = "Rate Limited"
        exc = httpx.HTTPStatusError("429", request=MagicMock(), response=resp)

        with patch("httpx.AsyncClient.get", AsyncMock(side_effect=[exc, exc, exc])):
            result = await detect_state_from_ip("1.2.3.4")
        assert result["state"] == "Tamil Nadu"

    @pytest.mark.asyncio
    async def test_http_request_error_retries_then_default(self):
        """Network error retries then returns default."""
        with patch("httpx.AsyncClient.get", AsyncMock(side_effect=httpx.RequestError("Network error"))):
            result = await detect_state_from_ip("1.2.3.4")
        assert result["state"] == "Tamil Nadu"

    @pytest.mark.asyncio
    async def test_non_retriable_http_error_breaks(self):
        """Non-retriable status code (e.g. 403) breaks immediately."""
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 403
        resp.text = "Forbidden"
        exc = httpx.HTTPStatusError("403", request=MagicMock(), response=resp)

        with patch("httpx.AsyncClient.get", AsyncMock(side_effect=exc)):
            result = await detect_state_from_ip("1.2.3.4")
        assert result["state"] == "Tamil Nadu"

    @pytest.mark.asyncio
    async def test_custom_default_state(self):
        """Uses custom default state when API fails."""
        data = {"status": "fail"}
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = data

        with patch("httpx.AsyncClient.get", AsyncMock(return_value=resp)):
            result = await detect_state_from_ip(default_state="Karnataka")
        assert result["state"] == "Karnataka"

    @pytest.mark.asyncio
    async def test_success_on_second_retry(self):
        """First attempt fails, second succeeds."""
        fail_resp = MagicMock(spec=httpx.Response)
        fail_resp.status_code = 502
        fail_resp.text = "Bad Gateway"
        fail_exc = httpx.HTTPStatusError("502", request=MagicMock(), response=fail_resp)

        success_data = {
            "status": "success",
            "regionName": "Delhi",
            "city": "New Delhi",
            "country": "India",
            "lat": 28.61,
            "lon": 77.23,
        }
        success_resp = MagicMock(spec=httpx.Response)
        success_resp.status_code = 200
        success_resp.json.return_value = success_data

        with patch("httpx.AsyncClient.get", AsyncMock(side_effect=[fail_exc, success_resp])):
            result = await detect_state_from_ip("1.2.3.4")
        assert result["state"] == "Delhi"
