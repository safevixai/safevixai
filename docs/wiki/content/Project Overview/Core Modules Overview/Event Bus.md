# Event Bus

> Source: `backend/services/event_bus.py` | Generated: 2026-05-27

## Overview

Enterprise Event Bus for SafeVixAI.

## Classes

| Class | Description |
|---|---|
| `DomainEvent` | Domainevent |
| `EventBus` | Eventbus |
| `RedisPubSubAdapter` | Redispubsubadapter |

## Key Functions

| Function | Description |
|---|---|
| `get_event_bus()` | Get Event Bus |
| `reset_event_bus()` | Reset Event Bus |
| `to_dict()` | To Dict |
| `to_json()` | To Json |
| `create()` | Create |
| `subscribe()` | Subscribe |
| `unsubscribe()` | Unsubscribe |
| `publish()` | Publish |
| `get_recent_events()` | Get Recent Events |
| `get_metrics()` | Get Metrics |
| `get_dead_letters()` | Get Dead Letters |
| `set_redis_adapter()` | Set Redis Adapter |
| `publish()` | Publish |

## Dependencies

- `__future__`
- `asyncio`
- `collections`
- `dataclasses`
- `logging`
- `time`
- `uuid`


## File Location

```
backend/services/event_bus.py
```
