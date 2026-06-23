# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

import pytest

from services.speech_translation import IndicSeamlessService


class FakeSettings:
    def __init__(self):
        self.speech_model_id = "facebook/seamless-m4t-v2"
        self.speech_model_dir = None
        self.speech_default_target_lang = "eng"
        self.speech_device = "cpu"


class TestSpeechStatus:
    def test_status_returns_configured_dict(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        status = service.status()

        assert isinstance(status, dict)
        assert "configured" in status
        assert "dependencies_available" in status
        assert "device" in status
        assert "model_source" in status

    def test_status_device_resolution(self):
        settings = FakeSettings()
        settings.speech_device = "cpu"
        service = IndicSeamlessService(settings)
        status = service.status()

        assert status["device"] == "cpu"

    def test_status_auto_device(self):
        settings = FakeSettings()
        settings.speech_device = "auto"
        service = IndicSeamlessService(settings)
        status = service.status()

        assert status["device"] in ("cpu", "cuda")


class TestSpeechValidation:
    def test_empty_audio_raises_error(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)

        with pytest.raises(ValueError, match="Audio payload is empty"):
            service.translate_audio_bytes(b"")

    def test_dependencies_check(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        status = service.status()

        deps = status["dependencies_available"]
        assert isinstance(deps, bool)


class TestLanguageMapping:
    # Language mapping tests are done in frontend Jest tests
    # (frontend/lib/languages.ts is TypeScript, not importable from Python)
    pass


class TestSpeechStatusPolling:
    def test_model_loaded_initially_false(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        status = service.status()

        assert status["model_loaded"] is False

    def test_model_source_fallback(self):
        settings = FakeSettings()
        settings.speech_model_dir = None
        service = IndicSeamlessService(settings)

        assert service.model_source == "facebook/seamless-m4t-v2"
