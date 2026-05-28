# Base Ingestor

> Source: `backend/services/civic_intel/base_ingestor.py` | Generated: 2026-05-27

## Overview

Abstract base class for all civic intelligence ETL ingestors.

## Classes

| Class | Description |
|---|---|
| `BaseIngestor` | Baseingestor |

## Key Functions

| Function | Description |
|---|---|
| `name()` | Name |
| `fetch()` | Fetch |
| `transform()` | Transform |
| `load()` | Load |
| `run()` | Run |

## Dependencies

- `__future__`
- `abc`
- `core`
- `httpx`
- `logging`
- `models`
- `sqlalchemy`
- `time`


## File Location

```
backend/services/civic_intel/base_ingestor.py
```
