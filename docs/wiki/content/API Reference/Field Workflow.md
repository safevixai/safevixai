# Field Workflow

> Source: `backend/api/v1/field_workflow.py` | Generated: 2026-05-27

## Overview

Field Workflow API for SafeVixAI.

## Classes

| Class | Description |
|---|---|
| `StartWorkRequest` | Startworkrequest |
| `CompleteWorkRequest` | Completeworkrequest |
| `GeoCheckinRequest` | Geocheckinrequest |
| `EvidenceUploadResponse` | Evidenceuploadresponse |

## Key Functions

| Function | Description |
|---|---|
| `start_field_work()` | Start Field Work |
| `complete_field_work()` | Complete Field Work |
| `geo_checkin_at_complaint()` | Geo Checkin At Complaint |
| `get_optimized_route()` | Get Optimized Route |

## Dependencies

- `__future__`
- `core`
- `fastapi`
- `logging`
- `math`
- `models`
- `pydantic`
- `services`
- `sqlalchemy`
- `uuid`


## File Location

```
backend/api/v1/field_workflow.py
```
