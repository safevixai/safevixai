# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

import pytest

from agent.safety_checker import SafetyChecker
from providers.router import detect_lang
from rag.embeddings import hash_embedding


class TestSafetyCheckerProperties:
    def test_safety_checker_always_returns_decision(self):
        checker = SafetyChecker()

        test_messages = [
            "",
            "Hello world",
            "x" * 10000,
            "सड़क सुरक्षा",
            "\x00\x01\x02\x03",
        ]

        for message in test_messages:
            decision = checker.evaluate(message)
            assert hasattr(decision, 'blocked')
            assert isinstance(decision.blocked, bool)

    def test_safety_checker_never_raises(self):
        checker = SafetyChecker()

        test_messages = [
            "",
            "Hello world",
            "x" * 10000,
            "\x00\x01\x02\x03",
        ]

        for message in test_messages:
            try:
                checker.evaluate(message)
            except Exception:
                pytest.fail("SafetyChecker raised an exception")


class TestLanguageDetectionProperties:
    def test_english_text_never_detected_as_indian(self):
        test_texts = [
            "Hello world",
            "Road safety is important",
            "What is the fine for speeding",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        ]

        for text in test_texts:
            result = detect_lang(text)
            assert result is None


class TestEmbeddingProperties:
    def test_hash_embedding_always_returns_vector(self):
        test_texts = [
            "Hello world",
            "सड़क सुरक्षा",
            "x" * 1000,
        ]

        for text in test_texts:
            vector = hash_embedding(text, dimensions=384)

            assert len(vector) == 384
            assert all(isinstance(v, float) for v in vector)

    def test_hash_embedding_deterministic(self):
        test_texts = [
            "Hello world",
            "सड़क सुरक्षा",
            "Test message",
        ]

        for text in test_texts:
            vec1 = hash_embedding(text, dimensions=384)
            vec2 = hash_embedding(text, dimensions=384)

            assert vec1 == vec2
