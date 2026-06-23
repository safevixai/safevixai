# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""API versioning and deprecation management.

Strategy:
- All current endpoints live under /api/v1/
- When a new version is needed, create /api/v2/
- Deprecated endpoints return sunset headers
- Migration guide in docs/
"""
from datetime import datetime, timedelta

SUNSET_HEADER = "Sunset"
DEPRECATION_HEADER = "Deprecation"

# Track deprecated endpoints with their sunset dates
DEPRECATED_ENDPOINTS: dict[str, datetime] = {}

def mark_deprecated(endpoint: str, sunset_in_days: int = 90):
    """Mark an endpoint as deprecated with a sunset date."""
    DEPRECATED_ENDPOINTS[endpoint] = datetime.utcnow() + timedelta(days=sunset_in_days)

def get_deprecation_headers(endpoint: str) -> dict[str, str]:
    """Get sunset/deprecation headers for an endpoint if deprecated."""
    if endpoint in DEPRECATED_ENDPOINTS:
        sunset = DEPRECATED_ENDPOINTS[endpoint]
        return {
            DEPRECATION_HEADER: f"true; sunset={sunset.isoformat()}",
            SUNSET_HEADER: sunset.isoformat(),
        }
    return {}
