# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

from services.fraud_detector import FraudDetector


class TestIsSpamText:
    def test_excessive_punctuation(self):
        result, reason = FraudDetector.is_spam_text("this is bad!!!!!")
        assert result is True
        assert "punctuation" in reason

    def test_repeated_characters(self):
        result, reason = FraudDetector.is_spam_text("nooooooooooo")
        assert result is True
        assert "repeated" in reason

    def test_all_caps(self):
        result, reason = FraudDetector.is_spam_text("THIS IS AN ANGRY COMPLAINT")
        assert result is True
        assert "ALL CAPS" in reason

    def test_all_caps_short_not_spam(self):
        result, reason = FraudDetector.is_spam_text("OK")
        assert result is False
        assert reason is None

    def test_spam_keywords(self):
        result, reason = FraudDetector.is_spam_text("buy now click here for discount")
        assert result is True
        assert "spam keywords" in reason

    def test_spam_keyword_sell(self):
        result, reason = FraudDetector.is_spam_text("I want to sell something")
        assert result is True

    def test_normal_text(self):
        result, reason = FraudDetector.is_spam_text(
            "There is a large pothole on MG Road near the signal"
        )
        assert result is False
        assert reason is None

    def test_none_text(self):
        result, reason = FraudDetector.is_spam_text(None)
        assert result is False
        assert reason is None

    def test_empty_text(self):
        result, reason = FraudDetector.is_spam_text("")
        assert result is False
        assert reason is None


class TestVerifyRateLimit:
    async def test_no_phone(self):
        allowed, count = await FraudDetector.verify_rate_limit(
            MagicMock(), citizen_phone=""
        )
        assert allowed is True
        assert count == 0

    async def test_within_limit(self):
        db = MagicMock()
        db.execute = AsyncMock()
        result = MagicMock()
        result.scalar.return_value = 3
        db.execute.return_value = result
        allowed, count = await FraudDetector.verify_rate_limit(
            db, citizen_phone="+911234567890", max_per_hour=5
        )
        assert allowed is True
        assert count == 3

    async def test_exceeded_limit(self):
        db = MagicMock()
        db.execute = AsyncMock()
        result = MagicMock()
        result.scalar.return_value = 7
        db.execute.return_value = result
        allowed, count = await FraudDetector.verify_rate_limit(
            db, citizen_phone="+911234567890", max_per_hour=5
        )
        assert allowed is False
        assert count == 7

    async def test_at_boundary_exact_limit(self):
        db = MagicMock()
        db.execute = AsyncMock()
        result = MagicMock()
        result.scalar.return_value = 5
        db.execute.return_value = result
        allowed, count = await FraudDetector.verify_rate_limit(
            db, citizen_phone="+911234567890", max_per_hour=5
        )
        assert allowed is False
        assert count == 5


class TestDetectBotSignature:
    def test_missing_user_agent(self):
        is_bot, reason = FraudDetector.detect_bot_signature(
            user_agent=None, submission_time_ms=None
        )
        assert is_bot is True
        assert "Missing User-Agent" in reason

    def test_python_requests(self):
        is_bot, reason = FraudDetector.detect_bot_signature(
            user_agent="python-requests/2.28.0", submission_time_ms=None
        )
        assert is_bot is True
        assert "python-requests" in reason

    def test_curl(self):
        is_bot, reason = FraudDetector.detect_bot_signature(
            user_agent="curl/7.68.0", submission_time_ms=200
        )
        assert is_bot is True
        assert "curl" in reason

    def test_sub_second_submission(self):
        is_bot, reason = FraudDetector.detect_bot_signature(
            user_agent="Mozilla/5.0 Chrome/120", submission_time_ms=100
        )
        assert is_bot is True
        assert "Sub-second" in reason

    def test_submission_just_above_threshold(self):
        is_bot, reason = FraudDetector.detect_bot_signature(
            user_agent="Mozilla/5.0 Chrome/120", submission_time_ms=500
        )
        assert is_bot is False
        assert reason is None

    def test_normal_ua(self):
        is_bot, reason = FraudDetector.detect_bot_signature(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
            submission_time_ms=5000,
        )
        assert is_bot is False
        assert reason is None


class TestRedactPii:
    def test_aadhaar(self):
        text = "My aadhaar is 2345 6789 0123"
        redacted = FraudDetector.redact_pii(text)
        assert "[REDACTED AADHAAR]" in redacted
        assert "2345" not in redacted

    def test_pan(self):
        text = "My PAN is ABCDE1234F"
        redacted = FraudDetector.redact_pii(text)
        assert "[REDACTED PAN]" in redacted

    def test_phone(self):
        text = "Call me at 9876543210"
        redacted = FraudDetector.redact_pii(text)
        assert "[REDACTED PHONE]" in redacted

    def test_phone_with_country_code(self):
        text = "Call me at +919876543210"
        redacted = FraudDetector.redact_pii(text)
        assert "[REDACTED" in redacted

    def test_email(self):
        text = "Email me at user@example.com"
        redacted = FraudDetector.redact_pii(text)
        assert "[REDACTED EMAIL]" in redacted

    def test_multiple_pii(self):
        text = "Aadhaar: 2345 6789 0123, PAN: ABCDE1234F, Phone: 9876543210, Email: user@example.com"
        redacted = FraudDetector.redact_pii(text)
        assert "[REDACTED AADHAAR]" in redacted
        assert "[REDACTED PAN]" in redacted
        assert "[REDACTED PHONE]" in redacted
        assert "[REDACTED EMAIL]" in redacted

    def test_none_text(self):
        assert FraudDetector.redact_pii(None) is None

    def test_empty_string(self):
        assert FraudDetector.redact_pii("") == ""
