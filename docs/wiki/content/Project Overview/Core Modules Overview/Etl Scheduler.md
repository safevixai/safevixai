# Etl Scheduler

> Source: `backend/services/civic_intel/etl_scheduler.py` | Generated: 2026-05-27

## Overview

ETL Scheduler — asyncio background loop for all civic intelligence pipelines.

## Classes

| Class | Description |
|---|---|
| `ETLScheduler` | Etlscheduler |

## Key Functions

| Function | Description |
|---|---|
| `start()` | Start |
| `stop()` | Stop |
| `run_pipeline()` | Run Pipeline |
| `get_status()` | Get Status |

## Dependencies

- `__future__`
- `asyncio`
- `core`
- `logging`
- `models`
- `services`
- `sqlalchemy`


## File Location

```
backend/services/civic_intel/etl_scheduler.py
```
