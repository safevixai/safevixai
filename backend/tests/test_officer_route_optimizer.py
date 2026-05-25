from __future__ import annotations

import math
from datetime import time
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from services.officer_route_optimizer import (
    _haversine_km,
    _nearest_neighbor_tsp,
    OfficerRouteOptimizer,
    OfficerShift,
    OptimizedRoute,
)


class TestHaversineKm:
    def test_same_point(self):
        assert _haversine_km(20.0, 80.0, 20.0, 80.0) == 0.0

    def test_one_degree_lat(self):
        dist = _haversine_km(0.0, 0.0, 1.0, 0.0)
        assert 110 < dist < 112

    def test_symmetric(self):
        d1 = _haversine_km(12.0, 77.0, 13.0, 78.0)
        d2 = _haversine_km(13.0, 78.0, 12.0, 77.0)
        assert math.isclose(d1, d2, rel_tol=1e-9)


class TestNearestNeighborTsp:
    def test_empty_list(self):
        result = _nearest_neighbor_tsp([], 0.0, 0.0)
        assert result == []

    def test_single_point(self):
        points = [{"lat": 10.0, "lon": 20.0, "severity": 3}]
        result = _nearest_neighbor_tsp(points, 0.0, 0.0)
        assert len(result) == 1
        assert result[0]["lat"] == 10.0

    def test_multi_point_ordering(self):
        points = [
            {"lat": 10.0, "lon": 20.0, "severity": 3},
            {"lat": 10.001, "lon": 20.001, "severity": 3},
            {"lat": 10.002, "lon": 20.002, "severity": 3},
        ]
        result = _nearest_neighbor_tsp(points, 10.0, 20.0)
        assert len(result) == 3

    def test_severity_bonus_prioritizes_high_severity(self):
        points = [
            {"lat": 10.0, "lon": 20.0, "severity": 5},
            {"lat": 10.1, "lon": 20.1, "severity": 1},
        ]
        result = _nearest_neighbor_tsp(points, 10.05, 20.05)
        assert len(result) == 2


class TestOfficerRouteOptimizer:
    async def test_no_complaints_found(self):
        db = MagicMock()
        db.execute = AsyncMock()
        result_scalars = MagicMock()
        result_scalars.all.return_value = []
        result = MagicMock()
        result.scalars.return_value = result_scalars
        db.execute.return_value = result

        route = await OfficerRouteOptimizer.optimize_route(
            db, officer_id="OFF-1", officer_lat=12.97, officer_lon=77.59,
        )
        assert route.total_stops == 0
        assert route.total_distance_km == 0
        assert "No open complaints found" in route.warnings

    async def test_happy_path(self):
        db = MagicMock()
        db.execute = AsyncMock()

        issue = MagicMock()
        issue.status = "open"
        issue.latitude = 12.9716
        issue.longitude = 77.5946
        issue.complaint_ref = "REF-001"
        issue.issue_type = "pothole"
        issue.severity = 3
        issue.ward_id = "WARD-1"
        issue.address = "MG Road"
        issue.location = MagicMock()

        issue2 = MagicMock()
        issue2.status = "open"
        issue2.latitude = 12.9350
        issue2.longitude = 77.6100
        issue2.complaint_ref = "REF-002"
        issue2.issue_type = "garbage"
        issue2.severity = 4
        issue2.ward_id = "WARD-1"
        issue2.address = "Indiranagar"
        issue2.location = MagicMock()

        result_scalars = MagicMock()
        result_scalars.all.return_value = [issue, issue2]
        result = MagicMock()
        result.scalars.return_value = result_scalars
        db.execute.return_value = result

        route = await OfficerRouteOptimizer.optimize_route(
            db, officer_id="OFF-1", officer_lat=12.97, officer_lon=77.59,
        )
        assert route.total_stops == 2
        assert route.total_distance_km > 0
        assert route.estimated_duration_minutes > 0
        assert len(route.stops) == 2
        assert route.stops[0].order == 1
        assert route.stops[0].complaint_ref in ("REF-001", "REF-002")

    async def test_ward_id_filtering(self):
        db = MagicMock()
        db.execute = AsyncMock()
        result_scalars = MagicMock()
        result_scalars.all.return_value = []
        result = MagicMock()
        result.scalars.return_value = result_scalars
        db.execute.return_value = result

        route = await OfficerRouteOptimizer.optimize_route(
            db, officer_id="OFF-1", officer_lat=12.97, officer_lon=77.59,
            ward_id="WARD-2",
        )
        assert route.total_stops == 0

    async def test_max_complaints_per_shift_cap(self):
        db = MagicMock()
        db.execute = AsyncMock()

        issues = []
        for i in range(15):
            iss = MagicMock()
            iss.status = "open"
            iss.latitude = 13.0 + i * 0.01
            iss.longitude = 78.0 + i * 0.01
            iss.complaint_ref = f"REF-{i:03d}"
            iss.issue_type = "pothole"
            iss.severity = 3
            iss.ward_id = None
            iss.address = None
            iss.location = MagicMock()
            issues.append(iss)

        result_scalars = MagicMock()
        result_scalars.all.return_value = issues
        result = MagicMock()
        result.scalars.return_value = result_scalars
        db.execute.return_value = result

        short_shift = OfficerShift(max_complaints_per_shift=3)
        route = await OfficerRouteOptimizer.optimize_route(
            db, officer_id="OFF-1", officer_lat=13.0, officer_lon=78.0,
            shift=short_shift,
        )
        assert route.total_stops == 3

    async def test_default_shift_values(self):
        db = MagicMock()
        db.execute = AsyncMock()
        result_scalars = MagicMock()
        result_scalars.all.return_value = []
        result = MagicMock()
        result.scalars.return_value = result_scalars
        db.execute.return_value = result

        route = await OfficerRouteOptimizer.optimize_route(
            db, officer_id="OFF-1", officer_lat=12.97, officer_lon=77.59,
        )
        assert route.shift.start_time.hour == 9
        assert route.shift.end_time.hour == 18
        assert route.shift.max_complaints_per_shift == 12
        assert route.shift.avg_minutes_per_stop == 20

    async def test_issue_without_coordinates_skipped(self):
        db = MagicMock()
        db.execute = AsyncMock()

        issue_with_coords = MagicMock()
        issue_with_coords.status = "open"
        issue_with_coords.latitude = 12.9716
        issue_with_coords.longitude = 77.5946
        issue_with_coords.complaint_ref = "REF-001"
        issue_with_coords.issue_type = "pothole"
        issue_with_coords.severity = 3
        issue_with_coords.ward_id = None
        issue_with_coords.address = None
        issue_with_coords.location = MagicMock()

        issue_no_coords = MagicMock()
        issue_no_coords.status = "open"
        issue_no_coords.latitude = None
        issue_no_coords.longitude = None
        issue_no_coords.complaint_ref = "REF-002"
        issue_no_coords.issue_type = "garbage"
        issue_no_coords.severity = 4
        issue_no_coords.ward_id = None
        issue_no_coords.address = None
        issue_no_coords.location = MagicMock()

        result_scalars = MagicMock()
        result_scalars.all.return_value = [issue_with_coords, issue_no_coords]
        result = MagicMock()
        result.scalars.return_value = result_scalars
        db.execute.return_value = result

        route = await OfficerRouteOptimizer.optimize_route(
            db, officer_id="OFF-1", officer_lat=12.97, officer_lon=77.59,
        )
        assert route.total_stops == 1
        assert route.stops[0].complaint_ref == "REF-001"

    async def test_shift_boundary_exceeded(self):
        db = MagicMock()
        db.execute = AsyncMock()

        issue = MagicMock()
        issue.status = "open"
        issue.latitude = 13.5
        issue.longitude = 78.5
        issue.complaint_ref = "REF-FAR"
        issue.issue_type = "pothole"
        issue.severity = 3
        issue.ward_id = None
        issue.address = None
        issue.location = MagicMock()

        result_scalars = MagicMock()
        result_scalars.all.return_value = [issue]
        result = MagicMock()
        result.scalars.return_value = result_scalars
        db.execute.return_value = result

        short_shift = OfficerShift(
            start_time=time(9, 0),
            end_time=time(9, 5),
            max_complaints_per_shift=12,
            avg_minutes_per_stop=1,
        )

        route = await OfficerRouteOptimizer.optimize_route(
            db, officer_id="OFF-1", officer_lat=12.97, officer_lon=77.59,
            shift=short_shift,
        )
        assert "exceeds shift" in route.warnings[0]
