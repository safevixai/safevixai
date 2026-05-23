from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from services.exceptions import ServiceValidationError
from services.safe_spaces import close_safe_spaces_client, get_safe_spaces


class _MockResponse:
    """Minimal stand-in for httpx.Response — only exposes what safe_spaces uses."""

    def __init__(self, status_code: int, json_data: dict | None = None):
        self.status_code = status_code
        self._json_data = json_data if json_data is not None else {}

    def json(self):
        return self._json_data


SAMPLE_ELEMENTS = [
    {
        "type": "node",
        "id": 1,
        "lat": 13.05,
        "lon": 80.25,
        "tags": {
            "name": "Apollo Hospital",
            "amenity": "hospital",
            "phone": "+914412345678",
            "opening_hours": "24/7",
        },
    },
    {
        "type": "node",
        "id": 2,
        "lat": 13.06,
        "lon": 80.26,
        "tags": {
            "name": "Central Police Station",
            "amenity": "police",
        },
    },
    {
        "type": "node",
        "id": 3,
        "lat": 13.07,
        "lon": 80.27,
        "tags": {
            "name": "Fire Station",
            "amenity": "fire_station",
            "phone": "101",
            "opening_hours": "24/7",
        },
    },
]

SAMPLE_SUCCESS_JSON = {"elements": SAMPLE_ELEMENTS}


@pytest.fixture(autouse=True)
async def _reset_client():
    """Ensure a clean global client between tests."""
    yield
    await close_safe_spaces_client()


# ---------------------------------------------------------------------------
# 1. Coordinate validation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_validation_invalid_lat_below():
    with pytest.raises(ServiceValidationError, match="Invalid coordinates"):
        await get_safe_spaces(-91.0, 80.0, 1000)


@pytest.mark.asyncio
async def test_validation_invalid_lat_above():
    with pytest.raises(ServiceValidationError, match="Invalid coordinates"):
        await get_safe_spaces(91.0, 80.0, 1000)


@pytest.mark.asyncio
async def test_validation_invalid_lon_below():
    with pytest.raises(ServiceValidationError, match="Invalid coordinates"):
        await get_safe_spaces(13.0, -181.0, 1000)


@pytest.mark.asyncio
async def test_validation_invalid_lon_above():
    with pytest.raises(ServiceValidationError, match="Invalid coordinates"):
        await get_safe_spaces(13.0, 181.0, 1000)


@pytest.mark.asyncio
async def test_validation_radius_too_small():
    with pytest.raises(ServiceValidationError, match="Invalid radius"):
        await get_safe_spaces(13.0, 80.0, 0)


@pytest.mark.asyncio
async def test_validation_radius_too_large():
    with pytest.raises(ServiceValidationError, match="Invalid radius"):
        await get_safe_spaces(13.0, 80.0, 200000)


# ---------------------------------------------------------------------------
# 2. Success path — first endpoint returns data
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_success_first_endpoint():
    mock_post = AsyncMock(return_value=_MockResponse(200, SAMPLE_SUCCESS_JSON))
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(13.0, 80.0, 1000)

    assert result["count"] == 3
    assert len(result["places"]) == 3
    assert result["radius_meters"] == 1000
    assert result["source"] == "openstreetmap"
    assert "warning" not in result

    # First place — full details
    assert result["places"][0]["name"] == "Apollo Hospital"
    assert result["places"][0]["type"] == "hospital"
    assert result["places"][0]["lat"] == 13.05
    assert result["places"][0]["lon"] == 80.25
    assert result["places"][0]["phone"] == "+914412345678"
    assert result["places"][0]["open_hours"] == "24/7"

    # Second place — no phone / opening_hours
    assert result["places"][1]["name"] == "Central Police Station"
    assert result["places"][1]["type"] == "police"
    assert result["places"][1]["phone"] is None
    assert result["places"][1]["open_hours"] is None

    # Third place — fire station
    assert result["places"][2]["name"] == "Fire Station"
    assert result["places"][2]["type"] == "fire_station"
    assert result["places"][2]["phone"] == "101"

    # Only the first (primary) endpoint was contacted
    assert mock_post.call_count == 1
    args, _ = mock_post.call_args
    assert "overpass-api.de" in str(args[0])


# ---------------------------------------------------------------------------
# 3. Success from second endpoint (first rate-limited)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_success_second_endpoint():
    mock_post = AsyncMock(
        side_effect=[
            _MockResponse(429, {}),
            _MockResponse(200, SAMPLE_SUCCESS_JSON),
        ]
    )
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(13.0, 80.0, 1000)

    assert result["count"] == 3
    assert result["source"] == "openstreetmap"
    assert "warning" not in result
    assert mock_post.call_count == 2


# ---------------------------------------------------------------------------
# 4. Success from third endpoint (first two rate-limited)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_success_third_endpoint():
    mock_post = AsyncMock(
        side_effect=[
            _MockResponse(503, {}),
            _MockResponse(406, {}),
            _MockResponse(200, SAMPLE_SUCCESS_JSON),
        ]
    )
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(12.5, 77.5, 500)

    assert result["count"] == 3
    assert result["source"] == "openstreetmap"
    assert "warning" not in result
    assert mock_post.call_count == 3


# ---------------------------------------------------------------------------
# 5. HTTP error on all endpoints → graceful empty fallback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_http_error_all_endpoints():
    mock_post = AsyncMock(side_effect=httpx.HTTPError("Connection refused"))
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(13.0, 80.0, 1000)

    assert result["count"] == 0
    assert result["places"] == []
    assert result["radius_meters"] == 1000
    assert result["source"] == "openstreetmap"
    assert "warning" in result
    assert "unavailable" in result["warning"].lower()
    assert mock_post.call_count == 3  # all three tried


# ---------------------------------------------------------------------------
# 6. Timeout on all endpoints → graceful empty fallback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_timeout_all_endpoints():
    mock_post = AsyncMock(side_effect=httpx.TimeoutException("Request timed out"))
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(13.0, 80.0, 1000)

    assert result["count"] == 0
    assert result["places"] == []
    assert "warning" in result
    assert mock_post.call_count == 3


# ---------------------------------------------------------------------------
# 7. Rate-limited (406/429/503) on all endpoints → graceful empty fallback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_rate_limited_all_endpoints():
    mock_post = AsyncMock(
        side_effect=[
            _MockResponse(406, {}),
            _MockResponse(429, {}),
            _MockResponse(503, {}),
        ]
    )
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(13.0, 80.0, 1000)

    assert result["count"] == 0
    assert result["places"] == []
    assert "warning" in result
    assert mock_post.call_count == 3


# ---------------------------------------------------------------------------
# 8. Bad JSON response (non-JSON body from endpoint)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_json_decode_error_all_endpoints():
    """When r.json() raises JSONDecodeError on the last endpoint, the
    exception propagates because the code only catches httpx exceptions."""
    bad_resp = _MockResponse(200, {})
    bad_resp.json = lambda: (_ for _ in ()).throw(json.JSONDecodeError("Expecting value", "", 0))

    mock_post = AsyncMock(
        side_effect=[bad_resp, bad_resp, bad_resp]
    )
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        with pytest.raises(json.JSONDecodeError):
            await get_safe_spaces(13.0, 80.0, 1000)

    assert mock_post.call_count == 1  # crashed on first, never tried others


@pytest.mark.asyncio
async def test_unexpected_response_structure():
    """Endpoint returns valid JSON but elements lack lat/lon — gracefully returns empty."""
    mock_post = AsyncMock(
        return_value=_MockResponse(200, {
            "elements": [
                {"type": "node", "id": 999, "tags": {"name": "Missing Coords"}},
            ]
        })
    )
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(13.0, 80.0, 1000)

    assert result["count"] == 0
    assert result["places"] == []
    assert result["source"] == "openstreetmap"
    assert "warning" not in result
    assert mock_post.call_count == 1


# ---------------------------------------------------------------------------
# 9. Places with missing tags / coords — filtering
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_places_missing_filtering():
    """Elements without lat/lon are filtered out; empty tags are handled."""
    elements = [
        {"type": "node", "id": 1, "lat": 13.0, "lon": 80.0, "tags": {"name": "Alpha", "amenity": "cafe"}},
        {"type": "node", "id": 2, "lat": 13.1, "lon": 80.1, "tags": {}},        # empty tags — should not crash
        {"type": "node", "id": 3, "tags": {"name": "NoCoords"}},                # no lat/lon — filtered out
    ]
    mock_post = AsyncMock(return_value=_MockResponse(200, {"elements": elements}))
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(13.0, 80.0, 1000)

    # Elements 1 and 2 pass the lat/lon filter; element 3 is filtered out.
    assert result["count"] == 2
    assert result["places"][0]["name"] == "Alpha"
    assert result["places"][0]["type"] == "cafe"
    assert result["places"][1]["name"] == "Unknown"
    assert result["places"][1]["type"] == "place"


@pytest.mark.asyncio
async def test_missing_tags_key_crashes():
    """Elements with lat/lon but no 'tags' key cause KeyError (current limitation)."""
    elements = [
        {"type": "node", "id": 99, "lat": 13.5, "lon": 80.5},
    ]
    mock_post = AsyncMock(return_value=_MockResponse(200, {"elements": elements}))
    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        with pytest.raises(KeyError):
            await get_safe_spaces(13.0, 80.0, 1000)


# ---------------------------------------------------------------------------
# 10. Client lifecycle
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_client_lifecycle():
    """close_safe_spaces_client() works, and get_safe_spaces recreates the client."""
    mock_post = AsyncMock(return_value=_MockResponse(200, SAMPLE_SUCCESS_JSON))

    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(12.0, 77.0, 500)
        assert result["count"] == 3

    await close_safe_spaces_client()

    with patch("services.safe_spaces.httpx.AsyncClient.post", mock_post):
        result = await get_safe_spaces(13.0, 80.0, 1000)
        assert result["count"] == 3
        assert result["radius_meters"] == 1000

    # Calling close again should be a no-op
    await close_safe_spaces_client()
