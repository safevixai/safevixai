# c:\Hackathons\IITM\SafeVixAI\backend\core\i18n_middleware.py

import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from i18n.locales import translate_message

logger = logging.getLogger("safevixai.backend.i18n")

SUPPORTED_LOCALES = ["en", "hi", "ta", "te", "kn", "ml", "mr", "gu", "bn", "pa", "ur", "ar", "es", "fr"]
DEFAULT_LOCALE = "en"

def get_locale_from_request(request: Request) -> str:
    """Extracts preferred locale from Cookie or Accept-Language header."""
    # 1. Cookie check
    cookie_locale = request.cookies.get("svai-locale")
    if cookie_locale in SUPPORTED_LOCALES:
        return cookie_locale
    
    # 2. Header check
    accept_lang = request.headers.get("accept-language")
    if accept_lang:
        matched = accept_lang.split(",")[0].split(";")[0].trim().substring(0, 2) if hasattr("", "trim") else accept_lang.split(",")[0].split(";")[0].strip()[:2]
        if matched in SUPPORTED_LOCALES:
            return matched
            
    return DEFAULT_LOCALE

async def i18n_middleware(request: Request, call_next):
    """Saves the detected locale into request state for downstream lookup."""
    locale = get_locale_from_request(request)
    request.state.locale = locale
    
    # Sync with request headers so downstreams can read it natively
    response = await call_next(request)
    return response

async def localized_http_exception_handler(request: Request, exc: HTTPException):
    """Localizes HTTPException details based on request locale."""
    locale = getattr(request.state, "locale", DEFAULT_LOCALE)
    detail = exc.detail
    
    if isinstance(detail, str):
        translated_detail = translate_message(detail, locale)
    else:
        translated_detail = detail
        
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": translated_detail},
        headers=exc.headers
    )

async def localized_validation_exception_handler(request: Request, exc: RequestValidationError):
    """Localizes Pydantic schema validation errors."""
    locale = getattr(request.state, "locale", DEFAULT_LOCALE)
    errors = exc.errors()
    
    localized_errors = []
    for err in errors:
        msg = err.get("msg", "")
        # Common Pydantic messages translation
        translated_msg = msg
        if "field required" in msg:
            translated_msg = "यह फ़ील्ड आवश्यक है" if locale == "hi" else \
                             "இந்த புலம் தேவை" if locale == "ta" else \
                             "هذا الحقل مطلوب" if locale == "ar" else \
                             "Este campo es requerido" if locale == "es" else \
                             "Ce champ est requis" if locale == "fr" else \
                             "Field required"
        elif "value is not a valid email" in msg:
            translated_msg = "अमान्य ईमेल पता" if locale == "hi" else \
                             "தவறான மின்னஞ்சல் முகவரி" if locale == "ta" else \
                             "عنوان بريد إلكتروني غير صالح" if locale == "ar" else \
                             "Correo electrónico inválido" if locale == "es" else \
                             "Adresse e-mail invalide" if locale == "fr" else \
                             "Invalid email address"
                             
        localized_err = dict(err)
        localized_err["msg"] = translated_msg
        localized_errors.append(localized_err)
        
    return JSONResponse(
        status_code=422,
        content={"detail": localized_errors}
    )

async def localized_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Localizes RateLimitExceeded exceptions."""
    locale = getattr(request.state, "locale", DEFAULT_LOCALE)
    msg = translate_message("Rate limit exceeded", locale)
    return JSONResponse(
        status_code=429,
        content={"detail": msg}
    )

def setup_backend_i18n(app: FastAPI):
    """Registers i18n middleware and custom exception handlers on the FastAPI application."""
    app.middleware("http")(i18n_middleware)
    app.add_exception_handler(HTTPException, localized_http_exception_handler)
    app.add_exception_handler(RequestValidationError, localized_validation_exception_handler)
    app.add_exception_handler(RateLimitExceeded, localized_rate_limit_exceeded_handler)
    logger.info("✅ Multi-language backend exception localization system successfully mounted.")
