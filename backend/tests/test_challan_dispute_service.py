# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from models.schemas import DisputeDraftRequest
from services.challan_dispute_service import ChallanDisputeService


def _request(challan_ref="DL-2024-12345", violation_code="183",
             fine_amount=2000, mitigating_factors="No prior violations"):
    return DisputeDraftRequest(
        challan_ref=challan_ref,
        violation_code=violation_code,
        fine_amount=fine_amount,
        mitigating_factors=mitigating_factors,
    )


class TestParseStateFromRef:
    def test_standard_format(self):
        assert ChallanDisputeService._parse_state_from_ref("DL-1234-ABCD") == "DL"

    def test_state_prefix_with_spaces(self):
        assert ChallanDisputeService._parse_state_from_ref("TN 01 AB 1234") == "TN"

    def test_no_delimiters(self):
        assert ChallanDisputeService._parse_state_from_ref("KA51GH3456") == "KA"

    def test_lowercase_input(self):
        assert ChallanDisputeService._parse_state_from_ref("mh-02-ef-9012") == "MH"

    def test_numeric_prefix_fallsback_to_dl(self):
        assert ChallanDisputeService._parse_state_from_ref("1234-DL-ABCD") == "DL"

    def test_short_ref_fallsback_to_dl(self):
        assert ChallanDisputeService._parse_state_from_ref("A") == "DL"

    def test_empty_string_fallsback_to_dl(self):
        assert ChallanDisputeService._parse_state_from_ref("") == "DL"

    def test_special_characters_stripped(self):
        assert ChallanDisputeService._parse_state_from_ref("HR@2024#7890") == "HR"


class TestDraftDispute:
    """Verify violation-code-specific section citations, confidence, and checklists."""

    def test_speeding_183(self):
        req = _request(violation_code="183")
        result = ChallanDisputeService.draft_dispute(req)

        assert "Section 183" in result.cited_mva_sections
        assert "speed detection device" in result.appeal_letter.lower()
        assert result.confidence_score == 0.92
        assert "calibration" in result.appeal_letter.lower()

    def test_dui_185(self):
        req = _request(violation_code="185")
        result = ChallanDisputeService.draft_dispute(req)

        assert "Section 185" in result.cited_mva_sections
        assert "breathalyzer" in result.appeal_letter.lower()
        assert result.confidence_score == 0.88

    def test_dangerous_driving_184(self):
        req = _request(violation_code="184")
        result = ChallanDisputeService.draft_dispute(req)

        assert "Section 184" in result.cited_mva_sections
        assert "Emergency Exception" in result.appeal_letter
        assert result.confidence_score == 0.89

    def test_no_license_181(self):
        req = _request(violation_code="181")
        result = ChallanDisputeService.draft_dispute(req)

        assert "Section 181" in result.cited_mva_sections
        assert "DigiLocker" in result.appeal_letter
        assert result.confidence_score == 0.90

    def test_helmet_194D(self):
        req = _request(violation_code="194D")
        result = ChallanDisputeService.draft_dispute(req)

        assert "Section 194D" in result.cited_mva_sections
        assert "Sikh" in result.appeal_letter
        assert result.confidence_score == 0.95

    def test_helmet_normalized_code_194d(self):
        """Lowercase code '194d' still matches Section 194D."""
        req = _request(violation_code="194d")
        result = ChallanDisputeService.draft_dispute(req)

        assert "Section 194D" in result.cited_mva_sections

    def test_unknown_violation_fallsback_to_177(self):
        req = _request(violation_code="999")
        result = ChallanDisputeService.draft_dispute(req)

        assert "Section 177" in result.cited_mva_sections
        assert "General Penalty" in result.appeal_letter
        assert result.confidence_score == 0.75

    def test_dispute_ref_format(self):
        req = _request()
        result = ChallanDisputeService.draft_dispute(req)
        assert result.dispute_ref.startswith("DSP-")
        assert len(result.dispute_ref) == 12  # "DSP-" + 8 hex chars

    def test_instructions_contain_state_rules(self):
        req = _request(challan_ref="TN-2024-56789", violation_code="183")
        result = ChallanDisputeService.draft_dispute(req)
        combined = " ".join(result.instructions)
        assert "Tamil Nadu" in combined

    def test_appeal_letter_contains_challan_ref(self):
        req = _request(challan_ref="MH-2024-99999")
        result = ChallanDisputeService.draft_dispute(req)
        assert "MH-2024-99999" in result.appeal_letter

    def test_mitigating_factors_included(self):
        req = _request(violation_code="183", mitigating_factors="Emergency hospital visit")
        result = ChallanDisputeService.draft_dispute(req)
        assert "Emergency hospital visit" in result.appeal_letter
