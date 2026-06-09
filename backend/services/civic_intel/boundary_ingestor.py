"""Boundary ingestor — fetches admin boundary GeoJSON from Datameet / India Geodata."""

from __future__ import annotations

import logging
from typing import Any

from geoalchemy2 import WKTElement
from shapely.geometry import shape
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from models.admin_boundary import AdminBoundary
from services.civic_intel.base_ingestor import BaseIngestor

logger = logging.getLogger(__name__)

# GeoJSON sources — pan-India coverage
BOUNDARY_SOURCES = {
    'india_geodata_states': {
        'url_template': '{base}/states.geojson',
        'level': 'state',
        'source': 'india_geodata',
    },
    'india_geodata_districts': {
        'url_template': '{base}/districts.geojson',
        'level': 'district',
        'source': 'india_geodata',
    },
    'datameet_states': {
        'url_template': '{base}/States/Admin2.geojson',
        'level': 'state',
        'source': 'datameet',
    },
    'datameet_districts': {
        'url_template': '{base}/Districts/Census_2011/2011_Dist.geojson',
        'level': 'district',
        'source': 'datameet',
    },
}

# Indian state name → code mapping
STATE_NAME_TO_CODE: dict[str, str] = {
    'andhra pradesh': 'AP', 'arunachal pradesh': 'AR', 'assam': 'AS',
    'bihar': 'BR', 'chhattisgarh': 'CG', 'goa': 'GA', 'gujarat': 'GJ',
    'haryana': 'HR', 'himachal pradesh': 'HP', 'jharkhand': 'JH',
    'karnataka': 'KA', 'kerala': 'KL', 'madhya pradesh': 'MP',
    'maharashtra': 'MH', 'manipur': 'MN', 'meghalaya': 'ML',
    'mizoram': 'MZ', 'nagaland': 'NL', 'odisha': 'OD', 'punjab': 'PB',
    'rajasthan': 'RJ', 'sikkim': 'SK', 'tamil nadu': 'TN',
    'telangana': 'TS', 'tripura': 'TR', 'uttar pradesh': 'UP',
    'uttarakhand': 'UK', 'west bengal': 'WB',
    'andaman and nicobar islands': 'AN', 'chandigarh': 'CH',
    'dadra and nagar haveli and daman and diu': 'DD',
    'delhi': 'DL', 'jammu and kashmir': 'JK', 'ladakh': 'LA',
    'lakshadweep': 'LD', 'puducherry': 'PY',
}


class BoundaryIngestor(BaseIngestor):
    """Downloads Datameet / India Geodata GeoJSON boundaries and loads into PostGIS."""

    @property
    def name(self) -> str:
        return 'boundaries'

    async def fetch(self) -> list[dict[str, Any]]:
        """Fetch GeoJSON boundary files from GitHub."""
        settings = get_settings()
        all_features: list[dict[str, Any]] = []

        for source_key, cfg in BOUNDARY_SOURCES.items():
            base = (
                settings.india_geodata_base
                if cfg['source'] == 'india_geodata'
                else settings.datameet_github_base
            )
            url = cfg['url_template'].format(base=base)

            try:
                resp = await self._fetch_with_retry(url)
                geojson = resp.json()
                features = geojson.get('features', [])
                for f in features:
                    f['_meta'] = {
                        'level': cfg['level'],
                        'source': cfg['source'],
                        'source_key': source_key,
                    }
                all_features.extend(features)
                logger.info('[Boundaries] Fetched %d features from %s', len(features), source_key)
            except Exception as exc:
                logger.warning('[Boundaries] Failed to fetch %s: %s', source_key, exc)

        return all_features

    async def transform(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Convert GeoJSON features to table-ready dicts with WKT geometry."""
        records: list[dict[str, Any]] = []
        seen_codes: set[str] = set()

        for feature in raw:
            props = feature.get('properties', {})
            meta = feature.get('_meta', {})
            geom = feature.get('geometry')
            if not geom:
                continue

            # Extract name and code
            name = (
                props.get('NAME_1') or props.get('NAME') or props.get('dtname')
                or props.get('stname') or props.get('name') or 'Unknown'
            )
            code = (
                props.get('ST_CODE') or props.get('censuscode')
                or props.get('dtcode11') or props.get('stcode11')
                or str(hash(name))[:8]
            )

            # Resolve state code
            state_name_raw = (
                props.get('NAME_1') or props.get('stname') or props.get('state_name') or ''
            )
            state_code = STATE_NAME_TO_CODE.get(state_name_raw.lower().strip(), 'XX')

            # Deduplicate
            dedup_key = f"{meta.get('level', '')}:{code}"
            if dedup_key in seen_codes:
                continue
            seen_codes.add(dedup_key)

            # Convert geometry to WKT
            try:
                shapely_geom = shape(geom)
                if shapely_geom.geom_type == 'Polygon':
                    from shapely.geometry import MultiPolygon
                    shapely_geom = MultiPolygon([shapely_geom])
                wkt = shapely_geom.wkt
                centroid = shapely_geom.centroid
                area_sqkm = shapely_geom.area * 12321  # rough deg² → km² at India lat
            except Exception:
                continue

            records.append({
                'level': meta.get('level', 'district'),
                'code': str(code),
                'name': name,
                'state_code': state_code,
                'parent_code': props.get('ST_CODE') if meta.get('level') == 'district' else None,
                'boundary': WKTElement(wkt, srid=4326),
                'area_sqkm': round(area_sqkm, 2),
                'centroid_lat': round(centroid.y, 6),
                'centroid_lon': round(centroid.x, 6),
                'source': meta.get('source', 'unknown'),
                'source_version': meta.get('source_key'),
                'properties_json': {k: v for k, v in props.items() if isinstance(v, (str, int, float, bool))},
            })

        return records

    async def load(
        self, db: AsyncSession, records: list[dict[str, Any]],
    ) -> tuple[int, int, int]:
        """Insert admin boundaries — skip duplicates by (level, code)."""
        inserted, updated, skipped = 0, 0, 0

        for record in records:
            try:
                stmt = pg_insert(AdminBoundary).values(**record)
                stmt = stmt.on_conflict_do_nothing()
                result = await db.execute(stmt)
                if result.rowcount > 0:
                    inserted += 1
                else:
                    skipped += 1
            except Exception as exc:
                logger.debug('[Boundaries] Skip: %s', exc)
                skipped += 1

        return inserted, updated, skipped
