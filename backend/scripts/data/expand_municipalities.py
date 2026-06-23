# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""Expand municipalities_seed.json with missing cities and fill in missing fields."""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SEED_FILE = PROJECT_ROOT / 'data' / 'civic_intel' / 'municipalities_seed.json'
FRONTEND_OUT = PROJECT_ROOT.parent / 'frontend' / 'public' / 'offline-data'

NEW_MUNICIPALITIES = [
    {
        "slug": "mathura-npp", "name": "Mathura-Vrindavan Municipal Corporation", "short_name": "MVMC",
        "municipality_type": "municipal_corporation", "city": "Mathura", "state_code": "UP",
        "state_name": "Uttar Pradesh", "district_name": "Mathura",
        "ward_count": 50, "population": 441894, "area_sqkm": 34,
        "centroid_lat": 27.4924, "centroid_lon": 77.6737,
        "helpline_phone": "0565-2500100",
        "website_url": "https://mathura.nic.in",
        "description": "Sacred city on the Yamuna, birthplace of Lord Krishna.",
        "services_offered": ["water_supply", "sewerage", "solid_waste", "roads", "streetlights"],
        "is_active": True
    },
    {
        "slug": "firozabad-npp", "name": "Firozabad Nagar Palika Parishad", "short_name": "FNP",
        "municipality_type": "municipality", "city": "Firozabad", "state_code": "UP",
        "state_name": "Uttar Pradesh", "district_name": "Firozabad",
        "ward_count": 40, "population": 306140, "area_sqkm": 22,
        "centroid_lat": 27.1591, "centroid_lon": 78.3957,
        "description": "Glass bangle manufacturing capital of India.",
        "services_offered": ["water_supply", "solid_waste", "roads", "streetlights"],
        "is_active": True
    },
    {
        "slug": "saharanpur-mc", "name": "Saharanpur Municipal Corporation", "short_name": "SNMC",
        "municipality_type": "municipal_corporation", "city": "Saharanpur", "state_code": "UP",
        "state_name": "Uttar Pradesh", "district_name": "Saharanpur",
        "ward_count": 70, "population": 705478, "area_sqkm": 45,
        "centroid_lat": 29.9680, "centroid_lon": 77.5510,
        "helpline_phone": "0132-2714100",
        "description": "North UP city known for wood carving industry.",
        "services_offered": ["water_supply", "sewerage", "solid_waste", "roads", "streetlights"],
        "is_active": True
    },
    {
        "slug": "bmc-bhilai", "name": "Bhilai-Durg Municipal Corporation", "short_name": "BDMC",
        "municipality_type": "municipal_corporation", "city": "Durg-Bhilai", "state_code": "CG",
        "state_name": "Chhattisgarh", "district_name": "Durg",
        "ward_count": 70, "population": 1064000, "area_sqkm": 88,
        "centroid_lat": 21.2093, "centroid_lon": 81.3780,
        "helpline_phone": "0788-2323400",
        "description": "Steel city of Chhattisgarh, home to SAIL's Bhilai Steel Plant.",
        "services_offered": ["water_supply", "sewerage", "solid_waste", "roads", "streetlights", "smart_city"],
        "is_active": True
    },
    {
        "slug": "sagar-mc", "name": "Sagar Municipal Corporation", "short_name": "SGMC",
        "municipality_type": "municipal_corporation", "city": "Sagar", "state_code": "MP",
        "state_name": "Madhya Pradesh", "district_name": "Sagar",
        "ward_count": 48, "population": 274556, "area_sqkm": 52,
        "centroid_lat": 23.8388, "centroid_lon": 78.7378,
        "description": "City of lakes in Bundelkhand region, university town.",
        "services_offered": ["water_supply", "solid_waste", "roads", "streetlights"],
        "is_active": True
    },
    {
        "slug": "bsl-bokaro", "name": "Bokaro Steel City Municipal Council", "short_name": "BSMC",
        "municipality_type": "municipality", "city": "Bokaro", "state_code": "JH",
        "state_name": "Jharkhand", "district_name": "Bokaro",
        "ward_count": 35, "population": 564000, "area_sqkm": 42,
        "centroid_lat": 23.6693, "centroid_lon": 86.1511,
        "description": "Planned industrial city built around Bokaro Steel Plant.",
        "services_offered": ["water_supply", "sewerage", "solid_waste", "roads", "streetlights"],
        "is_active": True
    },
    {
        "slug": "dibrugarh-mb", "name": "Dibrugarh Municipal Board", "short_name": "DMB",
        "municipality_type": "municipality", "city": "Dibrugarh", "state_code": "AS",
        "state_name": "Assam", "district_name": "Dibrugarh",
        "ward_count": 19, "population": 154296, "area_sqkm": 16,
        "centroid_lat": 27.4728, "centroid_lon": 94.9120,
        "description": "Tea city of India, gateway to upper Assam.",
        "services_offered": ["water_supply", "solid_waste", "roads", "streetlights"],
        "is_active": True
    },
    {
        "slug": "jorhat-mb", "name": "Jorhat Municipal Board", "short_name": "JMB",
        "municipality_type": "municipality", "city": "Jorhat", "state_code": "AS",
        "state_name": "Assam", "district_name": "Jorhat",
        "ward_count": 19, "population": 153889, "area_sqkm": 14,
        "centroid_lat": 26.7509, "centroid_lon": 94.2037,
        "description": "Cultural capital of Assam, home to Tocklai Tea Research.",
        "services_offered": ["water_supply", "solid_waste", "roads", "streetlights"],
        "is_active": True
    },
    {
        "slug": "silchar-mb", "name": "Silchar Municipal Board", "short_name": "SMB",
        "municipality_type": "municipality", "city": "Silchar", "state_code": "AS",
        "state_name": "Assam", "district_name": "Cachar",
        "ward_count": 24, "population": 228985, "area_sqkm": 15,
        "centroid_lat": 24.8333, "centroid_lon": 92.7789,
        "description": "Gateway to Barak Valley, major city of southern Assam.",
        "services_offered": ["water_supply", "solid_waste", "roads", "streetlights"],
        "is_active": True
    },
]

# Default services for entries missing them
DEFAULT_SERVICES = ["water_supply", "sewerage", "solid_waste", "roads", "streetlights"]


def main():
    data = json.loads(SEED_FILE.read_text(encoding='utf-8'))
    print(f"Current: {len(data)} municipalities")

    existing_slugs = {m['slug'] for m in data}

    # Add new municipalities
    added = 0
    for m in NEW_MUNICIPALITIES:
        if m['slug'] not in existing_slugs:
            data.append(m)
            added += 1
            print(f"  + {m['city']} ({m['state_code']})")

    # Fill missing fields in existing entries
    fixed = 0
    for m in data:
        changed = False

        # Add missing is_active
        if 'is_active' not in m:
            m['is_active'] = True
            changed = True

        # Add missing services_offered
        if not m.get('services_offered'):
            m['services_offered'] = DEFAULT_SERVICES[:]
            changed = True

        # Add missing centroid for known cities
        if not m.get('centroid_lat') or not m.get('centroid_lon'):
            changed = True  # Will be counted but coords stay None

        if changed:
            fixed += 1

    # Save
    SEED_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f"\nAdded: {added}")
    print(f"Fixed: {fixed}")
    print(f"Total: {len(data)} municipalities")

    # Regenerate frontend bundle
    FRONTEND_OUT.mkdir(parents=True, exist_ok=True)
    bundle = []
    for m in data:
        bundle.append({
            'slug': m.get('slug', ''),
            'name': m.get('name', ''),
            'short_name': m.get('short_name', m.get('name', '')),
            'city': m.get('city', ''),
            'state_code': m.get('state_code', ''),
            'municipality_type': m.get('municipality_type', ''),
            'ward_count': m.get('ward_count'),
            'population': m.get('population'),
            'helpline_phone': m.get('helpline_phone'),
            'centroid_lat': m.get('centroid_lat'),
            'centroid_lon': m.get('centroid_lon'),
        })
    outfile = FRONTEND_OUT / 'municipalities_bundle.json'
    outfile.write_text(json.dumps(bundle, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Frontend bundle: {len(bundle)} municipalities, {outfile.stat().st_size / 1024:.1f} KB")


if __name__ == '__main__':
    main()
