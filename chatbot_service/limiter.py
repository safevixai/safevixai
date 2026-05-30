try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    import logging
    logging.getLogger(__name__).warning("slowapi not installed — rate limiting disabled")
    # No-op limiter so @limiter.limit(...) decorators don't crash
    class _NoopLimiter:
        def limit(self, *_, **__):
            def decorator(func):
                return func
            return decorator
    limiter = _NoopLimiter()

__all__ = ['limiter']
