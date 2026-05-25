"""Open FDA Drug Info Tool — FREE, no API key.

Provides medication information for the first-aid chatbot context.
Returns indications, warnings, dosage, and contraindications.

Endpoint: https://api.fda.gov/drug/label.json
"""

from __future__ import annotations

import asyncio
import json
import logging

import httpx

logger = logging.getLogger(__name__)


class DrugInfoTool:
    """Look up drug/medication information from Open FDA."""

    BASE_URL = "https://api.fda.gov/drug/label.json"

    def __init__(self, timeout: float = 10.0) -> None:
        self._client = httpx.AsyncClient(timeout=timeout)

    async def lookup(self, drug_name: str) -> dict | None:
        """Look up a drug by name. Returns indications, warnings, dosage with robust retries.

        Args:
            drug_name: The drug or medication name (e.g. 'paracetamol', 'ibuprofen')

        Returns:
            Dict with keys: drug_name, indications, warnings, dosage, contraindications
            or None on failure.
        """
        if not drug_name or not drug_name.strip():
            return None

        for attempt in range(3):
            try:
                response = await self._client.get(
                    self.BASE_URL,
                    params={
                        "search": drug_name.strip(),
                        "limit": 1,
                    },
                )
                response.raise_for_status()
                data = response.json()

                results = data.get("results", [])
                if not results:
                    return None

                label = results[0]

                return {
                    "drug_name": drug_name.strip(),
                    "indications": _extract_first(label, "indications_and_usage"),
                    "warnings": _extract_first(label, "warnings"),
                    "dosage": _extract_first(label, "dosage_and_administration"),
                    "contraindications": _extract_first(label, "contraindications"),
                    "active_ingredient": _extract_first(label, "active_ingredient"),
                    "source": "openfda",
                }
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code not in (429, 500, 502, 503, 504):
                    break
                logger.warning("OpenFDA drug lookup failed (attempt %d/3) with status %d: %s", attempt + 1, exc.response.status_code, exc)
                if attempt < 2:
                    await asyncio.sleep(0.5 * (2 ** attempt))
            except (httpx.RequestError, json.JSONDecodeError) as exc:
                logger.warning("OpenFDA drug lookup failed (attempt %d/3): %s", attempt + 1, exc)
                if attempt < 2:
                    await asyncio.sleep(0.5 * (2 ** attempt))
        return None

    async def aclose(self) -> None:
        await self._client.aclose()


def _extract_first(label: dict, key: str) -> str:
    """Extract the first item from an FDA label array field."""
    values = label.get(key, [])
    if values and isinstance(values, list):
        text = values[0]
        # Truncate extremely long entries
        if len(text) > 1000:
            return text[:1000] + "..."
        return text
    return ""

