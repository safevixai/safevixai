# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

import re
from typing import Any

CHALLAN_CODE_PATTERN = re.compile(r'\b(?:179|181|183|185|194B|194D)\b', re.IGNORECASE)
INTENT_CLASSES = (
    'emergency',
    'first_aid',
    'challan',
    'legal',
    'road_issue',
    'road_weather',
    'safe_route',
    'road_infrastructure',
    'general',
)

_FOLLOW_UP_INDICATORS = (
    'what about', 'how about', 'and', 'also', 'what else', 'tell me more',
    'elaborate', 'explain more', 'give me more', 'more details',
    'what does that mean', 'can you explain', 'for example',
    'like what', 'such as', 'specifically', 'regarding',
)

_AMBIGUOUS_SHORT_MESSAGE_THRESHOLD = 5


def _has_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term in text for term in terms)


class IntentDetector:
    def detect(self, message: str) -> str:
        text = message.lower()
        if _has_any(text, ('accident', 'ambulance', 'hospital', 'police', 'emergency', 'sos', 'crash', 'injured')):
            return 'emergency'
        if _has_any(text, ('bleeding', 'burn', 'fracture', 'cpr', 'choking', 'first aid', 'wound', 'unconscious')):
            return 'first_aid'
        if CHALLAN_CODE_PATTERN.search(message) or any(
            term in text for term in ('challan', 'fine', 'helmet', 'seatbelt', 'drunk driving', 'licence', 'license')
        ):
            return 'challan'
        if _has_any(text, ('motor vehicles act', 'mv act', 'section', 'legal', 'rights', 'inspection', 'mva')):
            return 'legal'
        if _has_any(text, ('weather', 'rain', 'flood', 'fog', 'visibility', 'heatwave', 'storm', 'monsoon')):
            return 'road_weather'
        if _has_any(text, ('route', 'routing', 'navigate', 'navigation', 'directions', 'safest way', 'safe route')):
            return 'safe_route'
        if _has_any(text, ('road authority', 'pwd', 'nhai', 'pmgsy', 'contractor', 'maintenance owner', 'who maintains')):
            return 'road_infrastructure'
        if _has_any(text, ('pothole', 'road issue', 'road hazard', 'debris', 'bad road', 'report road', 'damaged road')):
            return 'road_issue'
        return 'general'

    def refine_intent(
        self,
        initial_intent: str,
        message: str,
        history: list[dict[str, Any]],
    ) -> str:
        if initial_intent != 'general':
            return initial_intent

        if not history:
            return initial_intent

        text = message.lower().strip()
        is_short = len(text.split()) <= _AMBIGUOUS_SHORT_MESSAGE_THRESHOLD
        is_follow_up = _has_any(text, _FOLLOW_UP_INDICATORS)

        if not is_short and not is_follow_up:
            return initial_intent

        previous_intents = []
        for msg in reversed(history):
            meta = msg.get("metadata")
            if isinstance(meta, dict):
                intent = meta.get("intent")
                if intent and intent != 'general' and intent != 'blocked':
                    previous_intents.append(intent)

        if not previous_intents:
            return initial_intent

        most_recent_intent = previous_intents[0]
        logger = __import__('logging').getLogger("safevixai.chatbot.intent")
        logger.info(
            "Refined intent '%s' -> '%s' from history (msg='%s', short=%s, follow_up=%s)",
            initial_intent, most_recent_intent, message[:50], is_short, is_follow_up,
        )
        return most_recent_intent
