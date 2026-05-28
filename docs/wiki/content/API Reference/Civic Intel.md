# Civic Intel

> Source: `backend/api/v1/civic_intel.py` | Generated: 2026-05-27

## Overview

Civic Intelligence API — boundaries, LGD, features, grievances, municipalities.

## Key Functions

| Function | Description |
|---|---|
| `get_boundaries()` | Get Boundaries |
| `boundary_point_lookup()` | Boundary Point Lookup |
| `lgd_lookup()` | Lgd Lookup |
| `lgd_hierarchy()` | Lgd Hierarchy |
| `get_nearby_features()` | Get Nearby Features |
| `get_feature_heatmap()` | Get Feature Heatmap |
| `get_datasets()` | Get Datasets |
| `get_grievances()` | Get Grievances |
| `get_civic_stats()` | Get Civic Stats |
| `list_municipalities()` | List Municipalities |
| `nearby_municipality()` | Nearby Municipality |
| `get_municipality()` | Get Municipality |
| `get_municipality_stats()` | Get Municipality Stats |
| `get_municipality_wards()` | Get Municipality Wards |
| `trigger_ingest()` | Trigger Ingest |

## Dependencies

- `__future__`
- `core`
- `fastapi`
- `logging`
- `models`
- `sqlalchemy`


## File Location

```
backend/api/v1/civic_intel.py
```
