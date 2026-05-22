from __future__ import annotations

import pytest

from services.report_classifier import ReportClassifier


@pytest.fixture
def classifier():
    return ReportClassifier()


class TestReportClassifier:
    def test_classify_pothole(self, classifier):
        result = classifier.classify("There is a large pothole on the road near the market")
        assert result["issue_type"] == "pothole"
        assert result["issue_type_confidence"] >= 0.3
        assert 1 <= result["severity"] <= 5

    def test_classify_crack(self, classifier):
        result = classifier.classify("Deep crack running across the highway surface")
        assert result["issue_type"] == "crack"
        assert result["issue_type_confidence"] >= 0.3

    def test_classify_flooding(self, classifier):
        result = classifier.classify("Severe water logging after rain, road completely flooded")
        assert result["issue_type"] == "flooding"
        assert result["severity"] >= 3

    def test_classify_broken_signal(self, classifier):
        result = classifier.classify("Traffic signal at junction not working since yesterday")
        assert result["issue_type"] == "broken_signal"

    def test_classify_road_hazard(self, classifier):
        result = classifier.classify("Debris and fallen tree blocking the road")
        assert result["issue_type"] == "road_hazard"

    def test_classify_streetlight(self, classifier):
        result = classifier.classify("Street light not working on this road for a week now")
        assert result["issue_type"] == "streetlight"

    def test_classify_guardrail(self, classifier):
        result = classifier.classify("Guardrail damaged after accident, metal barrier bent")
        assert result["issue_type"] == "guardrail"

    def test_classify_signage(self, classifier):
        result = classifier.classify("Road sign missing at the intersection")
        assert result["issue_type"] == "signage"

    def test_classify_pedestrian(self, classifier):
        result = classifier.classify("Footpath broken and unsafe for pedestrians")
        assert result["issue_type"] == "pedestrian"

    def test_classify_encroachment(self, classifier):
        result = classifier.classify("Illegal vendor encroachment on road shoulder")
        assert result["issue_type"] == "encroachment"

    def test_classify_severity_critical(self, classifier):
        result = classifier.classify("Fatal accident on highway, road completely blocked, life threatening situation")
        assert result["severity"] == 5
        assert result["severity_confidence"] >= 0.5

    def test_classify_severity_minor(self, classifier):
        result = classifier.classify("Minor superficial crack, cosmetic only")
        assert result["severity"] <= 2

    def test_classify_empty_description(self, classifier):
        result = classifier.classify("", "pothole")
        assert result["issue_type"] == "pothole"
        assert result["classification_method"] == "fallback"

    def test_classify_none_description(self, classifier):
        result = classifier.classify(None, "road_hazard")
        assert result["issue_type"] == "road_hazard"
        assert result["classification_method"] == "fallback"

    def test_classify_general_text(self, classifier):
        result = classifier.classify("The road surface is damaged and needs repair", "damaged_road")
        assert result["issue_type"] == "damaged_road"
        assert result["issue_type_confidence"] >= 0.3

    def test_classify_matched_keywords(self, classifier):
        result = classifier.classify("Large pothole and crack near the signal")
        assert len(result["matched_keywords"]) >= 1
        assert any("pothole" in kw or "crack" in kw for kw in result["matched_keywords"])

    def test_classify_method(self, classifier):
        result = classifier.classify("Pothole on main road")
        assert result["classification_method"] == "rule_based"
