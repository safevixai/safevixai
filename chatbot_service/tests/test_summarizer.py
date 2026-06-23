# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from memory.summarizer import ConversationSummarizer


class TestConversationSummarizer:
    def test_init_defaults(self):
        s = ConversationSummarizer()
        assert s._threshold == 8

    def test_init_custom(self):
        s = ConversationSummarizer(threshold=4)
        assert s._threshold == 4

    def test_should_not_summarize_empty(self):
        s = ConversationSummarizer()
        assert not s.should_summarize([])

    def test_should_not_summarize_few(self):
        s = ConversationSummarizer(threshold=4)
        assert not s.should_summarize([{"role": "user"}, {"role": "assistant"}])

    def test_should_summarize_at_threshold(self):
        s = ConversationSummarizer(threshold=2)
        assert s.should_summarize([{"role": "user"}, {"role": "assistant"}])

    def test_summarize_empty(self):
        s = ConversationSummarizer()
        result = s.summarize([])
        assert result["turn_count"] == 0
        assert result["summary"] == ""

    def test_summarize_basic(self):
        s = ConversationSummarizer()
        history = [
            {"role": "user", "content": "What is the fine for speeding?", "metadata": {"intent": "challan"}},
            {"role": "assistant", "content": "The fine for speeding is Rs. 1000.", "metadata": {"intent": "challan"}},
            {"role": "user", "content": "What about drunk driving?", "metadata": {"intent": "challan"}},
        ]
        result = s.summarize(history)
        assert result["turn_count"] == 3
        assert "Intents" in result["summary"]
        assert "challan" in result["intents"]
        assert result["user_message_count"] == 2
        assert result["assistant_message_count"] == 1

    def test_summarize_extracts_keywords(self):
        s = ConversationSummarizer()
        history = [
            {"role": "user", "content": "There was an accident on the highway, call ambulance", "metadata": {"intent": "emergency"}},
            {"role": "assistant", "content": "Call 112 immediately.", "metadata": {"intent": "emergency"}},
        ]
        result = s.summarize(history)
        topics = result["topics"]
        assert "emergency" in topics or "accident" in topics or "ambulance" in topics

    def test_summarize_without_metadata(self):
        s = ConversationSummarizer()
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
        ]
        result = s.summarize(history)
        assert result["turn_count"] == 2
        assert result["intents"] == []

    def test_summarize_empty_content(self):
        s = ConversationSummarizer()
        history = [
            {"role": "user", "content": ""},
            {"role": "assistant", "content": None},
        ]
        result = s.summarize(history)
        assert result["turn_count"] == 2

    def test_get_summary_for_history_below_threshold(self):
        s = ConversationSummarizer(threshold=10)
        history = [{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello"}]
        result, summary = s.get_summary_for_history(history)
        assert len(result) == 2
        assert summary is None

    def test_get_summary_for_history_above_threshold(self):
        s = ConversationSummarizer(threshold=3)
        history = [
            {"role": "user", "content": "A", "metadata": {"intent": "general"}},
            {"role": "assistant", "content": "B", "metadata": {"intent": "general"}},
            {"role": "user", "content": "C", "metadata": {"intent": "general"}},
            {"role": "assistant", "content": "D", "metadata": {"intent": "general"}},
        ]
        result, summary = s.get_summary_for_history(history)
        assert summary is not None
        assert result[0]["role"] == "system"
        assert "[Conversation summary:" in result[0]["content"]

    def test_extract_topics_emergency(self):
        topics = ConversationSummarizer._extract_topics(["Call ambulance immediately"])
        assert "ambulance" in topics

    def test_extract_topics_challan(self):
        topics = ConversationSummarizer._extract_topics(["What is the fine for helmet?"])
        assert "fine" in topics or "helmet" in topics

    def test_extract_topics_no_match(self):
        topics = ConversationSummarizer._extract_topics(["Hello, how are you?"])
        assert len(topics) == 0

    def test_extract_topics_multiple_matches(self):
        topics = ConversationSummarizer._extract_topics([
            "There was an accident",
            "Call police and ambulance",
        ])
        assert "accident" in topics
        assert "police" in topics or "ambulance" in topics
