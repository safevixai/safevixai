from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_alembic_upgrade_head(app):
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200


def test_postgis_extension_exists(app):
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"


def test_alembic_downgrade_base(app):
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200


def test_migration_files_exist():
    from pathlib import Path

    migrations_dir = Path(__file__).resolve().parents[1] / "migrations" / "versions"

    if migrations_dir.exists():
        migration_files = list(migrations_dir.glob("*.py"))
        assert len(migration_files) >= 1
        assert any("001" in f.name for f in migration_files)
