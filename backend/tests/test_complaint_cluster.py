from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.complaint_cluster import (
    ComplaintClusterService,
    SpatialCluster,
    _haversine,
    dbscan_cluster,
)


class TestHaversine:
    def test_same_point_zero(self):
        assert _haversine(13.0827, 80.2707, 13.0827, 80.2707) == 0.0

    def test_known_distance_one_degree_lat(self):
        dist = _haversine(13.0, 80.0, 14.0, 80.0)
        assert 110_000 < dist < 112_000

    def test_symmetric(self):
        d1 = _haversine(13.0, 80.0, 14.0, 81.0)
        d2 = _haversine(14.0, 81.0, 13.0, 80.0)
        assert pytest.approx(d1, rel=1e-9) == d2

    def test_chennai_to_delhi_approx(self):
        dist = _haversine(13.0827, 80.2707, 28.6139, 77.2090)
        assert 1_700_000 < dist < 1_900_000

    def test_antipodal_points(self):
        dist = _haversine(0, 0, 0, 180)
        assert 19_900_000 < dist < 20_100_000


class TestSpatialCluster:
    def test_dataclass_defaults(self):
        c = SpatialCluster(
            cluster_id=0,
            centroid_lat=13.0,
            centroid_lon=80.0,
            point_count=3,
            radius_meters=150.0,
            dominant_issue_type="pothole",
            avg_severity=3.5,
        )
        assert c.cluster_id == 0
        assert c.centroid_lat == 13.0
        assert c.centroid_lon == 80.0
        assert c.point_count == 3
        assert c.radius_meters == 150.0
        assert c.dominant_issue_type == "pothole"
        assert c.avg_severity == 3.5
        assert c.issue_uuids == []
        assert c.issue_types == {}

    def test_dataclass_with_all_fields(self):
        uuids = [str(uuid.uuid4()) for _ in range(2)]
        c = SpatialCluster(
            cluster_id=1,
            centroid_lat=13.1,
            centroid_lon=80.1,
            point_count=2,
            radius_meters=100.0,
            dominant_issue_type="road_hazard",
            avg_severity=4.0,
            issue_uuids=uuids,
            issue_types={"road_hazard": 1, "pothole": 1},
        )
        assert c.issue_uuids == uuids
        assert c.issue_types == {"road_hazard": 1, "pothole": 1}


class TestDbscanCluster:
    def test_empty_points(self):
        assert dbscan_cluster([], eps_meters=200, min_samples=3) == []

    def test_single_point_noise(self):
        points = [{"lat": 13.0, "lon": 80.0, "uuid": "a", "issue_type": "pothole", "severity": 3}]
        result = dbscan_cluster(points, eps_meters=200, min_samples=3)
        assert result == []

    def test_two_close_points_below_min_samples(self):
        points = [
            {"lat": 13.0, "lon": 80.0, "uuid": "a", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0005, "lon": 80.0, "uuid": "b", "issue_type": "pothole", "severity": 4},
        ]
        result = dbscan_cluster(points, eps_meters=200, min_samples=3)
        assert result == []

    def test_three_close_points_form_cluster(self):
        points = [
            {"lat": 13.0, "lon": 80.0, "uuid": "a", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0005, "lon": 80.0, "uuid": "b", "issue_type": "pothole", "severity": 4},
            {"lat": 13.0010, "lon": 80.0, "uuid": "c", "issue_type": "road_hazard", "severity": 5},
        ]
        result = dbscan_cluster(points, eps_meters=200, min_samples=3)
        assert len(result) == 1
        c = result[0]
        assert c.point_count == 3
        assert c.dominant_issue_type == "pothole"
        assert c.avg_severity == 4.0
        assert len(c.issue_uuids) == 3
        assert len(c.issue_types) == 2

    def test_two_clusters_far_apart(self):
        points = [
            {"lat": 13.0, "lon": 80.0, "uuid": "a", "issue_type": "pothole", "severity": 2},
            {"lat": 13.0005, "lon": 80.0, "uuid": "b", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0010, "lon": 80.0, "uuid": "c", "issue_type": "pothole", "severity": 4},
            {"lat": 14.0, "lon": 80.0, "uuid": "d", "issue_type": "road_hazard", "severity": 4},
            {"lat": 14.0005, "lon": 80.0, "uuid": "e", "issue_type": "road_hazard", "severity": 5},
            {"lat": 14.0010, "lon": 80.0, "uuid": "f", "issue_type": "road_hazard", "severity": 5},
        ]
        result = dbscan_cluster(points, eps_meters=200, min_samples=3)
        assert len(result) == 2
        assert result[0].point_count >= result[1].point_count
        assert all(c.cluster_id >= 0 for c in result)

    def test_some_noise_points(self):
        points = [
            {"lat": 13.0, "lon": 80.0, "uuid": "a", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0005, "lon": 80.0, "uuid": "b", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0010, "lon": 80.0, "uuid": "c", "issue_type": "pothole", "severity": 3},
            {"lat": 15.0, "lon": 80.0, "uuid": "d", "issue_type": "flooding", "severity": 5},
        ]
        result = dbscan_cluster(points, eps_meters=200, min_samples=3)
        assert len(result) == 1
        assert result[0].point_count == 3

    def test_default_parameters(self):
        points = [
            {"lat": 13.0, "lon": 80.0, "uuid": "a", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0015, "lon": 80.0, "uuid": "b", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0030, "lon": 80.0, "uuid": "c", "issue_type": "pothole", "severity": 3},
        ]
        result = dbscan_cluster(points)
        assert len(result) == 1

    def test_missing_fields_default_handling(self):
        points = [
            {"lat": 13.0, "lon": 80.0},
            {"lat": 13.0005, "lon": 80.0},
            {"lat": 13.0010, "lon": 80.0},
        ]
        result = dbscan_cluster(points, eps_meters=200, min_samples=3)
        assert len(result) == 1
        assert result[0].dominant_issue_type == "unknown"
        assert result[0].avg_severity == 3.0

    def test_varying_eps_affects_clustering(self):
        points = [
            {"lat": 13.0, "lon": 80.0, "uuid": "a", "issue_type": "pothole", "severity": 3},
            {"lat": 13.01, "lon": 80.0, "uuid": "b", "issue_type": "pothole", "severity": 3},
            {"lat": 13.02, "lon": 80.0, "uuid": "c", "issue_type": "pothole", "severity": 3},
        ]
        tight = dbscan_cluster(points, eps_meters=100, min_samples=3)
        loose = dbscan_cluster(points, eps_meters=3000, min_samples=3)
        assert len(tight) == 0
        assert len(loose) == 1

    def test_identical_complaints_same_location(self):
        points = [
            {"lat": 13.0, "lon": 80.0, "uuid": "a", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0, "lon": 80.0, "uuid": "b", "issue_type": "pothole", "severity": 3},
            {"lat": 13.0, "lon": 80.0, "uuid": "c", "issue_type": "pothole", "severity": 3},
        ]
        result = dbscan_cluster(points, eps_meters=100, min_samples=3)
        assert len(result) == 1
        assert result[0].point_count == 3
        assert result[0].radius_meters == 0.0


class TestComplaintClusterService:
    @pytest.mark.asyncio
    async def test_find_clusters_returns_empty_below_min_samples(self):
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = []  # 0 rows < min_samples(3)
        db.execute = AsyncMock(return_value=mock_result)

        clusters = await ComplaintClusterService.find_clusters(db)
        assert clusters == []

    @pytest.mark.asyncio
    async def test_find_clusters_with_city_filter(self):
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = []
        db.execute = AsyncMock(return_value=mock_result)

        with patch("services.complaint_cluster.RoadIssue.city", "Chennai", create=True):
            clusters = await ComplaintClusterService.find_clusters(db, city="Chennai")
        assert clusters == []

    @pytest.mark.asyncio
    async def test_find_clusters_with_ward_filter(self):
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = []
        db.execute = AsyncMock(return_value=mock_result)

        clusters = await ComplaintClusterService.find_clusters(db, ward_id="WARD-01")
        assert clusters == []

    @pytest.mark.asyncio
    async def test_find_clusters_with_custom_status_filter(self):
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = []
        db.execute = AsyncMock(return_value=mock_result)

        clusters = await ComplaintClusterService.find_clusters(
            db, status_filter=["open"]
        )
        assert clusters == []

    @pytest.mark.asyncio
    async def test_find_clusters_with_rows_given(self):
        db = AsyncMock()
        row1 = MagicMock()
        row1.lat = 13.0
        row1.lon = 80.0
        row1.uuid = "aaa"
        row1.issue_type = "pothole"
        row1.severity = 3

        row2 = MagicMock()
        row2.lat = 13.0005
        row2.lon = 80.0
        row2.uuid = "bbb"
        row2.issue_type = "pothole"
        row2.severity = 4

        row3 = MagicMock()
        row3.lat = 13.0010
        row3.lon = 80.0
        row3.uuid = "ccc"
        row3.issue_type = "road_hazard"
        row3.severity = 5

        mock_result = MagicMock()
        mock_result.all.return_value = [row1, row2, row3]
        db.execute = AsyncMock(return_value=mock_result)

        clusters = await ComplaintClusterService.find_clusters(db, eps_meters=500)
        assert len(clusters) == 1
        assert clusters[0].point_count == 3

    @pytest.mark.asyncio
    async def test_get_hotspots_returns_top_n(self):
        db = AsyncMock()

        rows = []
        for i in range(5):
            r = MagicMock()
            r.lat = 13.0 + i * 0.001
            r.lon = 80.0 + i * 0.001
            r.uuid = f"uuid-{i}"
            r.issue_type = "pothole"
            r.severity = 3
            rows.append(r)

        mock_result = MagicMock()
        mock_result.all.return_value = rows
        db.execute = AsyncMock(return_value=mock_result)

        hotspots = await ComplaintClusterService.get_hotspots(db, top_n=2)
        assert isinstance(hotspots, list)
        assert len(hotspots) <= 2
        if hotspots:
            assert "cluster_id" in hotspots[0]
            assert "lat" in hotspots[0]
            assert "lon" in hotspots[0]
            assert "complaint_count" in hotspots[0]

    @pytest.mark.asyncio
    async def test_get_hotspots_empty(self):
        db = AsyncMock()
        mock_result = MagicMock()
        mock_result.all.return_value = []
        db.execute = AsyncMock(return_value=mock_result)

        hotspots = await ComplaintClusterService.get_hotspots(db)
        assert hotspots == []
