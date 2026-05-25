"""Standalone boundary fetcher — downloads GeoJSON from Datameet + India Geodata.

Downloads state and district boundary GeoJSON files from public GitHub repos.
No database needed — outputs to data/civic_intel/boundaries/.

Sources:
  - Datameet Maps: https://github.com/datameet/maps
  - India Maps Data: https://github.com/Subhash9325/GeoJSON-Data-of-Indian-States

Usage:
    python scripts/data/fetch_datameet_boundaries.py
    python scripts/data/fetch_datameet_boundaries.py --states-only
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

try:
    import httpx
except ImportError:
    print('[ERROR] httpx is required. Run: pip install httpx')
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / 'data' / 'civic_intel' / 'boundaries'

# Public GeoJSON sources (no API key needed)
SOURCES = {
    'india_states': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson',
        'filename': 'india_states.geojson',
        'description': 'All Indian state/UT boundaries',
    },
}

# State-level district GeoJSON from Datameet
STATE_DISTRICT_SOURCES = {
    'TN': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/tamil_nadu.geojson',
        'filename': 'tn_districts.geojson',
    },
    'MH': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/maharashtra.geojson',
        'filename': 'mh_districts.geojson',
    },
    'KA': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/karnataka.geojson',
        'filename': 'ka_districts.geojson',
    },
    'AP': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/andhra_pradesh.geojson',
        'filename': 'ap_districts.geojson',
    },
    'KL': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/kerala.geojson',
        'filename': 'kl_districts.geojson',
    },
    'TS': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/telangana.geojson',
        'filename': 'ts_districts.geojson',
    },
    'GJ': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/gujarat.geojson',
        'filename': 'gj_districts.geojson',
    },
    'RJ': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/rajasthan.geojson',
        'filename': 'rj_districts.geojson',
    },
    'DL': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/delhi.geojson',
        'filename': 'dl_districts.geojson',
    },
    'UP': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/uttar_pradesh.geojson',
        'filename': 'up_districts.geojson',
    },
    'WB': {
        'url': 'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/west_bengal.geojson',
        'filename': 'wb_districts.geojson',
    },
}


def download_geojson(client: httpx.Client, url: str, output_path: Path) -> dict | None:
    """Download a GeoJSON file and validate it."""
    try:
        resp = client.get(url, timeout=60, follow_redirects=True)
        resp.raise_for_status()

        # Validate it's valid GeoJSON
        data = resp.json()
        if data.get('type') not in ('FeatureCollection', 'Feature', 'GeometryCollection'):
            print(f'  ⚠ Not valid GeoJSON (type={data.get("type")})')
            return None

        features = data.get('features', [])

        # Save
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f)

        size_kb = output_path.stat().st_size / 1024
        return {'features': len(features), 'size_kb': round(size_kb, 1)}

    except httpx.HTTPStatusError as exc:
        print(f'  ✗ HTTP {exc.response.status_code}: {url}')
        return None
    except Exception as exc:
        print(f'  ✗ Error: {exc}')
        return None


def main():
    parser = argparse.ArgumentParser(description='Fetch GeoJSON boundaries from Datameet')
    parser.add_argument('--states-only', action='store_true', help='Only fetch state outlines')
    args = parser.parse_args()

    print(f'\n╔══════════════════════════════════════════╗')
    print(f'║  SafeVixAI Boundary GeoJSON Fetcher      ║')
    print(f'╚══════════════════════════════════════════╝')
    print(f'  Output: {OUTPUT_DIR}')
    print()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    summary: dict[str, dict] = {}

    with httpx.Client() as client:
        # 1. Download India-wide boundaries
        for key, source in SOURCES.items():
            if args.states_only and key == 'india_districts':
                continue

            print(f'  Downloading {source["description"]}...')
            output_path = OUTPUT_DIR / source['filename']
            result = download_geojson(client, source['url'], output_path)

            if result:
                print(f'  ✓ {source["filename"]}: {result["features"]} features, {result["size_kb"]} KB')
                summary[key] = result
            else:
                print(f'  ✗ {source["filename"]}: FAILED')
                summary[key] = {'error': 'download failed'}

            time.sleep(1)

        # 2. Download state-level district boundaries
        if not args.states_only:
            print(f'\n  Downloading state-level district boundaries...')
            for state_code, source in STATE_DISTRICT_SOURCES.items():
                output_path = OUTPUT_DIR / source['filename']
                result = download_geojson(client, source['url'], output_path)

                if result:
                    print(f'  ✓ {state_code}: {result["features"]} districts, {result["size_kb"]} KB')
                    summary[f'state_{state_code}'] = result
                else:
                    print(f'  ✗ {state_code}: FAILED')
                    summary[f'state_{state_code}'] = {'error': 'download failed'}

                time.sleep(0.5)

    # Save manifest
    manifest_file = OUTPUT_DIR / 'boundaries_manifest.json'
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2)

    # Print summary
    print(f'\n{"═" * 50}')
    print(f'  BOUNDARY DOWNLOAD SUMMARY')
    print(f'{"═" * 50}')
    total_features = 0
    total_kb = 0
    for key, info in summary.items():
        if 'error' not in info:
            total_features += info.get('features', 0)
            total_kb += info.get('size_kb', 0)
            print(f'  ✓ {key:25s}  {info["features"]:>5} features  {info["size_kb"]:>8.1f} KB')
        else:
            print(f'  ✗ {key:25s}  FAILED')

    print(f'{"─" * 50}')
    print(f'  {"TOTAL":25s}  {total_features:>5} features  {total_kb:>8.1f} KB')
    print(f'  Output: {OUTPUT_DIR}')
    print()


if __name__ == '__main__':
    main()
