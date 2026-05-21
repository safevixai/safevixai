import asyncio
from fastapi import APIRouter, Depends, Request, HTTPException

from models.schemas import ChatRequest, ChatResponse
from services.llm_service import LLMService
from core.security import get_current_user
from core.limiter import limiter
from core.config import get_settings


router = APIRouter(prefix='/api/v1/chat', tags=['Chat'])


def get_llm_service(request: Request) -> LLMService:
    return request.app.state.llm_service


def _get_fallback_response(request_message: str, session_id: str) -> ChatResponse:
    message = request_message.lower()
    if any(term in message for term in ('ambulance', 'hospital', 'accident', 'sos', 'emergency')):
        response = (
            'The live chatbot service is unavailable right now, so I am switching to a safe fallback. '
            'If this is urgent, call 112 immediately. You can also use the emergency locator to find '
            'nearby hospitals, police, or ambulances from the main app.'
        )
        intent = 'emergency'
        sources = ['fallback:emergency']
    elif any(term in message for term in ('fine', 'challan', 'section 185', 'helmet', 'seatbelt')):
        response = (
            'The live legal assistant is temporarily offline. You can still use the challan calculator '
            'endpoint for deterministic fine estimates while the chatbot service reconnects.'
        )
        intent = 'challan'
        sources = ['fallback:challan']
    else:
        response = (
            'The live chatbot service is warming up. Please try again in a moment, or use the dedicated '
            'emergency, challan, and road issue tools in the meantime.'
        )
        intent = 'fallback'
        sources = ['fallback:service']

    return ChatResponse(
        response=response,
        intent=intent,
        sources=sources,
        session_id=session_id,
    )


@router.post('/', response_model=ChatResponse)
@limiter.limit("5/minute")
async def chat(
    request: Request,
    payload: ChatRequest,
    llm_service: LLMService = Depends(get_llm_service),
    current_user: dict = Depends(get_current_user),
) -> ChatResponse:
    session_id = payload.session_id or "generated-session"
    settings = get_settings()
    timeout = 1.0 if settings.environment == 'test' else settings.chatbot_request_timeout_seconds
    try:
        return await asyncio.wait_for(
            llm_service.send_message(payload),
            timeout=timeout,
        )
    except Exception:
        return _get_fallback_response(payload.message, session_id)


@router.post('/stream')
async def chat_stream(
    request: Request,
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    raise HTTPException(status_code=501, detail="Streaming not implemented")
