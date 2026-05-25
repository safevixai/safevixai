import math

from services.workload_balancer import OfficerScore, _haversine_km


class TestHaversineKm:
    def test_same_point_zero(self):
        assert _haversine_km(13.0827, 80.2707, 13.0827, 80.2707) == 0.0

    def test_one_degree_lat_approx_111km(self):
        dist = _haversine_km(13.0, 80.0, 14.0, 80.0)
        assert 110.0 < dist < 112.0

    def test_symmetric(self):
        d1 = _haversine_km(13.0, 80.0, 14.0, 81.0)
        d2 = _haversine_km(14.0, 81.0, 13.0, 80.0)
        assert math.isclose(d1, d2, rel_tol=1e-9)

    def test_chennai_to_delhi(self):
        dist = _haversine_km(13.0827, 80.2707, 28.6139, 77.2090)
        assert 1700 < dist < 1900

    def test_small_distance(self):
        dist = _haversine_km(13.0, 80.0, 13.001, 80.0)
        assert 0.05 < dist < 0.2

    def test_antipodal(self):
        dist = _haversine_km(0, 0, 0, 180)
        assert 19900 < dist < 20100

    def test_consistency_with_complaint_cluster(self):
        from services.complaint_cluster import _haversine
        km = _haversine_km(13.0, 80.0, 14.0, 81.0)
        m = _haversine(13.0, 80.0, 14.0, 81.0)
        assert math.isclose(km, m / 1000, rel_tol=1e-3)


class TestOfficerScore:
    def test_dataclass_all_fields(self):
        s = OfficerScore(
            officer_id="off-001",
            officer_name="Ravi Kumar",
            department="Traffic",
            ward_id="ward_050",
            current_workload=3,
            is_on_shift=True,
            distance_km=1.5,
            composite_score=95.0,
            reasons=["Ward match", "Low workload"],
        )
        assert s.officer_id == "off-001"
        assert s.officer_name == "Ravi Kumar"
        assert s.department == "Traffic"
        assert s.ward_id == "ward_050"
        assert s.current_workload == 3
        assert s.is_on_shift is True
        assert s.distance_km == 1.5
        assert s.composite_score == 95.0
        assert s.reasons == ["Ward match", "Low workload"]

    def test_dataclass_none_ward_and_distance(self):
        s = OfficerScore(
            officer_id="off-002",
            officer_name="Priya",
            department="Police",
            ward_id=None,
            current_workload=0,
            is_on_shift=False,
            distance_km=None,
            composite_score=50.0,
            reasons=["General"],
        )
        assert s.ward_id is None
        assert s.distance_km is None

    def test_dataclass_edge_workload(self):
        s = OfficerScore(
            officer_id="off-003",
            officer_name="Test",
            department="Test",
            ward_id=None,
            current_workload=15,
            is_on_shift=True,
            distance_km=0.0,
            composite_score=100.0,
            reasons=[],
        )
        assert s.current_workload == 15
        assert s.distance_km == 0.0
        assert s.reasons == []
