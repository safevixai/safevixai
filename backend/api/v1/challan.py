from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.limiter import limiter
from models.schemas import ChallanQuery, ChallanResponse
from services.challan_service import ChallanService
from services.exceptions import ExternalServiceError, ServiceValidationError


router = APIRouter(prefix='/api/v1/challan', tags=['Challan'])


def get_challan_service(request: Request) -> ChallanService:
    return request.app.state.challan_service


@router.post('/calculate', response_model=ChallanResponse)
@limiter.limit("20/minute")
async def calculate_challan(
    request: Request,
    payload: ChallanQuery,
    db: AsyncSession = Depends(get_db),
    challan_service: ChallanService = Depends(get_challan_service),
) -> ChallanResponse:
    """
    Calculate high-fidelity traffic challan fines and legal compliance requirements.

    Determines exact violation fines, penalty points, vehicle impound thresholds, 
    and legal provisions based on India Motor Vehicles Act parameters.

    Args:
        request: The FastAPI request instance.
        payload: ChallanQuery containing state, vehicle type, speed, and violations.
        db: Database session injection.
        challan_service: Unified challan calculation engine layer.

    Returns:
        ChallanResponse containing itemized fine totals, legal sections, and instructions.

    Raises:
        HTTPException (503): When external database or reference rate layers fail.
        HTTPException (422): When query parameters violate compliance boundaries.
    """
    try:
        return await challan_service.calculate_with_db(payload, db=db)
    except ExternalServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ServiceValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
