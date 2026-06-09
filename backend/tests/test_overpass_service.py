from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, call, patch

import httpx
import pytest

from core.config import Settings
from services.exceptions import ExternalServiceError
from services.overpass_service import OverpassService, RoadContext

SAMPLE_LAT = 13.0827
SAMPLE_LON = 80.2707


@pytest.fixture
def settings(monkeypatch):
    monkeypatch.setenv("OVERPASS_URLS", "https://first.example.com/api,https://second.example.com/api")
    monkeypatch.setenv("UPSTREAM_RETRY_ATTEMPTS", "0")
    monkeypatch.setenv("UPSTREAM_RETRY_BACKOFF_SECONDS", "0.01")
    return Settings()


@pytest.fixture
def service(settings):
    svc = OverpassService(settings)
    svc._client = AsyncMock()
    return svc


@pytest.fixture
def mock_ok_response():
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = 200
    resp.raise_for_status.return_value = None
    return resp


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def _make_node(node_id: int, lat: float, lon: float, tags: dict) -> dict:
    return {"type": "node", "id": node_id, "lat": lat, "lon": lon, "tags": tags}


def _make_way(way_id: int, center_lat: float, center_lon: float, tags: dict) -> dict:
    return {"type": "way", "id": way_id, "center": {"lat": center_lat, "lon": center_lon}, "tags": tags}


def _make_http_error(status_code: int) -> httpx.HTTPStatusError:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    req = MagicMock(spec=httpx.Request)
    return httpx.HTTPStatusError(f"HTTP {status_code}", request=req, response=resp)


HOSPITAL_NODE = _make_node(1001, 13.01, 80.01, {
    "amenity": "hospital",
    "name": "City Hospital",
    "phone": "1234567890",
    "emergency:phone": "112",
    "healthcare:speciality": "trauma",
    "opening_hours": "24/7",
    "addr:street": "Main St",
    "addr:city": "Chennai",
})

POLICE_NODE = _make_node(1002, 13.02, 80.02, {"amenity": "police", "name": "City Police"})

FIRE_NODE = _make_node(1003, 13.03, 80.03, {"amenity": "fire_station", "name": "Fire Station"})

PHARMACY_NODE = _make_node(1004, 13.04, 80.04, {"amenity": "pharmacy", "name": "MedPlus"})

AMBULANCE_NODE = _make_node(1005, 13.05, 80.05, {"emergency": "ambulance_station", "name": "Ambulance Base"})

TOWING_NODE = _make_node(1006, 13.06, 80.06, {"shop": "car_repair", "name": "Auto Garage"})


# ---------------------------------------------------------------------------
# 1. Constructor
# ---------------------------------------------------------------------------

@patch("services.overpass_service.httpx.AsyncClient")
def test_constructor_creates_http_client(mock_client_cls):
    s = Settings()
    svc = OverpassService(s)
    mock_client_cls.assert_called_once_with(
        timeout=s.request_timeout_seconds,
        headers={"User-Agent": s.http_user_agent},
    )
    assert svc._client is mock_client_cls.return_value


# ---------------------------------------------------------------------------
# 2. aclose
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_aclose(service):
    await service.aclose()
    service._client.aclose.assert_awaited_once()


# ---------------------------------------------------------------------------
# 3-4. _build_service_query
# ---------------------------------------------------------------------------

class TestBuildServiceQuery:
    def test_contains_expected_values(self):
        svc = OverpassService(Settings())
        q = svc._build_service_query(lat=12.34, lon=56.78, radius=5000)
        assert "[out:json]" in q
        assert "[timeout:25]" in q
        assert "around:5000,12.34,56.78" in q
        assert 'amenity~"hospital|clinic|police|fire_station|pharmacy"' in q
        assert 'emergency="ambulance_station"' in q
        assert 'shop~"car_repair|tyres"' in q
        assert 'craft="mechanic"' in q
        assert "out center tags;" in q
        assert "node(" in q
        assert "way(" in q
        assert "relation(" in q

    def test_different_coordinates(self):
        svc = OverpassService(Settings())
        q = svc._build_service_query(lat=0.0, lon=0.0, radius=100)
        assert "around:100,0.0,0.0" in q


# ---------------------------------------------------------------------------
# 4b. _build_road_query
# ---------------------------------------------------------------------------

class TestBuildRoadQuery:
    def test_contains_expected_values(self):
        svc = OverpassService(Settings())
        q = svc._build_road_query(lat=12.34, lon=56.78)
        assert "[out:json]" in q
        assert "[timeout:20]" in q
        assert "around:120,12.34,56.78" in q
        assert "way(around:120," in q
        assert "[highway]" in q
        assert "out center tags;" in q


# ---------------------------------------------------------------------------
# 5-10. _classify_service
# ---------------------------------------------------------------------------

class TestClassifyService:
    @pytest.mark.parametrize("tags,expected", [
        ({"amenity": "hospital"}, "hospital"),
        ({"amenity": "clinic"}, "hospital"),
        ({"amenity": "police"}, "police"),
        ({"amenity": "fire_station"}, "fire"),
        ({"amenity": "pharmacy"}, "pharmacy"),
        ({"emergency": "ambulance_station"}, "ambulance"),
        ({"shop": "car_repair"}, "towing"),
        ({"shop": "tyres"}, "towing"),
        ({"craft": "mechanic"}, "towing"),
    ])
    def test_known_categories(self, tags, expected):
        assert OverpassService._classify_service(tags) == expected

    @pytest.mark.parametrize("tags", [
        ({"amenity": "school"}),
        ({"shop": "supermarket"}),
        ({"craft": "electrician"}),
        ({}),
        ({"emergency": "disaster_response"}),
    ])
    def test_unknown_returns_none(self, tags):
        assert OverpassService._classify_service(tags) is None

    @pytest.mark.parametrize("tags,expected", [
        ({"amenity": "Hospital"}, "hospital"),
        ({"amenity": "POLICE"}, "police"),
        ({"amenity": "Fire_Station"}, "fire"),
    ])
    def test_case_insensitivity(self, tags, expected):
        assert OverpassService._classify_service(tags) == expected


# ---------------------------------------------------------------------------
# 11. _execute_query – first mirror succeeds
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_query_first_mirror_succeeds(service, mock_ok_response):
    expected = {"elements": [{"id": 1}]}
    mock_ok_response.json.return_value = expected
    service._client.post.return_value = mock_ok_response

    result = await service._execute_query("[out:json];(node(1));out;")

    assert result == expected
    service._client.post.assert_called_once_with(
        "https://first.example.com/api",
        data={"data": "[out:json];(node(1));out;"},
    )


# ---------------------------------------------------------------------------
# 12. _execute_query – first mirror 429, second succeeds
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_query_first_mirror_429_second_succeeds(service, mock_ok_response):
    expected = {"elements": [{"id": 2}]}
    mock_ok_response.json.return_value = expected
    error = _make_http_error(429)

    service._client.post.side_effect = [error, mock_ok_response]

    mock_alert_svc = MagicMock()
    with patch("services.overpass_service.get_alert_service", return_value=mock_alert_svc):
        result = await service._execute_query("test query")

    assert result == expected
    assert service._client.post.call_args_list == [
        call("https://first.example.com/api", data={"data": "test query"}),
        call("https://second.example.com/api", data={"data": "test query"}),
    ]
    mock_alert_svc.alert_external_api_failed.assert_not_called()


# ---------------------------------------------------------------------------
# 12b. _execute_query – retry logic when upstream_retry_attempts > 0
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_query_retry_on_429_then_succeed(monkeypatch):
    monkeypatch.setenv("OVERPASS_URLS", "https://first.example.com/api")
    monkeypatch.setenv("UPSTREAM_RETRY_ATTEMPTS", "2")
    monkeypatch.setenv("UPSTREAM_RETRY_BACKOFF_SECONDS", "0.01")
    settings = Settings()

    svc = OverpassService(settings)
    svc._client = AsyncMock()

    error = _make_http_error(429)
    ok_resp = MagicMock(spec=httpx.Response)
    ok_resp.status_code = 200
    ok_resp.raise_for_status.return_value = None
    ok_resp.json.return_value = {"elements": [{"id": 1}]}

    # Two 429s then success on 3rd attempt (same mirror)
    svc._client.post.side_effect = [error, error, ok_resp]

    mock_alert_svc = MagicMock()
    with patch("services.overpass_service.get_alert_service", return_value=mock_alert_svc):
        result = await svc._execute_query("test query")

    assert result == {"elements": [{"id": 1}]}
    assert svc._client.post.call_count == 3
    mock_alert_svc.alert_external_api_failed.assert_not_called()


@pytest.mark.asyncio
async def test_execute_query_retries_exhausted_then_next_mirror(monkeypatch):
    monkeypatch.setenv("OVERPASS_URLS", "https://first.example.com/api,https://second.example.com/api")
    monkeypatch.setenv("UPSTREAM_RETRY_ATTEMPTS", "1")
    monkeypatch.setenv("UPSTREAM_RETRY_BACKOFF_SECONDS", "0.01")
    settings = Settings()

    svc = OverpassService(settings)
    svc._client = AsyncMock()

    error = _make_http_error(429)
    ok_resp = MagicMock(spec=httpx.Response)
    ok_resp.status_code = 200
    ok_resp.raise_for_status.return_value = None
    ok_resp.json.return_value = {"elements": [{"id": 1}]}

    # Mirror 1: 2 attempts (attempts=1 → range(2) → 0,1) both fail
    # Mirror 2: 1st attempt succeeds
    svc._client.post.side_effect = [error, error, ok_resp]

    mock_alert_svc = MagicMock()
    with patch("services.overpass_service.get_alert_service", return_value=mock_alert_svc):
        result = await svc._execute_query("test query")

    assert result == {"elements": [{"id": 1}]}
    assert svc._client.post.call_count == 3
    mock_alert_svc.alert_external_api_failed.assert_not_called()


# ---------------------------------------------------------------------------
# 13. _execute_query – retryable error on all mirrors → ExternalServiceError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_query_all_retryable_fails(service):
    error = _make_http_error(429)
    service._client.post.side_effect = [error, error]

    mock_alert_svc = MagicMock()
    with patch("services.overpass_service.get_alert_service", return_value=mock_alert_svc):
        with pytest.raises(ExternalServiceError, match="Overpass API unavailable"):
            await service._execute_query("test query")

    mock_alert_svc.alert_external_api_failed.assert_called_once()


# ---------------------------------------------------------------------------
# 13b. _execute_query – retryable 503 on all mirrors
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_query_503_on_all_mirrors(service):
    error = _make_http_error(503)
    service._client.post.side_effect = [error, error]

    mock_alert_svc = MagicMock()
    with patch("services.overpass_service.get_alert_service", return_value=mock_alert_svc):
        with pytest.raises(ExternalServiceError):
            await service._execute_query("test query")

    mock_alert_svc.alert_external_api_failed.assert_called_once()


# ---------------------------------------------------------------------------
# 14. _execute_query – non-retryable HTTP error on all mirrors
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_query_non_retryable_http_error(service):
    error = _make_http_error(400)
    service._client.post.side_effect = [error, error]

    mock_alert_svc = MagicMock()
    with patch("services.overpass_service.get_alert_service", return_value=mock_alert_svc):
        with pytest.raises(ExternalServiceError, match="Overpass API unavailable"):
            await service._execute_query("test query")

    mock_alert_svc.alert_external_api_failed.assert_called_once()


# ---------------------------------------------------------------------------
# 14b. _execute_query – RequestError on all mirrors
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_query_request_error_on_all(service):
    req = MagicMock(spec=httpx.Request)
    error = httpx.RequestError("Connection refused", request=req)
    service._client.post.side_effect = [error, error]

    mock_alert_svc = MagicMock()
    with patch("services.overpass_service.get_alert_service", return_value=mock_alert_svc):
        with pytest.raises(ExternalServiceError, match="Overpass API unavailable"):
            await service._execute_query("test query")

    mock_alert_svc.alert_external_api_failed.assert_called_once()


# ---------------------------------------------------------------------------
# 14c. _execute_query – non-retryable on first mirror, retryable on second
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_query_non_retryable_then_retryable_then_fail(service):
    """First mirror returns 400 (non-retryable), second returns 429 (retryable)."""
    error_400 = _make_http_error(400)
    error_429 = _make_http_error(429)
    service._client.post.side_effect = [error_400, error_429]

    mock_alert_svc = MagicMock()
    with patch("services.overpass_service.get_alert_service", return_value=mock_alert_svc):
        with pytest.raises(ExternalServiceError):
            await service._execute_query("test query")

    mock_alert_svc.alert_external_api_failed.assert_called_once()


# ---------------------------------------------------------------------------
# 15. search_services – returns categorized results
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_returns_categorized_results(service, mock_ok_response):
    mock_ok_response.json.return_value = {
        "elements": [HOSPITAL_NODE, POLICE_NODE, FIRE_NODE, PHARMACY_NODE],
    }
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital", "police", "fire", "pharmacy"], limit=10,
    )

    assert len(results) == 4
    categories = {r.category for r in results}
    assert categories == {"hospital", "police", "fire", "pharmacy"}


# ---------------------------------------------------------------------------
# 16. search_services – filters by categories
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_filters_by_categories(service, mock_ok_response):
    mock_ok_response.json.return_value = {
        "elements": [HOSPITAL_NODE, POLICE_NODE, FIRE_NODE],
    }
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["police"], limit=10,
    )

    assert len(results) == 1
    assert results[0].category == "police"


# ---------------------------------------------------------------------------
# 17. search_services – limits results
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_limits_results(service, mock_ok_response):
    mock_ok_response.json.return_value = {
        "elements": [HOSPITAL_NODE, POLICE_NODE],
    }
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital", "police"], limit=1,
    )

    assert len(results) == 1


# ---------------------------------------------------------------------------
# 18. search_services – elements with missing tags
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_skips_tagless_elements(service, mock_ok_response):
    no_tags = _make_node(999, 13.0, 80.0, {})
    mock_ok_response.json.return_value = {"elements": [HOSPITAL_NODE, no_tags]}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert len(results) == 1
    assert results[0].id == "1001"


# ---------------------------------------------------------------------------
# 19. search_services – empty result set
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_empty_result(service, mock_ok_response):
    mock_ok_response.json.return_value = {"elements": []}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert results == []


# ---------------------------------------------------------------------------
# 19b. search_services – element without lat/lon
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_skips_coordinateless_elements(service, mock_ok_response):
    bad = {"type": "node", "id": 999, "tags": {"amenity": "hospital", "name": "No Coords"}}
    mock_ok_response.json.return_value = {"elements": [HOSPITAL_NODE, bad]}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert len(results) == 1
    assert results[0].id == "1001"


# ---------------------------------------------------------------------------
# 19c. search_services – hospital details (trauma, icu, 24hr)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_hospital_details(service, mock_ok_response):
    trauma = _make_node(3001, 13.01, 80.01, {
        "amenity": "hospital",
        "name": "Trauma Center",
        "healthcare:speciality": "trauma",
        "opening_hours": "24/7",
    })
    mock_ok_response.json.return_value = {"elements": [trauma]}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert len(results) == 1
    assert results[0].has_trauma is True
    assert results[0].is_24hr is True
    assert results[0].sub_category == "trauma_centre"


# ---------------------------------------------------------------------------
# 19d. search_services – item with missing name gets fallback
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_fallback_name(service, mock_ok_response):
    unnamed = _make_node(4001, 13.01, 80.01, {"amenity": "police"})
    mock_ok_response.json.return_value = {"elements": [unnamed]}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["police"], limit=10,
    )

    assert len(results) == 1
    assert results[0].name == "Police service"


# ---------------------------------------------------------------------------
# 19e. search_services – sorting (trauma > 24hr > distance)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_sorting_priority(service, mock_ok_response):
    far_trauma = _make_node(5001, 13.10, 80.10, {
        "amenity": "hospital",
        "name": "Far Trauma",
        "healthcare:speciality": "trauma",
        "opening_hours": "24/7",
    })
    near_non_trauma = _make_node(5002, 13.03, 80.03, {
        "amenity": "hospital",
        "name": "Near Non-Trauma",
    })
    mock_ok_response.json.return_value = {"elements": [near_non_trauma, far_trauma]}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert len(results) == 2
    assert results[0].name == "Far Trauma"
    assert results[1].name == "Near Non-Trauma"


# ---------------------------------------------------------------------------
# 19f. search_services – ambulance and towing categories
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_ambulance_and_towing(service, mock_ok_response):
    mock_ok_response.json.return_value = {
        "elements": [AMBULANCE_NODE, TOWING_NODE],
    }
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["ambulance", "towing"], limit=10,
    )

    assert len(results) == 2
    cats = {r.category for r in results}
    assert cats == {"ambulance", "towing"}


# ---------------------------------------------------------------------------
# 19g. search_services – phone fallback from contact:phone
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_contact_phone_fallback(service, mock_ok_response):
    node = _make_node(6001, 13.01, 80.01, {
        "amenity": "hospital",
        "name": "Hospital",
        "contact:phone": "9876543210",
    })
    mock_ok_response.json.return_value = {"elements": [node]}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert results[0].phone == "9876543210"


# ---------------------------------------------------------------------------
# 19h. search_services – id fallback when element has no id
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_fallback_id(service, mock_ok_response):
    no_id = {"type": "node", "lat": 13.01, "lon": 80.01, "tags": {"amenity": "hospital", "name": "No ID"}}
    mock_ok_response.json.return_value = {"elements": [no_id]}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert len(results) == 1
    assert "osm-hospital" in results[0].id


# ---------------------------------------------------------------------------
# 19i. search_services – address composition
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_address_composed(service, mock_ok_response):
    mock_ok_response.json.return_value = {"elements": [HOSPITAL_NODE]}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert results[0].address == "Main St, Chennai"


# ---------------------------------------------------------------------------
# 19j. search_services – elements with no elements key in payload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_search_services_payload_without_elements_key(service, mock_ok_response):
    mock_ok_response.json.return_value = {}
    service._client.post.return_value = mock_ok_response

    results = await service.search_services(
        lat=SAMPLE_LAT, lon=SAMPLE_LON, radius=5000,
        categories=["hospital"], limit=10,
    )

    assert results == []


# ---------------------------------------------------------------------------
# 20. get_road_context – returns RoadContext with correct fields
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_road_context_returns_correct_fields(service, mock_ok_response):
    road = _make_way(2001, 13.01, 80.01, {
        "highway": "primary",
        "name": "Grand Southern Trunk Road",
        "ref": "NH 45",
    })
    mock_ok_response.json.return_value = {"elements": [road]}
    service._client.post.return_value = mock_ok_response

    result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)

    assert result is not None
    assert result.road_type_code == "NH"
    assert result.road_type == "National Highway"
    assert result.road_name == "Grand Southern Trunk Road"
    assert result.road_number == "NH 45"
    assert result.tags == {"highway": "primary", "name": "Grand Southern Trunk Road", "ref": "NH 45"}
    assert isinstance(result.distance_meters, float)
    assert result.distance_meters > 0


# ---------------------------------------------------------------------------
# 21. get_road_context – no road found
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_road_context_no_road_returns_none(service, mock_ok_response):
    mock_ok_response.json.return_value = {"elements": []}
    service._client.post.return_value = mock_ok_response

    result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)

    assert result is None


# ---------------------------------------------------------------------------
# 21b. get_road_context – element without highway tag is skipped
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_road_context_skips_non_highway(service, mock_ok_response):
    no_highway = _make_way(999, 13.0, 80.0, {"amenity": "hospital"})
    road = _make_way(2001, 13.01, 80.01, {"highway": "secondary", "name": "Main Road"})
    mock_ok_response.json.return_value = {"elements": [no_highway, road]}
    service._client.post.return_value = mock_ok_response

    result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)

    assert result is not None
    assert result.road_name == "Main Road"


# ---------------------------------------------------------------------------
# 21c. get_road_context – element without coordinates is skipped
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_road_context_skips_coordinateless(service, mock_ok_response):
    no_coords = {"type": "way", "id": 999, "tags": {"highway": "primary", "name": "Ghost Road"}}
    road = _make_way(2002, 13.01, 80.01, {"highway": "tertiary", "name": "Real Road"})
    mock_ok_response.json.return_value = {"elements": [no_coords, road]}
    service._client.post.return_value = mock_ok_response

    result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)

    assert result is not None
    assert result.road_name == "Real Road"


# ---------------------------------------------------------------------------
# 22. get_road_context – different road types
# ---------------------------------------------------------------------------

class TestGetRoadContextClassification:
    @pytest.mark.asyncio
    async def test_national_highway(self, service, mock_ok_response):
        mock_ok_response.json.return_value = {
            "elements": [_make_way(1, 13.01, 80.01, {"highway": "trunk", "name": "NH Road"})],
        }
        service._client.post.return_value = mock_ok_response
        result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)
        assert (result.road_type_code, result.road_type) == ("NH", "National Highway")

    @pytest.mark.asyncio
    async def test_state_highway(self, service, mock_ok_response):
        mock_ok_response.json.return_value = {
            "elements": [_make_way(2, 13.01, 80.01, {"highway": "primary", "name": "SH Road", "ref": "SH 1"})],
        }
        service._client.post.return_value = mock_ok_response
        result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)
        assert (result.road_type_code, result.road_type) == ("SH", "State Highway")

    @pytest.mark.asyncio
    async def test_mdr(self, service, mock_ok_response):
        mock_ok_response.json.return_value = {
            "elements": [_make_way(3, 13.01, 80.01, {"highway": "secondary", "name": "MDR Road", "ref": "MDR 101"})],
        }
        service._client.post.return_value = mock_ok_response
        result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)
        assert (result.road_type_code, result.road_type) == ("MDR", "Major District Road")

    @pytest.mark.asyncio
    async def test_village_road(self, service, mock_ok_response):
        mock_ok_response.json.return_value = {
            "elements": [_make_way(4, 13.01, 80.01, {"highway": "track", "name": "Village Track"})],
        }
        service._client.post.return_value = mock_ok_response
        result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)
        assert (result.road_type_code, result.road_type) == ("VILLAGE", "Village Road")

    @pytest.mark.asyncio
    async def test_urban_road_default(self, service, mock_ok_response):
        mock_ok_response.json.return_value = {
            "elements": [_make_way(5, 13.01, 80.01, {"highway": "residential", "name": "Residential Road"})],
        }
        service._client.post.return_value = mock_ok_response
        result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)
        assert (result.road_type_code, result.road_type) == ("URBAN", "Urban Road")

    @pytest.mark.asyncio
    async def test_picks_closest_road(self, service, mock_ok_response):
        far = _make_way(10, 13.10, 80.30, {"highway": "primary", "name": "Far Road"})
        near = _make_way(11, 13.08, 80.27, {"highway": "secondary", "name": "Near Road"})
        mock_ok_response.json.return_value = {"elements": [far, near]}
        service._client.post.return_value = mock_ok_response
        result = await service.get_road_context(lat=SAMPLE_LAT, lon=SAMPLE_LON)
        assert result.road_name == "Near Road"


# ---------------------------------------------------------------------------
# 23. RoadContext dataclass
# ---------------------------------------------------------------------------

class TestRoadContext:
    def test_fields_accessible(self):
        ctx = RoadContext(
            road_type_code="NH",
            road_type="National Highway",
            road_name="GST Road",
            road_number="NH 45",
            tags={"highway": "trunk"},
            distance_meters=100.5,
        )
        assert ctx.road_type_code == "NH"
        assert ctx.road_type == "National Highway"
        assert ctx.road_name == "GST Road"
        assert ctx.road_number == "NH 45"
        assert ctx.tags == {"highway": "trunk"}
        assert ctx.distance_meters == 100.5

    def test_slots_prevent_dynamic_attributes(self):
        ctx = RoadContext(
            road_type_code="URBAN", road_type="Urban Road",
            road_name=None, road_number=None, tags={}, distance_meters=0.0,
        )
        with pytest.raises(AttributeError):
            ctx.new_attr = "should_fail"

    def test_optional_fields(self):
        ctx = RoadContext(
            road_type_code="URBAN", road_type="Urban Road",
            road_name=None, road_number=None, tags={}, distance_meters=50.0,
        )
        assert ctx.road_name is None
        assert ctx.road_number is None


# ---------------------------------------------------------------------------
# classify_road_type static method
# ---------------------------------------------------------------------------

class TestClassifyRoadType:
    @pytest.mark.parametrize("tags,expected", [
        ({"highway": "trunk"}, ("NH", "National Highway")),
        ({"highway": "primary", "ref": "NH 19"}, ("NH", "National Highway")),
        ({"highway": "primary"}, ("SH", "State Highway")),
        ({"highway": "primary", "ref": "SH 2"}, ("SH", "State Highway")),
        ({"highway": "secondary"}, ("MDR", "Major District Road")),
        ({"highway": "secondary", "ref": "MDR 55"}, ("MDR", "Major District Road")),
        ({"highway": "track"}, ("VILLAGE", "Village Road")),
        ({"highway": "unclassified"}, ("VILLAGE", "Village Road")),
        ({"highway": "residential"}, ("URBAN", "Urban Road")),
        ({"highway": "service"}, ("URBAN", "Urban Road")),
        ({"highway": "living_street"}, ("URBAN", "Urban Road")),
        ({}, ("URBAN", "Urban Road")),
    ])
    def test_classification(self, tags, expected):
        assert OverpassService.classify_road_type(tags) == expected


# ---------------------------------------------------------------------------
# Helper / internal static methods
# ---------------------------------------------------------------------------

class TestHaversineDistance:
    def test_same_point(self):
        assert OverpassService._haversine_distance(13.0, 80.0, 13.0, 80.0) == 0.0

    def test_one_degree_north(self):
        d = OverpassService._haversine_distance(13.0, 80.0, 14.0, 80.0)
        assert 110_000 < d < 112_000

    def test_one_degree_east_at_equator(self):
        d = OverpassService._haversine_distance(0.0, 0.0, 0.0, 1.0)
        assert 110_000 < d < 112_000

    def test_commutative(self):
        a = OverpassService._haversine_distance(13.0, 80.0, 14.0, 81.0)
        b = OverpassService._haversine_distance(14.0, 81.0, 13.0, 80.0)
        assert abs(a - b) < 0.001


class TestComposeAddress:
    def test_all_parts(self):
        tags = {
            "addr:housenumber": "123",
            "addr:street": "Main St",
            "addr:suburb": "Downtown",
            "addr:city": "Chennai",
            "addr:state": "TN",
        }
        assert OverpassService._compose_address(tags) == "123, Main St, Downtown, Chennai, TN"

    def test_address_fallback_city_chain(self):
        tags = {"addr:town": "TownName", "addr:street": "Street"}
        assert OverpassService._compose_address(tags) == "Street, TownName"

        tags_village = {"addr:village": "VillageName", "addr:street": "Street"}
        assert OverpassService._compose_address(tags_village) == "Street, VillageName"

    def test_no_parts(self):
        assert OverpassService._compose_address({}) is None

    def test_partial(self):
        assert OverpassService._compose_address({"addr:street": "Main St"}) == "Main St"


class TestSubCategory:
    def test_none_when_no_healthcare_info(self):
        assert OverpassService._sub_category({"amenity": "hospital"}) is None

    def test_trauma_centre(self):
        assert OverpassService._sub_category({"amenity": "hospital", "healthcare:speciality": "trauma"}) == "trauma_centre"

    def test_icu(self):
        assert OverpassService._sub_category({"amenity": "hospital", "name": "ICU Care"}) == "icu"

    def test_healthcare_general(self):
        assert OverpassService._sub_category({"amenity": "clinic", "healthcare": "general"}) == "general"


class TestIs24Hr:
    @pytest.mark.parametrize("tags", [
        {"opening_hours": "24/7"},
        {"opening_hours": "24 hours"},
        {"opening_hours": "24/7 every day"},
        {},
    ])
    def test_returns_true(self, tags):
        assert OverpassService._is_24hr(tags) is True

    @pytest.mark.parametrize("tags", [
        {"opening_hours": "Mo-Fr 09:00-18:00"},
        {"opening_hours": "Sunrise to sunset"},
    ])
    def test_returns_false(self, tags):
        assert OverpassService._is_24hr(tags) is False


class TestHasTrauma:
    def test_true_from_name(self):
        assert OverpassService._has_trauma({"name": "Trauma Center"}) is True

    def test_true_from_description(self):
        assert OverpassService._has_trauma({"description": "has trauma facility"}) is True

    def test_true_from_healthcare_speciality(self):
        assert OverpassService._has_trauma({"healthcare:speciality": "trauma"}) is True

    def test_false(self):
        assert OverpassService._has_trauma({"name": "General Hospital"}) is False


class TestHasIcu:
    def test_true_from_name(self):
        assert OverpassService._has_icu({"name": "ICU Ward"}) is True

    def test_true_from_healthcare(self):
        assert OverpassService._has_icu({"healthcare": "intensive_care"}) is True

    def test_false(self):
        assert OverpassService._has_icu({"name": "General Ward"}) is False


class TestExtractPoint:
    def test_from_node(self):
        el = {"type": "node", "lat": "12.34", "lon": "56.78"}
        assert OverpassService._extract_point(el) == (12.34, 56.78)

    def test_from_way_center(self):
        el = {"type": "way", "center": {"lat": "12.34", "lon": "56.78"}}
        assert OverpassService._extract_point(el) == (12.34, 56.78)

    def test_no_coordinates(self):
        assert OverpassService._extract_point({"type": "node"}) == (None, None)

    def test_empty_center(self):
        el = {"type": "way"}
        assert OverpassService._extract_point(el) == (None, None)

    def test_center_with_missing_keys(self):
        el = {"type": "way", "center": {}}
        assert OverpassService._extract_point(el) == (None, None)
