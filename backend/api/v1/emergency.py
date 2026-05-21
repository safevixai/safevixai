from __future__ import annotations

import time
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.limiter import limiter
from core.security import get_current_user_optional
from core.metrics import (
    sos_dispatch_total,
    sos_response_time,
    emergency_lookup_total,
    emergency_lookup_time,
    emergency_services_found,
)
from models.schemas import EmergencyNumbersResponse, EmergencyResponse, SosResponse
from models.sos_incident import SosIncident
from services.emergency_locator import EMERGENCY_NUMBERS, EmergencyLocatorService
from services.exceptions import ExternalServiceError


router = APIRouter(prefix='/api/v1/emergency', tags=['Emergency'])


def get_emergency_service(request: Request) -> EmergencyLocatorService:
    return request.app.state.emergency_service


@router.get('/nearby', response_model=EmergencyResponse)
@limiter.limit("30/minute")
async def get_nearby_services(
    request: Request,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    categories: str | None = Query(default=None, description='Comma-separated emergency categories'),
    radius: int | None = Query(default=None, ge=100, le=50000),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    emergency_service: EmergencyLocatorService = Depends(get_emergency_service),
) -> EmergencyResponse:
    try:
        return await emergency_service.find_nearby(
            db=db,
            lat=lat,
            lon=lon,
            categories=categories,
            radius=radius,
            limit=limit,
            offset=offset,
        )
    except ExternalServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get('/sos', response_model=SosResponse)
async def get_sos_payload(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    db: AsyncSession = Depends(get_db),
    emergency_service: EmergencyLocatorService = Depends(get_emergency_service),
) -> SosResponse:
    try:
        return await emergency_service.build_sos_payload(db=db, lat=lat, lon=lon)
    except ExternalServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post('/sos', response_model=SosResponse)
@limiter.limit("10/minute")
async def create_sos_incident(
    request: Request,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    db: AsyncSession = Depends(get_db),
    emergency_service: EmergencyLocatorService = Depends(get_emergency_service),
    current_user: dict | None = Depends(get_current_user_optional),
) -> SosResponse:
    start = time.monotonic()
    try:
        incident = SosIncident(
            user_id=str(current_user["sub"]) if current_user else None,
            lat=lat,
            lon=lon,
            user_agent=request.headers.get('user-agent', '')[:255],
        )
        db.add(incident)
        await db.commit()
        
        result = await emergency_service.build_sos_payload(db=db, lat=lat, lon=lon)
        
        # Record SOS metrics
        duration = time.monotonic() - start
        sos_response_time.observe(duration)
        sos_dispatch_total.labels(status="success", mode="online").inc()
        
        # Record emergency lookup metrics
        emergency_lookup_total.labels(
            service_type="all",
            source="overpass",
        ).inc()
        emergency_lookup_time.labels(service_type="all").observe(duration)
        
        # Record services found
        if hasattr(result, 'count'):
            emergency_services_found.labels(
                service_type="all",
                radius_meters=5000,
            ).set(result.count)
        
        return result
    except ExternalServiceError as exc:
        sos_dispatch_total.labels(status="failed", mode="online").inc()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        await db.rollback()
        sos_dispatch_total.labels(status="failed", mode="online").inc()
        raise HTTPException(status_code=503, detail="Unable to record SOS incident") from exc


@router.get('/numbers', response_model=EmergencyNumbersResponse)
async def get_emergency_numbers() -> EmergencyNumbersResponse:
    return EMERGENCY_NUMBERS


@router.get('/safe-spaces')
async def safe_spaces(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius: int = Query(default=1000, ge=100, le=50000),
):
    """Returns nearby safe public spaces for women safety use case."""
    from services.safe_spaces import get_safe_spaces
    return await get_safe_spaces(lat, lon, radius)
