# Complaint State Machine

> Source: `backend/services/complaint_state_machine.py` | Generated: 2026-05-27

## Overview

Complaint State Machine for SafeVixAI.

## Classes

| Class | Description |
|---|---|
| `InvalidTransitionError` | Invalidtransitionerror |
| `TransitionResult` | Transitionresult |
| `ComplaintStateMachine` | Complaintstatemachine |

## Key Functions

| Function | Description |
|---|---|
| `can_transition()` | Can Transition |
| `get_allowed_transitions()` | Get Allowed Transitions |
| `transition()` | Transition |
| `escalate()` | Escalate |

## Dependencies

- `__future__`
- `dataclasses`
- `logging`
- `models`
- `services`
- `sqlalchemy`
- `uuid`


## File Location

```
backend/services/complaint_state_machine.py
```
