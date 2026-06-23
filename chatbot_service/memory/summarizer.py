# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("safevixai.chatbot.summarizer")

_SUMMARIZATION_THRESHOLD = 8


class ConversationSummarizer:
    def __init__(self, threshold: int = _SUMMARIZATION_THRESHOLD):
        self._threshold = threshold

    def should_summarize(self, history: list[dict[str, Any]]) -> bool:
        return len(history) >= self._threshold

    def summarize(self, history: list[dict[str, Any]]) -> dict[str, Any]:
        if not history:
            return {"summary": "", "turn_count": 0}

        topics: set[str] = set()
        intents: set[str] = set()
        user_messages: list[str] = []
        assistant_responses: list[str] = []

        for msg in history:
            role = msg.get("role", "")
            content = msg.get("content", "")
            meta = msg.get("metadata") or {}
            if isinstance(content, str):
                if role == "user":
                    user_messages.append(content[:200])
                elif role == "assistant":
                    assistant_responses.append(content[:200])
            intent = meta.get("intent") if isinstance(meta, dict) else None
            if intent:
                intents.add(intent)

        topics = self._extract_topics(user_messages + assistant_responses)

        summary_parts: list[str] = []
        if intents:
            summary_parts.append(f"Topics discussed: {', '.join(sorted(topics))}")
            summary_parts.append(f"Intents: {', '.join(sorted(intents))}")
        summary_parts.append(f"Conversation span: {len(history)} messages")

        user_count = len(user_messages)
        assistant_count = len(assistant_responses)
        summary_parts.append(f"User messages: {user_count}, Assistant responses: {assistant_count}")

        return {
            "summary": " | ".join(summary_parts),
            "turn_count": len(history),
            "topics": sorted(topics),
            "intents": sorted(intents),
            "user_message_count": user_count,
            "assistant_message_count": assistant_count,
        }

    def get_summary_for_history(
        self,
        history: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        if not self.should_summarize(history):
            return history, None

        messages_to_keep = history[-(self._threshold // 2):]
        messages_to_summarize = history[:-(self._threshold // 2)]

        summary = self.summarize(messages_to_summarize)
        logger.info(
            "Summarized %d messages into: %s",
            len(messages_to_summarize),
            summary["summary"][:100],
        )

        summary_message = {
            "role": "system",
            "content": f"[Conversation summary: {summary['summary']}]",
            "metadata": {"type": "summary", "original_count": len(messages_to_summarize)},
        }

        return [summary_message] + messages_to_keep, summary

    @staticmethod
    def _extract_topics(texts: list[str]) -> set[str]:
        keywords = {
            "emergency", "accident", "ambulance", "hospital", "police", "sos",
            "challan", "fine", "helmet", "seatbelt", "speeding", "traffic",
            "first aid", "bleeding", "burn", "fracture", "cpr",
            "legal", "section", "motor vehicles act", "rights",
            "weather", "rain", "flood", "fog", "visibility",
            "route", "navigation", "safe route", "directions",
            "pothole", "road issue", "road hazard", "infrastructure",
            "drug", "medicine", "medical", "health",
            "report", "submit", "complaint",
        }
        found: set[str] = set()
        for text in texts:
            lower = text.lower()
            for kw in keywords:
                if kw in lower and kw not in found:
                    found.add(kw)
        return found
