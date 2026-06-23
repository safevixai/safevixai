# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team
from __future__ import annotations

import gzip
import sys
from pathlib import Path


def compress_geojson_files(directory: str, level: int = 9) -> None:
    data_dir = Path(directory)
    if not data_dir.is_dir():
        print(f"Directory not found: {data_dir}")
        return

    geojson_files = list(data_dir.glob("*.geojson")) + list(data_dir.glob("*.json"))
    if not geojson_files:
        print(f"No GeoJSON/JSON files found in {data_dir}")
        return

    total_orig = 0
    total_comp = 0

    for src in geojson_files:
        if src.suffix == ".gz":
            continue

        data = src.read_bytes()
        compressed = gzip.compress(data, compresslevel=level)

        dst = src.with_name(f"{src.name}.gz")
        dst.write_bytes(compressed)

        orig_kb = len(data) / 1024
        comp_kb = len(compressed) / 1024
        reduction = (1 - len(compressed) / max(len(data), 1)) * 100
        total_orig += len(data)
        total_comp += len(compressed)

        print(f"{src.name}: {orig_kb:.1f}KB -> {comp_kb:.1f}KB ({reduction:.0f}% reduction)")

    if total_orig:
        overall = (1 - total_comp / total_orig) * 100
        print(f"\nTotal: {total_orig/1024:.1f}KB -> {total_comp/1024:.1f}KB ({overall:.0f}% overall reduction)")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "frontend/public/offline-data"
    compress_geojson_files(target)
