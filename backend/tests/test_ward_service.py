from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.ward import Ward
from services.ward_service import WardService


@pytest.mark.asyncio
async def test_ensure_seeded_empty():
    db = AsyncMock()
    count_mock = MagicMock()
    count_mock.scalar.return_value = 0
    db.execute = AsyncMock(return_value=count_mock)

    await WardService.ensure_seeded(db)

    assert db.add.call_count == 5
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_ensure_seeded_has_data():
    db = AsyncMock()
    count_mock = MagicMock()
    count_mock.scalar.return_value = 5
    db.execute = AsyncMock(return_value=count_mock)

    await WardService.ensure_seeded(db)

    db.add.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.asyncio
async def test_find_ward_by_coordinates_found():
    db = AsyncMock()
    ward = Ward(ward_id="ward_05_royapuram", ward_name="Royapuram Ward 50")
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = ward
    db.execute = AsyncMock(return_value=result_mock)

    with patch.object(WardService, "ensure_seeded", return_value=None):
        result = await WardService.find_ward_by_coordinates(db, 13.07, 80.26)

    assert result is ward


@pytest.mark.asyncio
async def test_find_ward_by_coordinates_not_found():
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result_mock)

    with patch.object(WardService, "ensure_seeded", return_value=None):
        result = await WardService.find_ward_by_coordinates(db, 13.07, 80.26)

    assert result is None


@pytest.mark.asyncio
async def test_get_ward_stats_all_types():
    db = AsyncMock()
    open_mock = MagicMock()
    open_mock.scalar.return_value = 10
    resolved_mock = MagicMock()
    resolved_mock.scalar.return_value = 5
    rejected_mock = MagicMock()
    rejected_mock.scalar.return_value = 2
    db.execute = AsyncMock(side_effect=[open_mock, resolved_mock, rejected_mock])

    result = await WardService.get_ward_stats(db, "ward_05_royapuram")

    assert result == {
        "ward_id": "ward_05_royapuram",
        "open_issues": 10,
        "resolved_issues": 5,
        "rejected_issues": 2,
        "total_issues": 17,
        "resolution_rate": 29.41,
    }


@pytest.mark.asyncio
async def test_get_ward_stats_no_issues():
    db = AsyncMock()
    zero_mock = MagicMock()
    zero_mock.scalar.return_value = 0
    db.execute = AsyncMock(side_effect=[zero_mock, zero_mock, zero_mock])

    result = await WardService.get_ward_stats(db, "ward_13_adyar")

    assert result == {
        "ward_id": "ward_13_adyar",
        "open_issues": 0,
        "resolved_issues": 0,
        "rejected_issues": 0,
        "total_issues": 0,
        "resolution_rate": 0.0,
    }


@pytest.mark.asyncio
async def test_list_all_wards():
    db = AsyncMock()
    ward_a = Ward(ward_id="ward_A", ward_name="A Ward")
    ward_b = Ward(ward_id="ward_B", ward_name="B Ward")
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = [ward_a, ward_b]
    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock
    db.execute = AsyncMock(return_value=result_mock)

    with patch.object(WardService, "ensure_seeded", return_value=None):
        result = await WardService.list_all_wards(db)

    assert result == [ward_a, ward_b]
