from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from core.config import Settings
from models.schemas import ChallanQuery
from services.challan_service import ChallanService
from services.exceptions import ServiceValidationError


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
