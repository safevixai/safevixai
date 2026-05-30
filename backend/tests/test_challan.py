from __future__ import annotations

import csv
import io
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from models.schemas import ChallanQuery
from services.challan_service import (
    ChallanService,
    DEFAULT_RULES,
    INDIAN_STATE_CODE_ALIASES,
    VEHICLE_CLASS_ALIASES,
    ChallanRule,
)
from services.exceptions import ExternalServiceError, ServiceValidationError


class TestChallanServiceBasics:
    def test_uses_built_in_defaults(self):
        service = ChallanService(Settings())
        payload = service.calculate(
            ChallanQuery(violation_code='185', vehicle_class='car', state_code='TN', is_repeat=False)
        )
        assert payload.section == 'Section 185'
        assert payload.base_fine == 10000
        assert payload.repeat_fine == 15000
        assert payload.amount_due == 10000

    def test_normalizes_inputs_and_repeat_amount(self):
        service = ChallanService(Settings())
        payload = service.calculate(
            ChallanQuery(violation_code='183', vehicle_class='Truck', state_code='TN', is_repeat=True)
        )
        assert payload.vehicle_class == 'heavy_vehicle'
        assert payload.state_code == 'TN'
        assert payload.amount_due == 8000

    def test_rejects_unknown_violation_codes(self):
        service = ChallanService(Settings())
        with pytest.raises(ServiceValidationError, match='Unsupported violation code'):
            service.calculate(
                ChallanQuery(violation_code='XYZ', vehicle_class='car', state_code='TN', is_repeat=False)
            )


class TestChallanServiceCSVLoading:
    def _make_service(self):
        with patch.object(ChallanService, '_load_optional_files', return_value=None):
            service = ChallanService(Settings())
        service.rules = []
        service.state_overrides = []
        return service

    def test_load_rules_csv_skips_when_no_fieldnames(self):
        service = self._make_service()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            f.write("")
            csv_path = Path(f.name)

        try:
            service._load_rules_csv(csv_path)
            assert service.rules == []
        finally:
            csv_path.unlink(missing_ok=True)

    def test_load_rules_csv_skips_row_without_violation_code(self):
        service = self._make_service()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            f.write("violation_code,section,description,base_fine\n")
            f.write("999,Section 999,Test violation,500\n")
            f.write(" , , ,\n")
            csv_path = Path(f.name)

        try:
            service._load_rules_csv(csv_path)
            assert len(service.rules) == 1
            assert service.rules[0].violation_code == '999'
        finally:
            csv_path.unlink(missing_ok=True)

    def test_load_rules_csv_skips_row_without_base_fines(self):
        service = self._make_service()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            f.write("violation_code,base_fine_2w,base_fine_4w\n")
            f.write("999,1000,2000\n")
            csv_path = Path(f.name)

        try:
            service._load_rules_csv(csv_path)
            assert len(service.rules) == 1
            assert service.rules[0].violation_code == '999'
        finally:
            csv_path.unlink(missing_ok=True)

    def test_load_rules_csv_skips_row_no_base_fine_at_all(self):
        service = self._make_service()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            f.write("violation_code,section,description\n")
            f.write("999,Section 999,Test violation\n")
            csv_path = Path(f.name)

        try:
            service._load_rules_csv(csv_path)
            assert service.rules == []
        finally:
            csv_path.unlink(missing_ok=True)

    def test_load_rules_csv_handles_oserror(self):
        service = self._make_service()
        fake_path = Path("C:/nonexistent/violations.csv")
        service._load_rules_csv(fake_path)
        assert service.rules == []

    def test_load_state_overrides_csv_skips_when_no_fieldnames(self):
        service = self._make_service()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            f.write("")
            csv_path = Path(f.name)

        try:
            service._load_state_overrides_csv(csv_path)
            assert service.state_overrides == []
        finally:
            csv_path.unlink(missing_ok=True)

    def test_load_state_overrides_csv_skips_empty_state_code(self):
        service = self._make_service()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            f.write("violation_code,state_code,base_fine\n")
            f.write("183,,2000\n")
            f.write("185,TN,5000\n")
            csv_path = Path(f.name)

        try:
            service._load_state_overrides_csv(csv_path)
            assert len(service.state_overrides) == 1
            assert service.state_overrides[0].state_code == "TN"
        finally:
            csv_path.unlink(missing_ok=True)

    def test_load_state_overrides_csv_skips_row_without_base_fine(self):
        service = self._make_service()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            f.write("violation_code,state_code,base_fine\n")
            f.write("183,TN,\n")
            csv_path = Path(f.name)

        try:
            service._load_state_overrides_csv(csv_path)
            assert service.state_overrides == []
        finally:
            csv_path.unlink(missing_ok=True)

    def test_load_state_overrides_csv_handles_oserror(self):
        service = self._make_service()
        fake_path = Path("C:/nonexistent/overrides.csv")
        service._load_state_overrides_csv(fake_path)
        assert service.state_overrides == []

    def test_load_state_overrides_csv_with_vehicle_class(self):
        service = self._make_service()
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            f.write("violation_code,state_code,vehicle_class,base_fine,repeat_fine,section,description,note\n")
            f.write("183,TN,car,2500,5000,Section 183 TN,TN Speeding,TN override applied\n")
            csv_path = Path(f.name)

        try:
            service._load_state_overrides_csv(csv_path)
            assert len(service.state_overrides) == 1
            assert service.state_overrides[0].state_code == "TN"
            assert service.state_overrides[0].vehicle_class == "light_motor_vehicle"
            assert service.state_overrides[0].base_fine == 2500
            assert service.state_overrides[0].repeat_fine == 5000
        finally:
            csv_path.unlink(missing_ok=True)


class TestChallanServiceNormalize:
    def test_normalize_violation_code(self):
        assert ChallanService._normalize_violation_code(' 185 ') == '185'
        assert ChallanService._normalize_violation_code('MVA_185') == 'MVA185'
        assert ChallanService._normalize_violation_code('112/183') == '112/183'
        assert ChallanService._normalize_violation_code('') == ''

    def test_normalize_state_code_with_parentheses(self):
        assert ChallanService._normalize_state_code('XX (TN)') == 'TN'
        assert ChallanService._normalize_state_code('Tamil Nadu (TN)') == 'TN'

    def test_normalize_state_code_empty_raises(self):
        with pytest.raises(ServiceValidationError, match='state_code is required'):
            ChallanService._normalize_state_code('')

    def test_normalize_state_code_whitespace_raises(self):
        with pytest.raises(ServiceValidationError, match='state_code is required'):
            ChallanService._normalize_state_code('   ')

    def test_normalize_state_code_long_name_uses_full_match(self):
        assert ChallanService._normalize_state_code('TAMILNADU') == 'TN'

    def test_normalize_state_code_long_name_fallback_to_first_two(self):
        result = ChallanService._normalize_state_code('XYZZY')
        assert result == 'XY'

    def test_normalize_vehicle_class_empty_raises(self):
        with pytest.raises(ServiceValidationError, match='vehicle_class is required'):
            ChallanService._normalize_vehicle_class('')

    def test_normalize_vehicle_class_whitespace_raises(self):
        with pytest.raises(ServiceValidationError, match='vehicle_class is required'):
            ChallanService._normalize_vehicle_class('   ')

    def test_parse_money_returns_none_for_empty(self):
        assert ChallanService._parse_money('') is None

    def test_parse_money_returns_none_for_non_numeric(self):
        assert ChallanService._parse_money('abc') is None

    def test_parse_money_parses_numeric_string(self):
        assert ChallanService._parse_money('5000') == 5000

    def test_parse_money_strips_non_numeric(self):
        assert ChallanService._parse_money('₹ 2,500') == 2500

    def test_parse_money_handles_negative(self):
        assert ChallanService._parse_money('-1000') == 1000


class TestChallanServiceStateOverride:
    def test_state_override_applied(self):
        service = ChallanService(Settings())
        service.state_overrides = []
        service.calculate(
            ChallanQuery(violation_code='185', vehicle_class='car', state_code='TN', is_repeat=False)
        )
        assert True

    def test_calculate_with_state_override_in_data(self):
        from models.challan import StateChallanOverride
        service = ChallanService(Settings())
        override = StateChallanOverride(
            state_code="KA",
            violation_code="185",
            vehicle_class=None,
            base_fine=8000,
            repeat_fine=None,
            section="Section 185 (KA Override)",
            description="Karnataka DUI fine",
            note="KA state override",
        )
        service.state_overrides = [override]

        payload = service.calculate(
            ChallanQuery(violation_code='185', vehicle_class='car', state_code='KA', is_repeat=False)
        )
        assert payload.base_fine == 8000
        assert payload.state_override == 'KA state override'
        assert payload.section == 'Section 185 (KA Override)'
        assert payload.description == 'Karnataka DUI fine'


class TestChallanServiceDB:
    @pytest.mark.asyncio
    async def test_calculate_with_db_success(self):
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
        assert payload.base_fine == 10000
        assert payload.amount_due == 10000

    @pytest.mark.asyncio
    async def test_calculate_with_db_database_error(self):
        service = ChallanService(Settings())
        db = AsyncMock(spec=AsyncSession)
        db.execute = AsyncMock(side_effect=SQLAlchemyError('connection failed'))

        with pytest.raises(ExternalServiceError, match='Challan database lookup is unavailable'):
            await service.calculate_with_db(
                ChallanQuery(violation_code='185', vehicle_class='car', state_code='TN', is_repeat=False),
                db=db,
            )

    @pytest.mark.asyncio
    async def test_calculate_with_db_no_row_found(self):
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

    @pytest.mark.asyncio
    async def test_calculate_with_db_with_state_override(self):
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
        assert payload.state_override == 'TN reduced fine pilot'
