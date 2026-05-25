from services.escalation_predictor import (
    EscalationPrediction,
    HIGH_RISK_TYPES,
    SEVERITY_WEIGHTS,
)


class TestEscalationPrediction:
    def test_dataclass_minimal(self):
        p = EscalationPrediction(
            issue_uuid="abc-123",
            risk_score=0.45,
            risk_level="medium",
            contributing_factors=["Test factor"],
            recommended_action="Monitor",
            predicted_escalation_hours=24,
        )
        assert p.issue_uuid == "abc-123"
        assert p.risk_score == 0.45
        assert p.risk_level == "medium"
        assert p.contributing_factors == ["Test factor"]
        assert p.recommended_action == "Monitor"
        assert p.predicted_escalation_hours == 24

    def test_dataclass_none_escalation_hours(self):
        p = EscalationPrediction(
            issue_uuid="def-456",
            risk_score=0.1,
            risk_level="low",
            contributing_factors=[],
            recommended_action="Standard queue",
            predicted_escalation_hours=None,
        )
        assert p.predicted_escalation_hours is None

    def test_dataclass_edge_scores(self):
        p = EscalationPrediction(
            issue_uuid="min",
            risk_score=0.0,
            risk_level="low",
            contributing_factors=[],
            recommended_action="None",
            predicted_escalation_hours=None,
        )
        assert 0.0 <= p.risk_score <= 1.0

        p2 = EscalationPrediction(
            issue_uuid="max",
            risk_score=1.0,
            risk_level="critical",
            contributing_factors=["Everything"],
            recommended_action="Escalate now",
            predicted_escalation_hours=1,
        )
        assert p2.risk_score == 1.0
        assert p2.risk_level == "critical"

    def test_risk_levels_strings(self):
        for level in ("low", "medium", "high", "critical"):
            p = EscalationPrediction(
                issue_uuid="x",
                risk_score=0.5,
                risk_level=level,
                contributing_factors=["x"],
                recommended_action="x",
                predicted_escalation_hours=12,
            )
            assert p.risk_level == level


class TestConstants:
    def test_high_risk_types_keys(self):
        expected = {"flooding", "road_hazard", "broken_signal", "road_collapse", "electrical_hazard"}
        assert set(HIGH_RISK_TYPES.keys()) == expected

    def test_high_risk_types_values_in_range(self):
        for key, weight in HIGH_RISK_TYPES.items():
            assert 0.0 <= weight <= 1.0, f"{key} weight {weight} out of range"

    def test_severity_weights_keys(self):
        assert set(SEVERITY_WEIGHTS.keys()) == {1, 2, 3, 4, 5}

    def test_severity_weights_monotonic(self):
        for sev in (1, 2, 3, 4, 5):
            assert SEVERITY_WEIGHTS[sev] >= SEVERITY_WEIGHTS.get(sev - 1, 0)

    def test_severity_weights_max_not_exceeding(self):
        assert SEVERITY_WEIGHTS[5] <= 1.0
