"""CLI script to export all civic intelligence data to data/civic_intel/ for HuggingFace Hub."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


async def main() -> None:
    """Export all civic intel tables to CSV/JSON/GeoJSON."""
    from core.database import AsyncSessionLocal
    from services.civic_intel.data_exporter import CivicDataExporter

    exporter = CivicDataExporter()
    print(f'[Export] Exporting to: {exporter.export_dir}')

    async with AsyncSessionLocal() as db:
        manifest = await exporter.export_all(db)

    print('\n══════════════════════════════════════════')
    print('  SafeVixAI Civic Intelligence Data Export')
    print('══════════════════════════════════════════')
    print(f"  Exported at: {manifest['exported_at']}")
    print(f"  License: {manifest['license']}")
    print()

    total_size = 0
    for filename, info in manifest.get('files', {}).items():
        if 'error' in info:
            print(f'  ✗ {filename:40s}  ERROR: {info["error"]}')
        else:
            total_size += info.get('size_bytes', 0)
            print(f'  ✓ {filename:40s}  {info["records"]:>8,} records  {info["size_human"]:>10s}')

    print(f'\n  Total: {CivicDataExporter._human_size(total_size)}')
    print(f'  Output: {exporter.export_dir}')
    print()
    print('  Upload to HuggingFace:')
    print('    huggingface-cli upload SafeVixHub/civic-intel-india \\')
    print(f'      {exporter.export_dir} .')
    print()


if __name__ == '__main__':
    asyncio.run(main())
