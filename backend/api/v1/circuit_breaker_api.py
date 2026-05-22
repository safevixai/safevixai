from __future__ import annotations

from fastapi import APIRouter, HTTPException

from core.circuit_breaker import CircuitBreakerOpenError, CircuitBreakerRegistry


router = APIRouter(prefix="/api/v1/circuit-breaker", tags=["Circuit Breaker"])


@router.get("/")
async def get_circuit_breakers() -> dict:
    stats = CircuitBreakerRegistry.all_stats()
    return {"breakers": stats, "count": len(stats)}


@router.get("/{name}")
async def get_circuit_breaker(name: str) -> dict:
    stats = CircuitBreakerRegistry.all_stats()
    if name not in stats:
        raise HTTPException(status_code=404, detail=f"Circuit breaker '{name}' not found")
    return {"breaker": stats[name]}


@router.post("/reset")
async def reset_circuit_breakers() -> dict:
    CircuitBreakerRegistry.reset_all()
    return {"status": "ok", "message": "All circuit breakers reset"}


@router.post("/trigger/{name}")
async def trigger_breaker(name: str) -> dict:
    cb = CircuitBreakerRegistry._breakers.get(name)
    if cb is None:
        raise HTTPException(status_code=404, detail=f"Circuit breaker '{name}' not found")
    cb.force_open()
    return {"status": "ok", "message": f"Circuit breaker '{name}' opened manually"}


@router.post("/close/{name}")
async def close_breaker(name: str) -> dict:
    cb = CircuitBreakerRegistry._breakers.get(name)
    if cb is None:
        raise HTTPException(status_code=404, detail=f"Circuit breaker '{name}' not found")
    cb.force_close()
    return {"status": "ok", "message": f"Circuit breaker '{name}' closed manually"}
