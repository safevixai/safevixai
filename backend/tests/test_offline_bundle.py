# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from fastapi.testclient import TestClient


class FakeEmergencyService:
    async def build_city_bundle(self, *, db, city):
        valid_cities = {"Chennai", "Mumbai", "Delhi", "Bangalore"}
        if city not in valid_cities:
            from services.exceptions import ServiceValidationError
            raise ServiceValidationError(f"City '{city}' is not available for offline download")

        return {
            "city": city,
            "emergency_numbers": {"112": "Emergency", "108": "Ambulance"},
            "hospitals": [
                {"name": "City Hospital", "lat": 13.0827, "lon": 80.2707},
            ],
            "police_stations": [
                {"name": "Central Police Station", "lat": 13.0850, "lon": 80.2730},
            ],
            "version": "1.0",
        }


def test_valid_city_returns_bundle(app):
    with TestClient(app) as client:
        client.app.state.emergency_service = FakeEmergencyService()
        response = client.get("/api/v1/offline/bundle/Chennai")

    assert response.status_code == 200
    payload = response.json()
    data = payload.get("data", payload)
    assert data["city"] == "Chennai"
    assert "emergency_numbers" in data
    assert "hospitals" in data
    assert data["version"] == "1.0"


def test_invalid_city_returns_404(app):
    with TestClient(app) as client:
        client.app.state.emergency_service = FakeEmergencyService()
        response = client.get("/api/v1/offline/bundle/InvalidCity")

    assert response.status_code == 404


def test_city_name_pattern_validation(app):
    with TestClient(app) as client:
        response = client.get("/api/v1/offline/bundle/123")

    assert response.status_code == 422


def test_city_name_too_short(app):
    with TestClient(app) as client:
        response = client.get("/api/v1/offline/bundle/A")

    assert response.status_code == 422


def test_city_name_with_special_chars(app):
    with TestClient(app) as client:
        response = client.get("/api/v1/offline/bundle/New@York")

    assert response.status_code == 422


def test_city_name_with_spaces(app):
    with TestClient(app) as client:
        response = client.get("/api/v1/offline/bundle/New York")

    assert response.status_code in (200, 404)


def test_city_name_with_hyphens(app):
    with TestClient(app) as client:
        response = client.get("/api/v1/offline/bundle/New-Delhi")

    assert response.status_code in (200, 404)


def test_bundle_contains_emergency_numbers(app):
    with TestClient(app) as client:
        client.app.state.emergency_service = FakeEmergencyService()
        response = client.get("/api/v1/offline/bundle/Mumbai")

    assert response.status_code == 200
    payload = response.json()
    data = payload.get("data", payload)
    assert "112" in data["emergency_numbers"]
    assert "108" in data["emergency_numbers"]


def test_bundle_contains_location_data(app):
    with TestClient(app) as client:
        client.app.state.emergency_service = FakeEmergencyService()
        response = client.get("/api/v1/offline/bundle/Bangalore")

    assert response.status_code == 200
    payload = response.json()
    data = payload.get("data", payload)
    assert len(data["hospitals"]) >= 1
    assert "lat" in data["hospitals"][0]
    assert "lon" in data["hospitals"][0]
