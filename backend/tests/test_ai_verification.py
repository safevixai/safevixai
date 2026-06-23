# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

from services.ai_verification import AIVerificationPipeline, VerificationFlag, VerificationResult


def test_check_geo_consistency_lat_too_low():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_geo_consistency(-10.0, 80.0)
    assert len(flags) == 1
    assert flags[0].flag_type == "geo_anomaly"
    assert flags[0].severity == "critical"
    assert flags[0].score_impact == 0.8


def test_check_geo_consistency_lat_too_high():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_geo_consistency(40.0, 80.0)
    assert len(flags) == 1
    assert flags[0].severity == "critical"


def test_check_geo_consistency_lon_too_low():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_geo_consistency(20.0, 10.0)
    assert len(flags) == 1
    assert flags[0].severity == "critical"


def test_check_geo_consistency_lon_too_high():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_geo_consistency(20.0, 120.0)
    assert len(flags) == 1
    assert flags[0].severity == "critical"


def test_check_geo_consistency_null_island():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_geo_consistency(0.005, -0.005)
    null_island_flags = [f for f in flags if "null/zero" in f.message]
    assert len(null_island_flags) == 1
    assert null_island_flags[0].score_impact == 0.9


def test_check_geo_consistency_null_island_combined():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_geo_consistency(0.005, 200.0)
    assert len(flags) == 2


def test_check_geo_consistency_valid():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_geo_consistency(20.0, 80.0)
    assert len(flags) == 0


def test_check_spam_pattern():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_spam("this is a test for testing")
    spam_flags = [f for f in flags if f.flag_type == "spam"]
    assert len(spam_flags) >= 1
    assert spam_flags[0].severity == "warning"
    assert spam_flags[0].score_impact == 0.3


def test_check_spam_repeated_chars():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_spam("aaaaaaa")
    spam_flags = [f for f in flags if f.flag_type == "spam"]
    assert len(spam_flags) >= 1


def test_check_spam_all_caps():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_spam("THIS IS AN ANGRY REPORT")
    caps_flags = [f for f in flags if "uppercase" in f.message]
    assert len(caps_flags) == 1
    assert caps_flags[0].severity == "info"
    assert caps_flags[0].score_impact == 0.1


def test_check_spam_short_text():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_spam("ab")
    short_flags = [f for f in flags if f.flag_type == "low_quality"]
    assert len(short_flags) == 1
    assert short_flags[0].score_impact == 0.15


def test_check_spam_normal_text():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_spam("There is a large pothole on the main road near the signal")
    assert len(flags) == 0


def test_check_image_too_small():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_image(100)
    small_flags = [f for f in flags if "too small" in f.message]
    assert len(small_flags) == 1
    assert small_flags[0].severity == "warning"
    assert small_flags[0].score_impact == 0.2


def test_check_image_too_large():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_image(20 * 1024 * 1024)
    large_flags = [f for f in flags if "exceeds" in f.message]
    assert len(large_flags) == 1
    assert large_flags[0].severity == "info"
    assert large_flags[0].score_impact == 0.05


def test_check_image_within_bounds():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_image(1024 * 1024)
    assert len(flags) == 0


def test_verify_category_mismatch_high_confidence():
    pipeline = AIVerificationPipeline()
    ai_class = {"issue_type": "pothole", "issue_type_confidence": 0.85, "severity": 4}
    flags, cat, sev = pipeline._verify_category("roads", 3, ai_class)
    mismatch = [f for f in flags if f.flag_type == "category_mismatch"]
    assert len(mismatch) == 1
    assert mismatch[0].score_impact == 0.0
    assert cat == "pothole"
    assert sev == 4


def test_verify_category_mismatch_low_confidence():
    pipeline = AIVerificationPipeline()
    ai_class = {"issue_type": "pothole", "issue_type_confidence": 0.5, "severity": 4}
    flags, cat, sev = pipeline._verify_category("roads", 3, ai_class)
    assert len([f for f in flags if f.flag_type == "category_mismatch"]) == 0
    assert cat == "roads"
    assert sev == 3


def test_verify_category_low_confidence():
    pipeline = AIVerificationPipeline()
    ai_class = {"issue_type": "roads", "issue_type_confidence": 0.2, "severity": 3}
    flags, cat, sev = pipeline._verify_category("roads", 3, ai_class)
    low_conf = [f for f in flags if f.flag_type == "low_confidence"]
    assert len(low_conf) == 1
    assert low_conf[0].score_impact == 0.15


async def test_check_rate_limit_critical():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar.return_value = 10
    db.execute.return_value = result
    flags = await pipeline._check_rate_limit(db, "+911234567890")
    rate = [f for f in flags if f.flag_type == "rate_limit"]
    assert len(rate) == 1
    assert rate[0].severity == "critical"
    assert rate[0].score_impact == 0.6


async def test_check_rate_limit_warning():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar.return_value = 5
    db.execute.return_value = result
    flags = await pipeline._check_rate_limit(db, "+911234567890")
    rate = [f for f in flags if f.flag_type == "rate_limit"]
    assert len(rate) == 1
    assert rate[0].severity == "warning"
    assert rate[0].score_impact == 0.2


async def test_check_rate_limit_ok():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar.return_value = 1
    db.execute.return_value = result
    flags = await pipeline._check_rate_limit(db, "+911234567890")
    assert len(flags) == 0


async def test_check_rate_limit_exception_caught():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock(side_effect=Exception("DB error"))
    flags = await pipeline._check_rate_limit(db, "+911234567890")
    assert len(flags) == 0


def test_check_description_quality_short():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_description_quality("a b")
    assert len(flags) == 1
    assert flags[0].score_impact == 0.05
    assert flags[0].severity == "info"


def test_check_description_quality_medium():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_description_quality("a b c d e")
    assert len(flags) == 0


def test_check_description_quality_good():
    pipeline = AIVerificationPipeline()
    flags = pipeline._check_description_quality("a b c d e f g h i j k")
    assert len(flags) == 0


async def test_full_pipeline_happy_path():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar.return_value = 0
    db.execute.return_value = result

    res = await pipeline.verify(
        db=db,
        lat=20.0,
        lon=80.0,
        issue_type="pothole",
        severity=3,
        description="A big pothole on the road near the junction causing accidents for bikers",
        photo_url="https://example.com/photo.jpg",
        photo_size_bytes=500000,
        ai_classification={"issue_type": "pothole", "issue_type_confidence": 0.85, "severity": 3},
        citizen_phone="+911234567890",
    )
    assert res.verified is True
    assert res.routing_recommendation == "auto_route"
    assert res.confidence_score > 0.4
    assert res.verified_category == "pothole"


async def test_full_pipeline_reject_on_critical():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar.return_value = 0
    db.execute.return_value = result

    res = await pipeline.verify(
        db=db,
        lat=50.0,
        lon=80.0,
        issue_type="pothole",
        severity=3,
        description="normal description",
        photo_url=None,
        photo_size_bytes=None,
    )
    assert res.verified is False
    assert res.routing_recommendation == "reject"
    assert res.should_reject is True
    assert res.needs_human_review is False


async def test_full_pipeline_human_review_low_confidence():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar.return_value = 0
    db.execute.return_value = result

    res = await pipeline.verify(
        db=db,
        lat=20.0,
        lon=80.0,
        issue_type="pothole",
        severity=3,
        description="test",
        photo_url="https://example.com/photo.jpg",
        photo_size_bytes=100,
        ai_classification={"issue_type": "pothole", "issue_type_confidence": 0.2, "severity": 3},
        citizen_phone="+911234567890",
    )
    assert res.verified is False
    assert res.routing_recommendation == "human_review"
    assert res.needs_human_review is True
    assert res.should_reject is False


def test_verification_result_to_dict():
    flags = [
        VerificationFlag(flag_type="spam", severity="warning", message="spam detected", score_impact=0.3),
    ]
    result = VerificationResult(
        verified=True,
        confidence_score=0.7,
        verified_category="pothole",
        verified_severity=3,
        routing_recommendation="auto_route",
        duplicate_cluster_id=None,
        flags=flags,
        classification_details={},
    )
    d = result.to_dict()
    assert d["verified"] is True
    assert d["confidence_score"] == 0.7
    assert d["routing_recommendation"] == "auto_route"
    assert len(d["flags"]) == 1
    assert d["flags"][0]["type"] == "spam"


async def test_full_pipeline_without_optional_params():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar.return_value = 0
    db.execute.return_value = result

    res = await pipeline.verify(
        db=db,
        lat=20.0,
        lon=80.0,
        issue_type="pothole",
        severity=3,
        description=None,
        photo_url=None,
        photo_size_bytes=None,
        ai_classification=None,
        citizen_phone=None,
    )
    assert res.verified is True
    assert res.routing_recommendation == "auto_route"


async def test_full_pipeline_with_duplicate():
    pipeline = AIVerificationPipeline()
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar.return_value = 0
    db.execute.return_value = result

    res = await pipeline.verify(
        db=db,
        lat=20.0,
        lon=80.0,
        issue_type="pothole",
        severity=3,
        description="normal description",
        photo_url=None,
        photo_size_bytes=None,
        duplicate_of_uuid="12345678-1234-5678-1234-567812345678",
    )
    assert res.duplicate_cluster_id == "12345678-1234-5678-1234-567812345678"
    dup_flags = [f for f in res.flags if f.flag_type == "duplicate"]
    assert len(dup_flags) == 1
    assert dup_flags[0].score_impact == 0.0
