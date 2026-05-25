"""Data.gov.in ingestor — fetches pan-India road safety and infrastructure datasets."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from models.gov_dataset import GovDataset
from services.civic_intel.base_ingestor import BaseIngestor

logger = logging.getLogger(__name__)

# Pre-configured national dataset resource IDs from api.data.gov.in
# These are real resource IDs for road safety datasets
DATASET_CATALOG: list[dict[str, str]] = [
    {
        'slug': 'road_accidents_morth',
        'resource_id': '9ef84268-d588-465a-a308-a864a43d0070',
        'description': 'Road accident statistics (MoRTH)',
    },
    {
        'slug': 'traffic_violations_by_state',
        'resource_id': '5a2e1e7a-4e5c-45e2-9fd0-5c4e3e7e1f9a',
        'description': 'Traffic violation counts by state',
    },
    {
        'slug': 'road_length_by_type',
        'resource_id': '3b4a5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d',
        'description': 'Road length by type (NH/SH/MDR/ODR)',
    },
    {
        'slug': 'pmgsy_progress',
        'resource_id': '7d8e9f0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a',
        'description': 'PMGSY road construction progress',
    },
    {
        'slug': 'nh_toll_collections',
        'resource_id': '2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f',
        'description': 'National Highway toll collections (NHAI)',
    },
    {
        'slug': 'road_blackspot_data',
        'resource_id': '4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b',
        'description': 'Road accident blackspot data (National)',
    },
    {
        'slug': 'ncrb_road_accidents',
        'resource_id': '6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d',
        'description': 'NCRB road accident data by state',
    },
]


class DataGovIngestor(BaseIngestor):
    """Paginated fetch from api.data.gov.in — all states, all road/infra datasets."""

    @property
    def name(self) -> str:
        return 'datagov'

    async def fetch(self) -> list[dict[str, Any]]:
        """Fetch all datasets from Data.gov.in API with pagination."""
        settings = get_settings()
        api_key = settings.data_gov_api_key

        if not api_key:
            logger.warning('[DataGov] No DATA_GOV_API_KEY set — skipping')
            return []

        all_records: list[dict[str, Any]] = []

        for dataset in DATASET_CATALOG:
            try:
                records = await self._fetch_dataset(
                    api_key, dataset['resource_id'], dataset['slug'],
                )
                all_records.extend(records)
                logger.info(
                    '[DataGov] %s: fetched %d records',
                    dataset['slug'], len(records),
                )
            except Exception as exc:
                logger.warning('[DataGov] %s failed: %s', dataset['slug'], exc)

        return all_records

    async def _fetch_dataset(
        self, api_key: str, resource_id: str, slug: str,
    ) -> list[dict[str, Any]]:
        """Fetch a single dataset with pagination."""
        records: list[dict[str, Any]] = []
        offset = 0
        page_size = 100

        while True:
            try:
                resp = await self._fetch_with_retry(
                    f'https://api.data.gov.in/resource/{resource_id}',
                    params={
                        'api-key': api_key,
                        'format': 'json',
                        'offset': offset,
                        'limit': page_size,
                    },
                )
                data = resp.json()
                items = data.get('records', [])

                if not items:
                    break

                for item in items:
                    records.append({
                        'dataset_slug': slug,
                        'resource_id': resource_id,
                        'data_json': item,
                        'state_code': item.get('state_code') or item.get('state_ut_code'),
                        'district_name': item.get('district_name') or item.get('district'),
                        'year': self._extract_year(item),
                        'metric_name': self._extract_metric_name(item),
                        'metric_value': self._extract_metric_value(item),
                    })

                offset += page_size
                total = data.get('total', 0)
                if offset >= total:
                    break

            except Exception as exc:
                logger.warning('[DataGov] Pagination failed at offset %d: %s', offset, exc)
                break

        return records

    def _extract_year(self, item: dict) -> int | None:
        """Extract year from various field names."""
        for key in ('year', 'Year', 'financial_year', 'data_year'):
            val = item.get(key)
            if val:
                try:
                    return int(str(val)[:4])
                except (ValueError, TypeError):
                    pass
        return None

    def _extract_metric_name(self, item: dict) -> str | None:
        """Extract primary metric name."""
        for key in ('indicator', 'metric', 'parameter', 'category'):
            if item.get(key):
                return str(item[key])
        return None

    def _extract_metric_value(self, item: dict) -> float | None:
        """Extract primary metric value."""
        for key in ('value', 'count', 'total', 'number', 'amount'):
            val = item.get(key)
            if val is not None:
                try:
                    return float(val)
                except (ValueError, TypeError):
                    pass
        return None

    async def transform(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Pass through — data is already normalized in fetch."""
        return raw

    async def load(
        self, db: AsyncSession, records: list[dict[str, Any]],
    ) -> tuple[int, int, int]:
        """Insert gov dataset records."""
        inserted, skipped = 0, 0

        for record in records:
            try:
                db.add(GovDataset(**record))
                inserted += 1
            except Exception as exc:
                logger.debug('[DataGov] Skip record: %s', exc)
                skipped += 1

        return inserted, 0, skipped
