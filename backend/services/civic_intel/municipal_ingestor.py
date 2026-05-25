"""Municipal GIS ingestor — pan-India config-driven ArcGIS REST + GeoServer WFS fetcher."""

from __future__ import annotations

import json
import logging
from typing import Any

from geoalchemy2 import WKTElement
from shapely.geometry import shape
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from models.municipal_feature import MunicipalFeature
from services.civic_intel.base_ingestor import BaseIngestor

logger = logging.getLogger(__name__)

# Built-in pan-India municipal GIS registry — adding a new municipality = one entry
DEFAULT_GIS_REGISTRY: dict[str, dict[str, Any]] = {
    # Maharashtra
    'BMC': {
        'state': 'MH', 'city': 'Mumbai', 'type': 'arcgis',
        'base_url': 'https://gis.mcgm.gov.in/arcgis/rest/services',
        'layers': ['Potholes', 'RoadWorks', 'StormwaterDrains', 'WardBoundaries'],
    },
    'PMC': {
        'state': 'MH', 'city': 'Pune', 'type': 'arcgis',
        'base_url': 'https://gis.punecorporation.org/arcgis/rest/services',
        'layers': ['WardBoundaries', 'RoadNetwork', 'WaterSupply'],
    },
    # Tamil Nadu
    'GCC': {
        'state': 'TN', 'city': 'Chennai', 'type': 'arcgis',
        'base_url': 'https://gis.chennaicorporation.gov.in/server/rest/services',
        'layers': ['RoadComplaints', 'StreetlightFaults', 'SolidWaste', 'WardZones'],
    },
    'TNGIS': {
        'state': 'TN', 'city': None, 'type': 'geoserver',
        'base_url': 'https://tngis.tn.gov.in/geoserver',
        'layers': ['state_highways', 'district_roads', 'flood_zones'],
    },
    # Andhra Pradesh
    'GVMC': {
        'state': 'AP', 'city': 'Visakhapatnam', 'type': 'arcgis',
        'base_url': 'https://gvmc.gov.in/gis/rest/services',
        'layers': ['WardBoundaries', 'RoadNetwork', 'WaterSupply'],
    },
    'APSAC': {
        'state': 'AP', 'city': None, 'type': 'geoserver',
        'base_url': 'https://apsac.ap.gov.in/geoserver',
        'layers': ['district_boundaries', 'nh_sh_network', 'land_use'],
    },
    # Karnataka
    'BBMP': {
        'state': 'KA', 'city': 'Bengaluru', 'type': 'arcgis',
        'base_url': 'https://gis.bbmp.gov.in/arcgis/rest/services',
        'layers': ['WardBoundaries', 'RoadIssues', 'SWD'],
    },
    # Telangana
    'GHMC': {
        'state': 'TS', 'city': 'Hyderabad', 'type': 'arcgis',
        'base_url': 'https://gis.ghmc.gov.in/arcgis/rest/services',
        'layers': ['WardBoundaries', 'RoadNetwork'],
    },
    # West Bengal
    'KMC': {
        'state': 'WB', 'city': 'Kolkata', 'type': 'arcgis',
        'base_url': 'https://gis.kmcgov.in/arcgis/rest/services',
        'layers': ['WardBoundaries'],
    },
    # Delhi
    'NDMC': {
        'state': 'DL', 'city': 'New Delhi', 'type': 'arcgis',
        'base_url': 'https://gis.ndmc.gov.in/arcgis/rest/services',
        'layers': ['RoadInfrastructure'],
    },
}


class MunicipalIngestor(BaseIngestor):
    """Enterprise pan-India municipal GIS ingestor.

    Config-driven registry — adding ANY new municipality is one JSON entry.
    Supports both ArcGIS REST and GeoServer WFS protocols.
    Graceful degradation — unreachable endpoints are skipped, not fatal.
    """

    @property
    def name(self) -> str:
        return 'municipal'

    def _get_registry(self) -> dict[str, dict[str, Any]]:
        """Merge built-in defaults with env var overrides."""
        settings = get_settings()
        registry = dict(DEFAULT_GIS_REGISTRY)
        try:
            overrides = json.loads(settings.municipal_gis_registry_env)
            if overrides:
                registry.update(overrides)
        except (json.JSONDecodeError, AttributeError):
            pass
        return registry

    async def fetch(self) -> list[dict[str, Any]]:
        """Fetch features from all registered municipal GIS endpoints."""
        registry = self._get_registry()
        all_features: list[dict[str, Any]] = []

        for muni_code, config in registry.items():
            gis_type = config.get('type', 'arcgis')
            base_url = config.get('base_url', '')
            layers = config.get('layers', [])

            for layer in layers:
                try:
                    if gis_type == 'arcgis':
                        features = await self._fetch_arcgis(muni_code, base_url, layer)
                    elif gis_type == 'geoserver':
                        features = await self._fetch_geoserver(muni_code, base_url, layer)
                    else:
                        logger.warning('[Municipal] Unknown GIS type for %s: %s', muni_code, gis_type)
                        continue

                    all_features.extend(features)
                    logger.info('[Municipal] %s/%s: %d features', muni_code, layer, len(features))
                except Exception as exc:
                    logger.warning('[Municipal] %s/%s failed (graceful skip): %s', muni_code, layer, exc)

        return all_features

    async def _fetch_arcgis(
        self, muni_code: str, base_url: str, layer: str,
    ) -> list[dict[str, Any]]:
        """Fetch from ArcGIS REST API with pagination."""
        features: list[dict[str, Any]] = []
        offset = 0

        while True:
            url = f'{base_url}/{layer}/FeatureServer/0/query'
            params = {
                'where': '1=1',
                'outFields': '*',
                'f': 'geojson',
                'resultOffset': offset,
                'resultRecordCount': 1000,
            }

            try:
                resp = await self._fetch_with_retry(url, params=params, max_retries=2)
                geojson = resp.json()
                batch = geojson.get('features', [])

                if not batch:
                    break

                for f in batch:
                    f['_muni'] = muni_code
                    f['_layer'] = layer
                features.extend(batch)
                offset += len(batch)

                # Check if there are more records
                if not geojson.get('exceededTransferLimit', False):
                    break
            except Exception:
                break

        return features

    async def _fetch_geoserver(
        self, muni_code: str, base_url: str, layer: str,
    ) -> list[dict[str, Any]]:
        """Fetch from GeoServer WFS with pagination."""
        features: list[dict[str, Any]] = []
        start_index = 0

        while True:
            url = f'{base_url}/wfs'
            params = {
                'service': 'WFS',
                'version': '1.1.0',
                'request': 'GetFeature',
                'typeName': layer,
                'outputFormat': 'application/json',
                'startIndex': start_index,
                'count': 1000,
            }

            try:
                resp = await self._fetch_with_retry(url, params=params, max_retries=2)
                geojson = resp.json()
                batch = geojson.get('features', [])

                if not batch:
                    break

                for f in batch:
                    f['_muni'] = muni_code
                    f['_layer'] = layer
                features.extend(batch)
                start_index += len(batch)

                total = geojson.get('totalFeatures', 0)
                if start_index >= total:
                    break
            except Exception:
                break

        return features

    async def transform(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Convert GeoJSON features to table-ready records."""
        records: list[dict[str, Any]] = []

        for feature in raw:
            geom = feature.get('geometry')
            if not geom:
                continue

            try:
                shapely_geom = shape(geom)
                wkt = shapely_geom.wkt
            except Exception:
                continue

            props = feature.get('properties', {})
            feature_id = str(
                props.get('OBJECTID') or props.get('fid')
                or props.get('id') or hash(wkt)
            )

            records.append({
                'municipality': feature.get('_muni', 'unknown'),
                'layer_name': feature.get('_layer', 'unknown'),
                'feature_id': feature_id,
                'geometry': WKTElement(wkt, srid=4326),
                'attributes_json': {
                    k: v for k, v in props.items()
                    if isinstance(v, (str, int, float, bool)) and not k.startswith('_')
                },
            })

        return records

    async def load(
        self, db: AsyncSession, records: list[dict[str, Any]],
    ) -> tuple[int, int, int]:
        """Insert municipal features."""
        inserted, skipped = 0, 0

        for record in records:
            try:
                db.add(MunicipalFeature(**record))
                inserted += 1
            except Exception as exc:
                logger.debug('[Municipal] Skip: %s', exc)
                skipped += 1

        return inserted, 0, skipped
