# Streetlight Service

> Source: `backend/services/streetlight_service.py` | Generated: 2026-05-27

## Overview

Streetlight asset management service.

## Classes

| Class | Description |
|---|---|
| `StreetlightService` | Streetlightservice |

## Key Functions

| Function | Description |
|---|---|
| `generate_pole_qr()` | Generate Pole Qr |
| `lookup_by_qr()` | Lookup By Qr |
| `lookup_by_pole_id()` | Lookup By Pole Id |
| `find_nearby()` | Find Nearby |
| `report_outage()` | Report Outage |
| `mark_repaired()` | Mark Repaired |
| `predict_maintenance()` | Predict Maintenance |
| `get_city_stats()` | Get City Stats |

## Dependencies

- `__future__`
- `geoalchemy2`
- `hashlib`
- `logging`
- `models`
- `sqlalchemy`
- `uuid`


## File Location

```
backend/services/streetlight_service.py
```
