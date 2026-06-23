# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from services.streetlight_service import generate_pole_qr


class TestGeneratePoleQr:
    def test_basic_format(self):
        result = generate_pole_qr("Chennai", "ward_050", 1)
        assert result == "SVAI-CHE-W050-0001"

    def test_city_code_truncated_to_3_chars(self):
        assert generate_pole_qr("Bangalore", "ward_010", 5) == "SVAI-BAN-W010-0005"
        assert generate_pole_qr("Mumbai", "ward_100", 99) == "SVAI-MUM-W100-0099"

    def test_sequence_padded_to_4_digits(self):
        assert generate_pole_qr("Delhi", "ward_001", 0) == "SVAI-DEL-W001-0000"
        assert generate_pole_qr("Delhi", "ward_001", 9999) == "SVAI-DEL-W001-9999"

    def test_ward_id_without_prefix(self):
        result = generate_pole_qr("Pune", "W020", 42)
        assert result == "SVAI-PUN-W020-0042"

    def test_none_ward_id_uses_x(self):
        result = generate_pole_qr("Goa", None, 7)
        assert result == "SVAI-GOA-X-0007"

    def test_empty_city(self):
        result = generate_pole_qr("", "ward_005", 3)
        assert result == "SVAI--W005-0003"

    def test_long_city_name(self):
        result = generate_pole_qr("Thiruvananthapuram", "ward_012", 123)
        assert result == "SVAI-THI-W012-0123"

    def test_case_insensitivity_city(self):
        result = generate_pole_qr("chennai", "ward_050", 1)
        assert result == "SVAI-CHE-W050-0001"

    def test_ward_id_special_chars(self):
        result = generate_pole_qr("City", "WARD_999", 8888)
        assert result == "SVAI-CIT-WARD-8888"

    def test_output_format_regex(self):
        import re
        result = generate_pole_qr("Test", "ward_123", 456)
        assert re.match(r"^SVAI-[A-Z]{0,3}-[A-Z0-9]{1,4}-\d{4}$", result)

    def test_deterministic(self):
        r1 = generate_pole_qr("Chennai", "ward_050", 1)
        r2 = generate_pole_qr("Chennai", "ward_050", 1)
        assert r1 == r2
