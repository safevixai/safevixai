from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from services.local_emergency_catalog import (
    LocalEmergencyEntry,
    _contains_any,
    _guess_category,
    _join_address,
    _load_generic_emergency_csv,
    _load_hospital_directory,
    _load_nin_facilities,
    _parse_bool,
    _parse_coordinate_pair,
    _parse_float,
    _pick_first,
    load_local_emergency_catalog,
)


class TestLocalEmergencyEntry:
    def test_defaults(self):
        entry = LocalEmergencyEntry(id="1", name="Test", category="hospital", lat=13.0, lon=80.0)
        assert entry.phone is None
        assert entry.phone_emergency is None
        assert entry.sub_category is None
        assert entry.address is None
        assert entry.has_trauma is False
        assert entry.has_icu is False
        assert entry.is_24hr is True
        assert entry.source == "local_csv"

    def test_frozen(self):
        entry = LocalEmergencyEntry(id="1", name="Test", category="hospital", lat=13.0, lon=80.0)
        with pytest.raises(Exception):
            entry.name = "Changed"

    def test_full_construction(self):
        entry = LocalEmergencyEntry(
            id="2", name="Full", category="police", lat=12.0, lon=77.0,
            phone="123", phone_emergency="100", sub_category="general",
            address="Addr", has_trauma=True, has_icu=False, is_24hr=False,
            source="custom",
        )
        assert entry.phone == "123"
        assert entry.has_trauma is True
        assert entry.is_24hr is False
        assert entry.source == "custom"


class TestParseFloat:
    def test_valid_float(self):
        assert _parse_float("13.0827") == 13.0827

    def test_none_value(self):
        assert _parse_float(None) is None

    def test_empty_string(self):
        assert _parse_float("") is None

    def test_whitespace_only(self):
        assert _parse_float("  ") is None

    def test_invalid_string(self):
        assert _parse_float("not-a-number") is None

    def test_int_string(self):
        assert _parse_float("42") == 42.0


class TestParseCoordinatePair:
    def test_valid_pair(self):
        result = _parse_coordinate_pair("13.0827, 80.2707")
        assert result == (13.0827, 80.2707)

    def test_none_value(self):
        assert _parse_coordinate_pair(None) is None

    def test_empty_string(self):
        assert _parse_coordinate_pair("") is None

    def test_single_value(self):
        assert _parse_coordinate_pair("13.0827") is None

    def test_invalid_lat(self):
        assert _parse_coordinate_pair("abc, 80.2707") is None

    def test_invalid_lon(self):
        assert _parse_coordinate_pair("13.0827, abc") is None

    def test_extra_spaces(self):
        assert _parse_coordinate_pair("  13.0  ,  80.0  ") == (13.0, 80.0)

    def test_three_parts(self):
        assert _parse_coordinate_pair("13.0, 80.0, 100") == (13.0, 80.0)


class TestPickFirst:
    def test_first_match(self):
        row = {"a": "hello", "b": "world"}
        assert _pick_first(row, "a", "b") == "hello"

    def test_second_match(self):
        row = {"a": "", "b": "world"}
        assert _pick_first(row, "a", "b") == "world"

    def test_all_empty(self):
        row = {"a": "", "b": "  "}
        assert _pick_first(row, "a", "b") is None

    def test_missing_column(self):
        row = {"a": "val"}
        assert _pick_first(row, "missing", "a") == "val"

    def test_strips_value(self):
        row = {"a": "  hello  "}
        assert _pick_first(row, "a") == "hello"

    def test_none_value(self):
        row = {"a": None}
        assert _pick_first(row, "a", "b") is None


class TestParseBool:
    def test_true_values(self):
        for v in ("1", "true", "True", "yes", "YES", "y", "Y"):
            assert _parse_bool(v, default=False) is True

    def test_false_values(self):
        for v in ("0", "false", "False", "no", "NO", "n", "N"):
            assert _parse_bool(v, default=True) is False

    def test_none_returns_default_true(self):
        assert _parse_bool(None, default=True) is True

    def test_none_returns_default_false(self):
        assert _parse_bool(None, default=False) is False

    def test_empty_returns_default(self):
        assert _parse_bool("", default=True) is True

    def test_unknown_value_returns_default(self):
        assert _parse_bool("maybe", default=False) is False


class TestJoinAddress:
    def test_all_present(self):
        result = _join_address("Line1", "City", "State", "123")
        assert result == "Line1, City, State, 123"

    def test_some_none(self):
        result = _join_address("Line1", None, "State", None)
        assert result == "Line1, State"

    def test_all_none(self):
        assert _join_address(None, None) is None

    def test_empty_strings(self):
        assert _join_address("", "  ") is None

    def test_mixed_empty_and_value(self):
        assert _join_address("Main St", "", None, "City") == "Main St, City"


class TestContainsAny:
    def test_matches_first_keyword(self):
        assert _contains_any("has trauma center", keywords=("trauma", "icu")) is True

    def test_matches_second_keyword(self):
        assert _contains_any("has icu facility", keywords=("trauma", "icu")) is True

    def test_no_match(self):
        assert _contains_any("general ward", keywords=("trauma", "icu")) is False

    def test_multiple_haystacks(self):
        assert _contains_any("normal", "icu available", keywords=("icu",)) is True

    def test_case_insensitive(self):
        assert _contains_any("TRAUMA Center", keywords=("trauma",)) is True

    def test_all_none(self):
        assert _contains_any(None, None, keywords=("trauma",)) is False


class TestGuessCategory:
    def test_police(self):
        assert _guess_category(Path("/data/police_stations.csv")) == "police"

    def test_fire(self):
        assert _guess_category(Path("/data/fire_stations.csv")) == "fire"

    def test_ambulance(self):
        assert _guess_category(Path("/data/ambulance_services.csv")) == "ambulance"

    def test_towing(self):
        assert _guess_category(Path("/data/towing.csv")) == "towing"

    def test_pharmacy(self):
        assert _guess_category(Path("/data/pharmacy_list.csv")) == "pharmacy"

    def test_hospital(self):
        assert _guess_category(Path("/data/hospital_list.csv")) == "hospital"

    def test_unknown(self):
        assert _guess_category(Path("/data/unknown_data.csv")) is None

    def test_case_insensitive(self):
        assert _guess_category(Path("/data/Police.csv")) == "police"

    def test_no_extension(self):
        assert _guess_category(Path("/data/firestation")) == "fire"
        assert _guess_category(Path("/data/unrelated_data")) is None


class TestLoadHospitalDirectory:
    def test_missing_file_returns_empty(self):
        result = _load_hospital_directory(Path("/nonexistent/file.csv"))
        assert result == []

    def test_skips_rows_without_coordinates(self):
        csv_content = (
            "Hospital_Name,Location_Coordinates\n"
            "\"Test Hospital\",\"13.0, 80.0\"\n"
            "\"No Coords\",\n"
            "\"Valid Hosp\",\"14.0, 81.0\"\n"
        )
        p = _make_csv(csv_content, "hospitals.csv")
        result = _load_hospital_directory(p)
        assert len(result) == 2

    def test_skips_rows_without_name(self):
        csv_content = (
            "Hospital_Name,Location_Coordinates\n"
            "\"  \",\"13.0, 80.0\"\n"
            "\"Valid\",\"14.0, 81.0\"\n"
        )
        p = _make_csv(csv_content, "hospitals.csv")
        result = _load_hospital_directory(p)
        assert len(result) == 1
        assert result[0].name == "Valid"

    def test_populates_all_fields(self):
        csv_content = (
            "Hospital_Name,Location_Coordinates,Emergency_Num,Helpline,Hospital_Care_Type,"
            "Address_Original_First_Line,District,State,Pincode,Specialties,Facilities,Emergency_Services\n"
            "City Hospital,\"13.08, 80.27\",108,1800,General,Main St,Chennai,TN,600001,trauma,icu,24_hours\n"
        )
        p = _make_csv(csv_content, "hospitals.csv")
        result = _load_hospital_directory(p)
        assert len(result) == 1
        entry = result[0]
        assert entry.name == "City Hospital"
        assert entry.lat == 13.08
        assert entry.lon == 80.27
        assert entry.phone == "108"
        assert entry.phone_emergency == "108"
        assert entry.sub_category == "General"
        assert entry.has_trauma is True
        assert entry.has_icu is True
        assert entry.is_24hr is True
        assert entry.source == "local:hospital_directory"

    def test_error_during_reading_returns_empty(self):
        p = Path("/nonexistent/hospitals.csv")
        with patch.object(Path, "open", side_effect=OSError("Permission denied")):
            result = _load_hospital_directory(p)
        assert result == []


class TestLoadNinFacilities:
    def test_missing_file_returns_empty(self):
        result = _load_nin_facilities(Path("/nonexistent/file.csv"))
        assert result == []

    def test_skips_rows_without_lat_lon(self):
        csv_content = (
            "Health Facility Name,latitude,longitude\n"
            "Good Hospital,13.0,80.0\n"
            "No Lat,,80.0\n"
            "No Lon,13.0,\n"
            "Another Good,14.0,81.0\n"
        )
        p = _make_csv(csv_content, "nin.csv")
        result = _load_nin_facilities(p)
        assert len(result) == 2

    def test_skips_rows_without_name(self):
        csv_content = (
            "Health Facility Name,latitude,longitude\n"
            "  ,13.0,80.0\n"
            "Valid,14.0,81.0\n"
        )
        p = _make_csv(csv_content, "nin.csv")
        result = _load_nin_facilities(p)
        assert len(result) == 1
        assert result[0].name == "Valid"

    def test_populates_all_fields(self):
        csv_content = (
            "Health Facility Name,latitude,longitude,landline_number,Facility Type,"
            "Address,locality,District_Name,State_Name,pincode\n"
            "NIN Hospital,13.08,80.27,0441234,CHC,Street,Locality,District,State,600001\n"
        )
        p = _make_csv(csv_content, "nin.csv")
        result = _load_nin_facilities(p)
        assert len(result) == 1
        entry = result[0]
        assert entry.name == "NIN Hospital"
        assert entry.lat == 13.08
        assert entry.lon == 80.27
        assert entry.phone == "0441234"
        assert entry.sub_category == "CHC"
        assert entry.is_24hr is True
        assert entry.source == "local:nin_health_facilities"

    def test_error_during_reading_returns_empty(self):
        p = Path("/nonexistent/nin.csv")
        with patch.object(Path, "open", side_effect=OSError("Access denied")):
            result = _load_nin_facilities(p)
        assert result == []


class TestLoadGenericEmergencyCsv:
    def test_unknown_category_returns_empty(self):
        p = Path("/data/unknown.csv")
        result = _load_generic_emergency_csv(p)
        assert result == []

    def test_police_station_parsing(self):
        csv_content = (
            "name,phone,latitude,longitude\n"
            "Police HQ,100,13.08,80.27\n"
        )
        p = _make_csv(csv_content, "police_stations.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].category == "police"
        assert result[0].phone == "100"

    def test_fire_station_parsing(self):
        csv_content = (
            "station_name,telephone,lat,lon\n"
            "Fire Station,101,13.0,80.0\n"
        )
        p = _make_csv(csv_content, "fire_stations.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].category == "fire"
        assert result[0].phone == "101"

    def test_ambulance_parsing(self):
        csv_content = (
            "name,emergency_phone,latitude,longitude\n"
            "Ambulance Svc,108,13.0,80.0\n"
        )
        p = _make_csv(csv_content, "ambulance_services.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].category == "ambulance"
        assert result[0].phone_emergency == "108"

    def test_towing_parsing(self):
        csv_content = (
            "title,mobile,lat,lon\n"
            "Tow Truck,999,13.0,80.0\n"
        )
        p = _make_csv(csv_content, "towing.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].category == "towing"
        assert result[0].phone == "999"

    def test_coordinates_from_location_coordinates(self):
        csv_content = (
            "name,phone,coordinates\n"
            "Police HQ,100,\"13.08, 80.27\"\n"
        )
        p = _make_csv(csv_content, "police_stations.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].lat == 13.08
        assert result[0].lon == 80.27

    def test_skips_rows_without_coordinates(self):
        csv_content = (
            "name,phone,lat,lon\n"
            "Valid,100,13.0,80.0\n"
            "No Coords,,,\n"
        )
        p = _make_csv(csv_content, "police_stations.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1

    def test_skips_rows_without_name(self):
        csv_content = (
            "name,phone,lat,lon\n"
            "  ,100,13.0,80.0\n"
            "Valid,101,14.0,81.0\n"
        )
        p = _make_csv(csv_content, "police_stations.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].name == "Valid"

    def test_is_24hr_parsing(self):
        csv_content = (
            "name,phone,latitude,longitude,is_24hr\n"
            "24H Station,100,13.0,80.0,true\n"
            "Not24H Station,101,14.0,81.0,false\n"
        )
        p = _make_csv(csv_content, "police_stations.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 2
        assert result[0].is_24hr is True
        assert result[1].is_24hr is False

    def test_error_during_reading_returns_empty(self):
        p = Path("/data/police_stations.csv")
        with patch.object(Path, "open", side_effect=OSError("IO error")):
            result = _load_generic_emergency_csv(p)
        assert result == []

    def test_pharmacy_category(self):
        csv_content = (
            "name,phone,latitude,longitude\n"
            "Pharmacy,999,13.0,80.0\n"
        )
        p = _make_csv(csv_content, "pharmacy_list.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].category == "pharmacy"

    def test_hospital_generic_csv(self):
        csv_content = (
            "hospital_name,phone,lat,lon\n"
            "Gen Hospital,108,13.0,80.0\n"
        )
        p = _make_csv(csv_content, "hospital_data.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].category == "hospital"

    def test_missing_name_field_falls_back(self):
        csv_content = (
            "title,phone,lat,lon\n"
            "Fire HQ,101,13.0,80.0\n"
        )
        p = _make_csv(csv_content, "fire_stations.csv")
        result = _load_generic_emergency_csv(p)
        assert len(result) == 1
        assert result[0].name == "Fire HQ"


class TestLoadLocalEmergencyCatalog:
    def test_loads_all_sources(self, tmp_path):
        chatbot_data = tmp_path / "chatbot_service" / "data"
        hospitals_dir = chatbot_data / "hospitals"
        hospitals_dir.mkdir(parents=True)
        emergency_dir = chatbot_data / "emergency"
        emergency_dir.mkdir()

        _write_csv(hospitals_dir / "hospital_directory.csv", [
            "Hospital_Name,Location_Coordinates",
            "Test Hosp,\"13.08, 80.27\"",
        ])
        _write_csv(hospitals_dir / "nin-health-facilities.csv", [
            "Health Facility Name,latitude,longitude",
            "NIN Hosp,13.0,80.0",
        ])
        _write_csv(emergency_dir / "police_stations.csv", [
            "name,phone,lat,lon",
            "Police HQ,100,13.0,80.0",
        ])

        result = load_local_emergency_catalog(tmp_path)
        assert len(result) == 3
        names = {e.name for e in result}
        assert names == {"Test Hosp", "NIN Hosp", "Police HQ"}

    def test_skips_missing_emergency_dir(self, tmp_path):
        chatbot_data = tmp_path / "chatbot_service" / "data"
        hospitals_dir = chatbot_data / "hospitals"
        hospitals_dir.mkdir(parents=True)

        _write_csv(hospitals_dir / "hospital_directory.csv", [
            "Hospital_Name,Location_Coordinates",
            "Hosp,\"13.08, 80.27\"",
        ])

        result = load_local_emergency_catalog(tmp_path)
        assert len(result) == 1

    def test_empty_when_nothing_exists(self, tmp_path):
        result = load_local_emergency_catalog(tmp_path)
        assert result == []

    def test_loads_multiple_emergency_csvs(self, tmp_path):
        chatbot_data = tmp_path / "chatbot_service" / "data"
        hospitals_dir = chatbot_data / "hospitals"
        hospitals_dir.mkdir(parents=True)
        emergency_dir = chatbot_data / "emergency"
        emergency_dir.mkdir()

        _write_csv(hospitals_dir / "hospital_directory.csv", [
            "Hospital_Name,Location_Coordinates",
            "Hosp,\"13.0, 80.0\"",
        ])
        _write_csv(emergency_dir / "police_stations.csv", [
            "name,phone,lat,lon",
            "Police,100,13.0,80.0",
        ])
        _write_csv(emergency_dir / "fire_stations.csv", [
            "name,phone,lat,lon",
            "Fire,101,13.0,80.0",
        ])

        result = load_local_emergency_catalog(tmp_path)
        assert len(result) == 3
        cats = {e.category for e in result}
        assert cats == {"hospital", "police", "fire"}

    def test_hospital_directory_error_does_not_block_others(self, tmp_path):
        chatbot_data = tmp_path / "chatbot_service" / "data"
        hospital_dir = chatbot_data / "hospitals"
        hospital_dir.mkdir(parents=True)

        _write_csv(hospital_dir / "hospital_directory.csv", [
            "Hospital_Name,Location_Coordinates",
            "Hosp,\"13.0, 80.0\"",
        ])

        with patch("services.local_emergency_catalog._load_hospital_directory", return_value=[]):
            result = load_local_emergency_catalog(tmp_path)
        assert result == []

    def test_categorized_loading_respects_sort_order(self, tmp_path):
        chatbot_data = tmp_path / "chatbot_service" / "data"
        hospitals_dir = chatbot_data / "hospitals"
        hospitals_dir.mkdir(parents=True)
        emergency_dir = chatbot_data / "emergency"
        emergency_dir.mkdir()

        _write_csv(emergency_dir / "zzz_police.csv", [
            "name,phone,lat,lon",
            "Z Police,100,13.0,80.0",
        ])
        _write_csv(emergency_dir / "aaa_fire.csv", [
            "name,phone,lat,lon",
            "A Fire,101,13.0,80.0",
        ])

        result = load_local_emergency_catalog(tmp_path)
        assert len(result) == 2
        assert result[1].name == "Z Police"


def _make_csv(content: str, filename: str) -> Path:
    p = Path(f"/tmp/{filename}")
    p.write_text(content, encoding="utf-8")
    return p


def _write_csv(path: Path, lines: list[str]):
    path.write_text("\n".join(lines), encoding="utf-8")
