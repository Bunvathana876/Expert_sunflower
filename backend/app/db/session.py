"""Async SQLAlchemy engine, session factory, and FastAPI dependency.

Design decisions:
- expire_on_commit=False so that returned ORM objects remain accessible after
  the session commits (avoids lazy-load errors in serialisers).
- get_db() rolls back on any exception so a failed request never leaves a
  half-committed transaction open.
- The engine is created once at import time from the cached settings; tests
  override it via dependency injection.
"""

from __future__ import annotations

import ssl
from collections.abc import AsyncGenerator
from typing import Any

import structlog
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import QueuePool

from app.core.config import get_settings

log = structlog.get_logger(__name__)

_settings = get_settings()


def prepare_async_database_url_and_args(raw_url: str) -> tuple[str, dict[str, Any]]:
    """Normalize database connection string and configure driver arguments.

    Supports:
    - Standard cloud PostgreSQL URLs (postgres://, postgresql://) converted to postgresql+asyncpg://
    - Supabase / Neon / PgBouncer poolers (statement_cache_size=0 or prepare_threshold=None)
    - SSL modes (require, verify-ca, verify-full) properly translated for asyncpg and psycopg
    """
    if not raw_url:
        return raw_url, {}

    normalized_raw = raw_url
    if normalized_raw.startswith("postgres://"):
        normalized_raw = "postgresql+asyncpg://" + normalized_raw[len("postgres://") :]
    elif normalized_raw.startswith("postgresql://"):
        normalized_raw = "postgresql+asyncpg://" + normalized_raw[len("postgresql://") :]

    url = make_url(normalized_raw)
    connect_args: dict[str, Any] = {}
    query = dict(url.query)

    is_asyncpg = "asyncpg" in url.drivername
    is_psycopg = "psycopg" in url.drivername

    sslmode_val = query.pop("sslmode", None)
    sslmode = (
        sslmode_val
        if isinstance(sslmode_val, str)
        else (sslmode_val[0] if sslmode_val else None)
    )
    sslrootcert_val = query.pop("sslrootcert", None)
    sslrootcert = (
        sslrootcert_val
        if isinstance(sslrootcert_val, str)
        else (sslrootcert_val[0] if sslrootcert_val else None)
    )

    is_pooler = (
        "pooler" in (url.host or "").lower()
        or query.pop("pgbouncer", None) in ("true", "1")
    )

    if is_asyncpg:
        # asyncpg does not accept sslmode query parameter; convert to SSLContext / boolean
        if is_pooler:
            connect_args["statement_cache_size"] = 0
        if sslmode in ("require", "prefer", "verify-ca", "verify-full"):
            if sslrootcert:
                ctx = ssl.create_default_context(cafile=sslrootcert)
                if sslmode == "verify-full":
                    ctx.check_hostname = True
                    ctx.verify_mode = ssl.CERT_REQUIRED
                else:
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_REQUIRED
                connect_args["ssl"] = ctx
            elif sslmode in ("require", "prefer"):
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                connect_args["ssl"] = ctx
            else:
                ctx = ssl.create_default_context()
                if sslmode == "verify-full":
                    ctx.check_hostname = True
                    ctx.verify_mode = ssl.CERT_REQUIRED
                else:
                    ctx.check_hostname = False
                    ctx.verify_mode = ssl.CERT_REQUIRED
                connect_args["ssl"] = ctx
        elif sslmode in ("disable", "allow"):
            connect_args["ssl"] = False
    elif is_psycopg:
        if is_pooler:
            connect_args["prepare_threshold"] = None
        if sslmode:
            query["sslmode"] = sslmode
        if sslrootcert:
            query["sslrootcert"] = sslrootcert

    clean_url = url.set(query=query).render_as_string(hide_password=False)
    return clean_url, connect_args


_engine_url, connect_args = prepare_async_database_url_and_args(_settings.DATABASE_URL)

engine: AsyncEngine = create_async_engine(
    _engine_url,
    pool_pre_ping=True,
    echo=not _settings.is_production,
    connect_args=connect_args,
)

async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


def get_pool_status() -> dict[str, int]:
    """Inspect current SQLAlchemy connection pool metrics."""
    pool = engine.pool
    if isinstance(pool, QueuePool):
        return {
            "size": int(pool.size()),
            "checked_in": int(pool.checkedin()),
            "checked_out": int(pool.checkedout()),
            "overflow": int(pool.overflow()),
        }
    return {"size": 0, "checked_in": 0, "checked_out": 0, "overflow": 0}


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a transactional AsyncSession.

    Rolls back on any exception; always closes in the finally block.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
