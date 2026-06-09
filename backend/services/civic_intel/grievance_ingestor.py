"""Grievance ingestor — pan-India CPGRAMS + all state PGRS portals via plugin architecture."""

from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from models.grievance import Grievance
from services.civic_intel.base_ingestor import BaseIngestor

logger = logging.getLogger(__name__)

# Built-in grievance portal registry — adding ANY state = one entry
DEFAULT_GRIEVANCE_PORTALS: dict[str, dict[str, Any]] = {
    'cpgrams': {
        'url': 'https://pgportal.gov.in',
        'scope': 'national',
        'method': 'scrape',
        'description': 'Central Public Grievance Redress & Monitoring System',
    },
    'tn_pgrs': {
        'url': 'https://tnpgrs.tn.gov.in',
        'scope': 'TN',
        'method': 'scrape',
        'description': 'Tamil Nadu Public Grievance Redressal System',
    },
    'ap_pgrs': {
        'url': 'https://pgrs.ap.gov.in',
        'scope': 'AP',
        'method': 'scrape',
        'description': 'Andhra Pradesh CM Grievance Portal',
    },
    'meekosam': {
        'url': 'https://meekosam.ap.gov.in',
        'scope': 'AP',
        'method': 'scrape',
        'description': 'AP Meekosam citizen complaint tracker',
    },
    'puramithra': {
        'url': 'https://cdma.ap.gov.in',
        'scope': 'AP',
        'method': 'scrape',
        'description': 'AP Municipal complaints (roads, garbage, streetlights)',
    },
    'ka_cm_helpline': {
        'url': 'https://cmhelpline.karnataka.gov.in',
        'scope': 'KA',
        'method': 'scrape',
        'description': 'Karnataka CM Helpline',
    },
    'mh_samadhan': {
        'url': 'https://samadhan.mhada.gov.in',
        'scope': 'MH',
        'method': 'scrape',
        'description': 'Maharashtra Samadhan grievance portal',
    },
    'up_jansunwai': {
        'url': 'https://jansunwai.up.nic.in',
        'scope': 'UP',
        'method': 'scrape',
        'description': 'Uttar Pradesh Jansunwai CM Helpline',
    },
}

# Multilingual road/infra keywords for grievance categorization
# Covers: English, Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Malayalam
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    'road_damage': [
        'pothole', 'road damage', 'broken road', 'road repair', 'unfinished road',
        'गड्ढा', 'सड़क टूटी', 'सड़क मरम्मत', 'रोड डैमेज',
        'குழி', 'சாலை சேதம்', 'சாலை பழுது',
        'గుంత', 'రోడ్డు పాడైంది', 'రోడ్డు మరమ్మతు',
        'ಗುಂಡಿ', 'ರಸ್ತೆ ಹಾನಿ',
        'खड्डा', 'रस्ता तुटलेला',
        'গর্ত', 'রাস্তা নষ্ট',
        'കുഴി', 'റോഡ് കേടായി',
    ],
    'traffic': [
        'traffic signal', 'signal malfunction', 'encroachment', 'illegal parking',
        'ट्रैफिक सिग्नल', 'अतिक्रमण', 'अवैध पार्किंग',
        'சிக்னல் பழுது', 'ஆக்கிரமிப்பு',
        'ట్రాఫిక్ సిగ్నల్', 'ఆక్రమణ',
        'ಸಿಗ್ನಲ್ ಕೆಟ್ಟಿದೆ', 'ಅತಿಕ್ರಮಣ',
    ],
    'streetlight': [
        'streetlight', 'street light', 'lamp not working', 'light repair', 'dark road',
        'स्ट्रीट लाइट', 'बत्ती बंद', 'अंधेरा',
        'தெரு விளக்கு', 'விளக்கு பழுது',
        'వీధి దీపం', 'లైటు పాడైంది',
        'ಬೀದಿ ದೀಪ', 'ಲೈಟ್ ಕೆಟ್ಟಿದೆ',
    ],
    'drainage': [
        'drain', 'flooding', 'waterlogging', 'blocked drain', 'stormwater',
        'नाला', 'जल भराव', 'बाढ़', 'नाली बंद',
        'வடிகால்', 'வெள்ளம்', 'நீர் தேங்கியுள்ளது',
        'మురుగు', 'వరద', 'నీరు నిల్వ',
        'ಚರಂಡಿ', 'ಮಳೆನೀರು ಸಂಗ್ರಹ',
    ],
}

# State scope → state_code mapping
SCOPE_TO_STATE_CODE: dict[str, str] = {
    'TN': 'TN', 'AP': 'AP', 'KA': 'KA', 'MH': 'MH', 'UP': 'UP',
    'DL': 'DL', 'WB': 'WB', 'GJ': 'GJ', 'RJ': 'RJ', 'TS': 'TS',
    'national': None,
}


class GrievanceIngestor(BaseIngestor):
    """Enterprise pan-India grievance ingestor — CPGRAMS + all state PGRS portals.

    Plugin architecture: adding ANY state portal = one config entry.
    Multilingual keyword matching: 8 Indian languages.
    """

    @property
    def name(self) -> str:
        return 'grievance'

    def _get_portals(self) -> dict[str, dict[str, Any]]:
        """Merge built-in defaults with env var overrides."""
        settings = get_settings()
        portals = dict(DEFAULT_GRIEVANCE_PORTALS)
        try:
            overrides = json.loads(settings.grievance_portals_env)
            if overrides:
                portals.update(overrides)
        except (json.JSONDecodeError, AttributeError):
            pass
        return portals

    async def fetch(self) -> list[dict[str, Any]]:
        """Fetch grievances from all configured portals."""
        portals = self._get_portals()
        all_grievances: list[dict[str, Any]] = []

        for portal_key, config in portals.items():
            try:
                grievances = await self._fetch_portal(portal_key, config)
                all_grievances.extend(grievances)
                logger.info('[Grievance] %s: fetched %d records', portal_key, len(grievances))
            except Exception as exc:
                logger.warning('[Grievance] %s failed (graceful skip): %s', portal_key, exc)

        return all_grievances

    async def _fetch_portal(
        self, portal_key: str, config: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Fetch grievances from a single portal.

        Currently implements web scraping pattern.
        When API keys become available, add 'api' method support.
        """
        url = config['url']
        method = config.get('method', 'scrape')
        scope = config.get('scope', 'national')

        records: list[dict[str, Any]] = []

        if method == 'api':
            # API-based fetch (when CPGRAMS/state API keys are available)
            settings = get_settings()
            api_key = settings.cpgrams_api_key if portal_key == 'cpgrams' else None
            if api_key:
                try:
                    resp = await self._fetch_with_retry(
                        f'{url}/api/grievances',
                        params={'category': 'roads,traffic,streetlight,drainage', 'limit': 500},
                    )
                    data = resp.json()
                    items = data.get('grievances', data.get('data', []))
                    for item in items:
                        records.append({
                            'source': portal_key,
                            'grievance_ref': item.get('registration_number') or item.get('id', ''),
                            'description': item.get('description', ''),
                            'complainant_district': item.get('district'),
                            'state_code': SCOPE_TO_STATE_CODE.get(scope),
                            'status': item.get('status', 'pending'),
                            'filed_at': item.get('filed_date') or item.get('created_at'),
                            'ministry': item.get('ministry'),
                        })
                except Exception as exc:
                    logger.warning('[Grievance:%s] API fetch failed: %s', portal_key, exc)

        elif method == 'scrape':
            # Web scraping fallback — fetch public-facing data
            try:
                resp = await self._fetch_with_retry(url, max_retries=2)
                # Extract grievance data from HTML
                # Note: Real implementation would use BeautifulSoup or similar
                # For now, mark as placeholder for portal-specific parsers
                logger.info('[Grievance:%s] Scrape endpoint reached (parser TBD)', portal_key)
            except Exception as exc:
                logger.debug('[Grievance:%s] Scrape failed: %s', portal_key, exc)

        return records

    def _categorize(self, text: str) -> tuple[str, str | None]:
        """Categorize grievance by multilingual keyword matching."""
        text_lower = text.lower()
        for category, keywords in CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    return category, keyword
        return 'other', None

    async def transform(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Categorize grievances and deduplicate by grievance_ref."""
        seen: set[str] = set()
        clean: list[dict[str, Any]] = []

        for r in raw:
            ref = r.get('grievance_ref', '')
            if not ref or ref in seen:
                continue
            seen.add(ref)

            category, subcategory = self._categorize(r.get('description', ''))
            r['category'] = category
            r['subcategory'] = subcategory
            clean.append(r)

        return clean

    async def load(
        self, db: AsyncSession, records: list[dict[str, Any]],
    ) -> tuple[int, int, int]:
        """Upsert grievances by grievance_ref."""
        inserted, updated, skipped = 0, 0, 0

        for record in records:
            try:
                stmt = pg_insert(Grievance).values(**record)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['grievance_ref'],
                    set_={
                        'status': stmt.excluded.status,
                        'resolved_at': stmt.excluded.resolved_at,
                    },
                )
                result = await db.execute(stmt)
                if result.rowcount > 0:
                    inserted += 1
                else:
                    updated += 1
            except Exception as exc:
                logger.debug('[Grievance] Skip %s: %s', record.get('grievance_ref'), exc)
                skipped += 1

        return inserted, updated, skipped
