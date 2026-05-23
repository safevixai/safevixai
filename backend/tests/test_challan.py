from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock

from core.config import Settings
from models.schemas import ChallanQuery
from services.challan_service import (
    ChallanService,
    DEFAULT_RULES,
    VEHICLE_CLASS_ALIASES,
    INDIAN_STATE_CODE_ALIASES,
)
from services.exceptions import ExternalServiceError, ServiceValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession


# ---------------------------------------------------------------------------
# Existing tests (preserved verbatim)
# ---------------------------------------------------------------------------

def test_challan_service_uses_built_in_defaults():
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='185',
            vehicle_class='car',
            state_code='TN',
            is_repeat=False,
        )
    )

    assert payload.section == 'Section 185'
    assert payload.base_fine == 10000
    assert payload.repeat_fine == 15000
    assert payload.amount_due == 10000


def test_challan_service_normalizes_inputs_and_repeat_amount():
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='183',
            vehicle_class='Truck',
            state_code='TN',
            is_repeat=True,
        )
    )

    assert payload.vehicle_class == 'heavy_vehicle'
    assert payload.state_code == 'TN'
    assert payload.amount_due == 4000


def test_challan_calculator_reports_database_unavailable(app):
    with TestClient(app) as client:
        response = client.post(
            '/api/v1/challan/calculate',
            json={
                'violation_code': '185',
                'vehicle_class': 'car',
                'state_code': 'TN',
                'is_repeat': False,
            },
        )

    assert response.status_code == 503
    assert response.json()['detail'] == 'Challan database lookup is unavailable'


def test_challan_service_rejects_unknown_violation_codes():
    service = ChallanService(Settings())

    with pytest.raises(ServiceValidationError, match='Unsupported violation code'):
        service.calculate(
            ChallanQuery(
                violation_code='XYZ',
                vehicle_class='car',
                state_code='TN',
                is_repeat=False,
            )
        )


# ---------------------------------------------------------------------------
# 1.  All violation codes from DEFAULT_RULES
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('violation_code,expected_section,expected_base,expected_repeat', [
    ('183', 'Section 183', 2000, 4000),
    ('185', 'Section 185', 10000, 15000),
    ('181', 'Sections 3/181', 5000, 10000),
    ('194D', 'Sections 129/194D', 1000, 2000),
    ('194B', 'Section 194B', 1000, 2000),
    ('179', 'Section 179', 2000, 4000),
])
def test_all_violation_codes(violation_code, expected_section, expected_base, expected_repeat):
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code=violation_code,
            vehicle_class='car',
            state_code='TN',
            is_repeat=False,
        )
    )
    assert payload.violation_code == violation_code
    assert payload.section == expected_section
    assert payload.base_fine == expected_base
    assert payload.repeat_fine == expected_repeat
    assert payload.amount_due == expected_base


# ---------------------------------------------------------------------------
# 2.  Repeat offense — every code
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('violation_code,vehicle_class,expected_repeat_amount', [
    ('183', 'car', 4000),
    ('185', 'car', 15000),
    ('181', 'car', 10000),
    ('194D', 'car', 2000),
    ('194B', 'car', 2000),
    ('179', 'car', 4000),
])
def test_repeat_offense(violation_code, vehicle_class, expected_repeat_amount):
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code=violation_code,
            vehicle_class=vehicle_class,
            state_code='TN',
            is_repeat=True,
        )
    )
    assert payload.amount_due == expected_repeat_amount
    assert payload.repeat_fine == expected_repeat_amount


# ---------------------------------------------------------------------------
# 3.  All vehicle classes — fine amounts for 183 (speeding)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('vehicle_class,expected_base,expected_repeat', [
    ('two_wheeler', 1000, 2000),
    ('light_motor_vehicle', 2000, 4000),
    ('heavy_vehicle', 4000, 8000),
    ('bus', 4000, 8000),
    ('spaceship', 2000, 4000),
])
def test_vehicle_class_fines_for_speeding_183(vehicle_class, expected_base, expected_repeat):
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='183',
            vehicle_class=vehicle_class,
            state_code='TN',
            is_repeat=False,
        )
    )
    assert payload.vehicle_class == vehicle_class
    assert payload.base_fine == expected_base
    assert payload.repeat_fine == expected_repeat


# ---------------------------------------------------------------------------
# 4.  Vehicle class aliases
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('alias,expected_normalized', sorted(VEHICLE_CLASS_ALIASES.items()))
def test_vehicle_class_aliases(alias, expected_normalized):
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='183',
            vehicle_class=alias,
            state_code='TN',
            is_repeat=False,
        )
    )
    assert payload.vehicle_class == expected_normalized


# ---------------------------------------------------------------------------
# 5.  State code aliases — full names → 2-letter codes
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('alias,expected_code', [
    ('TAMILNADU', 'TN'),
    ('DELHI', 'DL'),
    ('ANDHRAPRADESH', 'AP'),
    ('KARNATAKA', 'KA'),
    ('KERALA', 'KL'),
    ('MAHARASHTRA', 'MH'),
    ('WESTBENGAL', 'WB'),
    ('ODISHA', 'OD'),
    ('ORISSA', 'OD'),
    ('NATIONALCAPITALTERRITORYOFDELHI', 'DL'),
    ('PONDICHERRY', 'PY'),
    ('PUDUCHERRY', 'PY'),
    ('GOA', 'GA'),
    ('BIHAR', 'BR'),
    ('UTTARPRADESH', 'UP'),
])
def test_state_code_aliases(alias, expected_code):
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='185',
            vehicle_class='car',
            state_code=alias,
            is_repeat=False,
        )
    )
    assert payload.state_code == expected_code


# ---------------------------------------------------------------------------
# 6.  Violation code aliases (e.g. 112/183 → 183)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('alias,expected_code,expected_section', [
    ('112/183', '183', 'Section 183'),
    ('DUI', '185', 'Section 185'),
    ('DRUNK', '185', 'Section 185'),
    ('3/181', '181', 'Sections 3/181'),
    ('194D-HELMET', '194D', 'Sections 129/194D'),
    ('194D-SEATBELT', '194D', 'Sections 129/194D'),
])
def test_violation_code_aliases(alias, expected_code, expected_section):
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code=alias,
            vehicle_class='car',
            state_code='TN',
            is_repeat=False,
        )
    )
    assert payload.violation_code == expected_code
    assert payload.section == expected_section


# ---------------------------------------------------------------------------
# 7.  Drunk driving (185) — base 10000, repeat 15000
# ---------------------------------------------------------------------------

def test_drunk_driving_185():
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='185',
            vehicle_class='car',
            state_code='TN',
            is_repeat=False,
        )
    )
    assert payload.base_fine == 10000
    assert payload.repeat_fine == 15000
    assert payload.description == 'Driving under the influence of alcohol or drugs.'


# ---------------------------------------------------------------------------
# 8.  No licence (181)
# ---------------------------------------------------------------------------

def test_no_license_181():
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='181',
            vehicle_class='car',
            state_code='TN',
            is_repeat=False,
        )
    )
    assert payload.base_fine == 5000
    assert payload.repeat_fine == 10000
    assert payload.section == 'Sections 3/181'


# ---------------------------------------------------------------------------
# 9.  Safety-net: all DEFAULT_RULES are reachable
# ---------------------------------------------------------------------------

def test_all_default_rules_are_covered():
    service = ChallanService(Settings())
    for rule in DEFAULT_RULES:
        payload = service.calculate(
            ChallanQuery(
                violation_code=rule.violation_code,
                vehicle_class='car',
                state_code='TN',
                is_repeat=False,
            )
        )
        assert payload.violation_code == rule.violation_code
        assert payload.amount_due > 0


# ---------------------------------------------------------------------------
# 10.  Edge cases — unknown violation code → ServiceValidationError
# ---------------------------------------------------------------------------

def test_unknown_violation_code_raises_validation_error():
    service = ChallanService(Settings())
    with pytest.raises(ServiceValidationError, match='Unsupported violation code'):
        service.calculate(
            ChallanQuery(
                violation_code='UNKNOWN',
                vehicle_class='car',
                state_code='TN',
                is_repeat=False,
            )
        )


# ---------------------------------------------------------------------------
# 11.  Edge cases — unknown vehicle class defaults to 'default' fine
# ---------------------------------------------------------------------------

def test_unknown_vehicle_class_defaults_to_default_fine():
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='183',
            vehicle_class='spaceship',
            state_code='TN',
            is_repeat=False,
        )
    )
    assert payload.vehicle_class == 'spaceship'
    assert payload.base_fine == 2000
    assert payload.amount_due == 2000


# ---------------------------------------------------------------------------
# 12.  Edge cases — unknown state code still calculates fine
# ---------------------------------------------------------------------------

def test_unknown_state_code_still_calculates():
    service = ChallanService(Settings())
    payload = service.calculate(
        ChallanQuery(
            violation_code='185',
            vehicle_class='car',
            state_code='XX',
            is_repeat=False,
        )
    )
    assert payload.state_code == 'XX'
    assert payload.amount_due == 10000


# ---------------------------------------------------------------------------
# 13.  Edge cases — MVA_ prefix is not stripped (current behaviour documents
#      that MVA_185 normalises to MVA185, which does NOT match rule 185)
# ---------------------------------------------------------------------------

def test_mva_prefix_not_stripped_raises_error():
    service = ChallanService(Settings())
    with pytest.raises(ServiceValidationError, match='Unsupported violation code'):
        service.calculate(
            ChallanQuery(
                violation_code='MVA_185',
                vehicle_class='car',
                state_code='TN',
                is_repeat=False,
            )
        )


# ---------------------------------------------------------------------------
# 14.  Edge cases — whitespace-only violation code normalises to ''
#      and raises validation error
# ---------------------------------------------------------------------------

def test_whitespace_violation_code_raises_error():
    service = ChallanService(Settings())
    with pytest.raises(ServiceValidationError, match='Unsupported violation code'):
        service.calculate(
            ChallanQuery(
                violation_code='   ',
                vehicle_class='car',
                state_code='TN',
                is_repeat=False,
            )
        )


# ---------------------------------------------------------------------------
# 15.  calculate_with_db — success with mocked AsyncSession
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_calculate_with_db_success():
    service = ChallanService(Settings())
    db = AsyncMock(spec=AsyncSession)

    mock_row = MagicMock()
    mock_row.__getitem__.side_effect = lambda k: {
        'violation_code': '185',
        'vehicle_class': 'light_motor_vehicle',
        'section': 'Section 185',
        'description': 'Driving under the influence.',
        'base_fine': '10000',
        'repeat_fine': '15000',
    }[k]

    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = mock_row

    mock_override_result = MagicMock()
    mock_override_result.mappings.return_value.first.return_value = None

    db.execute = AsyncMock(side_effect=[mock_result, mock_override_result])

    payload = await service.calculate_with_db(
        ChallanQuery(violation_code='185', vehicle_class='car', state_code='TN', is_repeat=False),
        db=db,
    )

    assert payload.violation_code == '185'
    assert payload.vehicle_class == 'light_motor_vehicle'
    assert payload.base_fine == 10000
    assert payload.repeat_fine == 15000
    assert payload.amount_due == 10000
    assert payload.section == 'Section 185'


# ---------------------------------------------------------------------------
# 16.  calculate_with_db — with state override from DB
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_calculate_with_db_with_state_override():
    service = ChallanService(Settings())
    db = AsyncMock(spec=AsyncSession)

    mock_row = MagicMock()
    mock_row.__getitem__.side_effect = lambda k: {
        'violation_code': '185',
        'vehicle_class': 'light_motor_vehicle',
        'section': 'Section 185',
        'description': 'Driving under the influence.',
        'base_fine': '10000',
        'repeat_fine': '15000',
    }[k]
    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = mock_row

    mock_override_row = MagicMock()
    mock_override_row.__getitem__.side_effect = lambda k: {
        'base_fine': '8000',
        'repeat_fine': '12000',
        'section': 'Section 185 (TN Override)',
        'description': 'TN-specific penalty for DUI',
        'note': 'TN reduced fine pilot',
    }[k]
    mock_override_result = MagicMock()
    mock_override_result.mappings.return_value.first.return_value = mock_override_row

    db.execute = AsyncMock(side_effect=[mock_result, mock_override_result])

    payload = await service.calculate_with_db(
        ChallanQuery(violation_code='185', vehicle_class='car', state_code='TN', is_repeat=True),
        db=db,
    )

    assert payload.base_fine == 8000
    assert payload.repeat_fine == 12000
    assert payload.amount_due == 12000
    assert payload.section == 'Section 185 (TN Override)'
    assert payload.description == 'TN-specific penalty for DUI'
    assert payload.state_override == 'TN reduced fine pilot'


# ---------------------------------------------------------------------------
# 17.  calculate_with_db — DB unavailable → ExternalServiceError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_calculate_with_db_database_error():
    service = ChallanService(Settings())
    db = AsyncMock(spec=AsyncSession)
    db.execute = AsyncMock(side_effect=SQLAlchemyError('connection failed'))

    with pytest.raises(ExternalServiceError, match='Challan database lookup is unavailable'):
        await service.calculate_with_db(
            ChallanQuery(violation_code='185', vehicle_class='car', state_code='TN', is_repeat=False),
            db=db,
        )


# ---------------------------------------------------------------------------
# 18.  calculate_with_db — no row matched → ServiceValidationError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_calculate_with_db_no_row_found():
    service = ChallanService(Settings())
    db = AsyncMock(spec=AsyncSession)

    mock_result = MagicMock()
    mock_result.mappings.return_value.first.return_value = None
    db.execute = AsyncMock(return_value=mock_result)

    with pytest.raises(ServiceValidationError, match='Unsupported or unseeded violation code'):
        await service.calculate_with_db(
            ChallanQuery(violation_code='UNKNOWN', vehicle_class='car', state_code='TN', is_repeat=False),
            db=db,
        )


# ---------------------------------------------------------------------------
# 19.  _normalize_violation_code static helper (white-box)
# ---------------------------------------------------------------------------

def test_normalize_violation_code():
    assert ChallanService._normalize_violation_code(' 185 ') == '185'
    assert ChallanService._normalize_violation_code('MVA_185') == 'MVA185'
    assert ChallanService._normalize_violation_code('112/183') == '112/183'
    assert ChallanService._normalize_violation_code('') == ''


# ---------------------------------------------------------------------------
# 20.  _normalize_state_code handles parenthetical codes
# ---------------------------------------------------------------------------

def test_normalize_state_code_with_parentheses():
    assert ChallanService._normalize_state_code('XX (TN)') == 'TN'
    assert ChallanService._normalize_state_code('Tamil Nadu (TN)') == 'TN'
