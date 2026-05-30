"""Coverage tests for tools/what3words.py — error and edge case paths."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from tools.what3words import What3WordsTool


class TestWhat3WordsGPSToWordsErrors:
    """What3WordsTool.gps_to_words() — API errors, timeouts."""

    @pytest.mark.asyncio
    async def test_no_api_key_returns_none(self):
        tool = What3WordsTool(api_key="")
        result = await tool.gps_to_words(lat=12.34, lon=56.78)
        assert result is None

    @pytest.mark.asyncio
    async def test_successful_conversion(self):
        tool = What3WordsTool(api_key="test-key")
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {"words": "filled.count.soap"}
        tool._client.get = AsyncMock(return_value=resp)
        result = await tool.gps_to_words(lat=12.34, lon=56.78)
        assert result is not None
        assert result["words"] == "filled.count.soap"
        assert result["formatted"] == "///filled.count.soap"

    @pytest.mark.asyncio
    async def test_empty_words_returns_none(self):
        tool = What3WordsTool(api_key="test-key")
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {"words": ""}
        tool._client.get = AsyncMock(return_value=resp)
        result = await tool.gps_to_words(lat=12.34, lon=56.78)
        assert result is None

    @pytest.mark.asyncio
    async def test_api_404_breaks_immediately(self):
        """Line 62-63: non-retriable status breaks immediately."""
        tool = What3WordsTool(api_key="test-key")
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 404
        resp.text = "Not Found"
        exc = httpx.HTTPStatusError("404", request=MagicMock(), response=resp)
        tool._client.get = AsyncMock(side_effect=exc)
        result = await tool.gps_to_words(lat=12.34, lon=56.78)
        assert result is None
        assert tool._client.get.call_count == 1

    @pytest.mark.asyncio
    async def test_api_429_retries(self):
        """Lines 64-66: 429 retries."""
        tool = What3WordsTool(api_key="test-key")
        fail_resp = MagicMock(spec=httpx.Response)
        fail_resp.status_code = 429
        fail_resp.text = "Rate Limited"
        fail_exc = httpx.HTTPStatusError("429", request=MagicMock(), response=fail_resp)

        success_resp = MagicMock(spec=httpx.Response)
        success_resp.status_code = 200
        success_resp.json.return_value = {"words": "filled.count.soap"}
        tool._client.get = AsyncMock(side_effect=[fail_exc, success_resp])
        result = await tool.gps_to_words(lat=12.34, lon=56.78)
        assert result is not None

    @pytest.mark.asyncio
    async def test_network_error_retries(self):
        tool = What3WordsTool(api_key="test-key")
        tool._client.get = AsyncMock(side_effect=httpx.RequestError("Timeout"))
        result = await tool.gps_to_words(lat=12.34, lon=56.78)
        assert result is None


class TestWhat3WordsWordsToGPSErrors:
    """What3WordsTool.words_to_gps() — error paths."""

    @pytest.mark.asyncio
    async def test_no_api_key_returns_none(self):
        tool = What3WordsTool(api_key="")
        result = await tool.words_to_gps("filled.count.soap")
        assert result is None

    @pytest.mark.asyncio
    async def test_successful_conversion(self):
        tool = What3WordsTool(api_key="test-key")
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {"coordinates": {"lat": 13.08, "lng": 80.27}}
        tool._client.get = AsyncMock(return_value=resp)
        result = await tool.words_to_gps("filled.count.soap")
        assert result is not None
        assert result["lat"] == 13.08
        assert result["lon"] == 80.27

    @pytest.mark.asyncio
    async def test_strips_triple_slash(self):
        tool = What3WordsTool(api_key="test-key")
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {"coordinates": {"lat": 13.08, "lng": 80.27}}
        tool._client.get = AsyncMock(return_value=resp)
        result = await tool.words_to_gps("///filled.count.soap")
        assert result is not None

    @pytest.mark.asyncio
    async def test_api_500_retries(self):
        """Lines 102-104: 500 retries."""
        tool = What3WordsTool(api_key="test-key")
        fail_resp = MagicMock(spec=httpx.Response)
        fail_resp.status_code = 500
        fail_resp.text = "Server Error"
        fail_exc = httpx.HTTPStatusError("500", request=MagicMock(), response=fail_resp)

        success_resp = MagicMock(spec=httpx.Response)
        success_resp.status_code = 200
        success_resp.json.return_value = {"coordinates": {"lat": 13.08, "lng": 80.27}}
        tool._client.get = AsyncMock(side_effect=[fail_exc, success_resp])
        result = await tool.words_to_gps("filled.count.soap")
        assert result is not None

    @pytest.mark.asyncio
    async def test_403_breaks_immediately(self):
        """Line 100-101: 403 not retriable."""
        tool = What3WordsTool(api_key="test-key")
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 403
        resp.text = "Forbidden"
        exc = httpx.HTTPStatusError("403", request=MagicMock(), response=resp)
        tool._client.get = AsyncMock(side_effect=exc)
        result = await tool.words_to_gps("filled.count.soap")
        assert result is None
        assert tool._client.get.call_count == 1

    @pytest.mark.asyncio
    async def test_network_error_retries(self):
        """Lines 106-108: RequestError retries."""
        tool = What3WordsTool(api_key="test-key")
        tool._client.get = AsyncMock(side_effect=httpx.RequestError("Timeout"))
        result = await tool.words_to_gps("filled.count.soap")
        assert result is None

    @pytest.mark.asyncio
    async def test_aclose(self):
        tool = What3WordsTool(api_key="test-key")
        tool._client.aclose = AsyncMock()
        await tool.aclose()
        tool._client.aclose.assert_awaited_once()
