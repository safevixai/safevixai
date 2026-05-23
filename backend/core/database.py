from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import get_settings


SLOW_QUERY_THRESHOLD_MS = 500
logger = logging.getLogger('safevixai.database')


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = (
    {'prepared_statement_cache_size': 0}
    if settings.database_url.startswith('postgresql+asyncpg://')
    else {}
)

engine: AsyncEngine = create_async_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout_seconds,
    pool_recycle=settings.db_pool_recycle_seconds,
    future=True,
)


@event.listens_for(engine.sync_engine, 'before_cursor_execute')
def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn._query_start_time = time.monotonic()


@event.listens_for(engine.sync_engine, 'after_cursor_execute')
def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = (time.monotonic() - conn._query_start_time) * 1000
    if total > SLOW_QUERY_THRESHOLD_MS:
        logger.warning('SLOW QUERY (%.0fms) — %s', total, statement[:200])

# NOTE: Use `prepared_statement_cache_size=0` (not `statement_cache_size`) in
# the DATABASE_URL query string — that is the correct SQLAlchemy asyncpg
# dialect parameter for Supabase's transaction pooler.
engine: AsyncEngine = create_async_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout_seconds,
    pool_recycle=settings.db_pool_recycle_seconds,
    future=True,
    echo=settings.echo_queries if hasattr(settings, 'echo_queries') else False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


# Alias used by live_tracking and other routers
get_async_session = get_db


async def check_database() -> bool:
    if get_settings().environment == "test":
        return True
    try:
        async with engine.connect() as connection:
            await connection.execute(text('SELECT 1'))
        return True
    except Exception:
        return False
