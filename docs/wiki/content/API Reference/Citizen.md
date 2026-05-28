# Citizen

> Source: `backend/api/v1/citizen.py` | Generated: 2026-05-27

## Overview

Citizen Verification API for SafeVixAI.

## Classes

| Class | Description |
|---|---|
| `ConfirmRequest` | Confirmrequest |
| `RejectRequest` | Rejectrequest |
| `RatingRequest` | Ratingrequest |

## Key Functions

| Function | Description |
|---|---|
| `track_complaint()` | Track Complaint |
| `confirm_resolution()` | Confirm Resolution |
| `reject_resolution()` | Reject Resolution |
| `rate_resolution()` | Rate Resolution |
| `get_complaint_timeline()` | Get Complaint Timeline |

## Dependencies

- `__future__`
- `core`
- `fastapi`
- `logging`
- `models`
- `pydantic`
- `services`
- `sqlalchemy`
- `uuid`


## File Location

```
backend/api/v1/citizen.py
```
