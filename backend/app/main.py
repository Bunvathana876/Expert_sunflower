"""FastAPI application factory.

Call create_app() to get a configured FastAPI instance. The module-level
`app` symbol is what uvicorn imports.

Startup order:
  1. Load settings (fails loudly if required secrets are missing).
  2. Configure structlog with secret/credential redaction.
  3. Build FastAPI with hardened CORS, security headers, exception handlers,
     and request-id correlation middleware.
  4. Register liveness/readiness probes (/health, /health/live, /health/ready).
  5. Mount /media and /api/v1 router.
"""

from __future__ import annotations

import contextlib
import hmac
from pathlib import Path
from typing import Annotated, Any

import structlog
from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.csrf import CSRF_HEADER_NAME, resolve_trusted_origins
from app.core.deps import get_db
from app.core.errors import (
    AppError,
    ForbiddenError,
    app_error_handler,
    unhandled_exception_handler,
    validation_error_handler,
)
from app.core.logging import RequestIdMiddleware, configure_logging
from app.core.rate_limit import get_client_ip, is_trusted_ip
from app.core.security_headers import SecurityHeadersMiddleware
from app.db.session import get_pool_status

log = structlog.get_logger(__name__)

APP_VERSION = "0.1.0"


async def _inspect_db_and_migration(
    db: AsyncSession,
    required_revision: str,
) -> tuple[str, str]:
    """Verify database connectivity and expected Alembic schema revision safely.

    Never logs or returns database URLs, credentials, hostnames, or raw SQL errors.
    """
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        with contextlib.suppress(Exception):
            await db.rollback()
        log.warning("health.db_ping_failed", error_type=type(exc).__name__)
        return "down", "unknown"

    try:
        res = await db.execute(text("SELECT version_num FROM alembic_version LIMIT 2"))
        versions = [str(row[0]) for row in res.fetchall()]
    except Exception:
        with contextlib.suppress(Exception):
            await db.rollback()
        return "up", "uninitialized"

    if versions == [required_revision]:
        return "up", "ok"

    log.warning(
        "health.migration_mismatch",
        expected_revision=required_revision,
        found_count=len(versions),
    )
    return "up", "mismatch"


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    application = FastAPI(
        title="Sunflower Diagnosis API",
        version=APP_VERSION,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    # --- Security headers & Request-id correlation ---
    application.add_middleware(SecurityHeadersMiddleware)
    application.add_middleware(RequestIdMiddleware)

    # --- Hardened CORS (outermost middleware; wildcard '*' rejected) ---
    cors_origins = resolve_trusted_origins(settings)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "Accept-Language",
            CSRF_HEADER_NAME,
            "X-Request-Id",
        ],
        expose_headers=["X-Request-Id", "Retry-After", CSRF_HEADER_NAME],
    )

    # --- Exception handlers ---
    application.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    application.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
    application.add_exception_handler(Exception, unhandled_exception_handler)

    # --- Root endpoint ---
    @application.get("/", tags=["ops"], include_in_schema=False)
    async def root() -> dict[str, str]:
        """Root API information."""
        info: dict[str, str] = {
            "name": "Sunflower Diagnosis API",
            "version": APP_VERSION,
            "health": "/health",
            "ready": "/health/ready",
            "api_v1": "/api/v1",
        }
        if not settings.is_production:
            info["docs"] = "/docs"
        return info

    # --- Liveness probe ---
    @application.get("/health/live", tags=["ops"])
    async def health_live() -> dict[str, str]:
        """Lightweight process liveness probe."""
        return {"status": "ok", "version": APP_VERSION}

    # --- Backward-compatible health summary ---
    @application.get("/health", tags=["ops"])
    async def health(
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> dict[str, str]:
        """Health summary probe (always HTTP 200; inspect `db` and `migration` fields)."""
        db_status, migration_status = await _inspect_db_and_migration(
            db,
            settings.REQUIRED_ALEMBIC_REVISION,
        )
        return {
            "status": "ok",
            "version": APP_VERSION,
            "db": db_status,
            "migration": migration_status,
        }

    # --- Strict readiness probe (DB + Alembic head verification) ---
    @application.get("/health/ready", tags=["ops"], response_model=None)
    async def health_ready(
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> JSONResponse:
        """Readiness probe verifying PostgreSQL connectivity and Alembic revision."""
        required_rev = settings.REQUIRED_ALEMBIC_REVISION
        db_status, migration_status = await _inspect_db_and_migration(db, required_rev)
        is_ready = db_status == "up" and migration_status == "ok"
        payload = {
            "status": "ready" if is_ready else "not_ready",
            "version": APP_VERSION,
            "db": db_status,
            "migration": migration_status,
            "required_revision": required_rev,
        }
        return JSONResponse(
            status_code=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload,
        )

    # --- Operational metrics probe ---
    @application.get("/health/metrics", tags=["ops"])
    async def health_metrics(
        request: Request,
        db: Annotated[AsyncSession, Depends(get_db)],
    ) -> dict[str, Any]:
        """Operational telemetry and connection pool metrics.

        Protected in production: requires X-Metrics-Key matching METRICS_SECRET_KEY,
        or request originating from loopback / trusted proxy clients.
        """
        client_ip = get_client_ip(request)
        is_loopback = client_ip in ("127.0.0.1", "::1", "localhost", "testclient")

        if settings.METRICS_SECRET_KEY:
            client_key = request.headers.get("X-Metrics-Key", "")
            if not hmac.compare_digest(client_key, settings.METRICS_SECRET_KEY):
                raise ForbiddenError(detail="Invalid or missing metrics access key")
        elif settings.is_production:
            if not (is_loopback or is_trusted_ip(client_ip)):
                raise ForbiddenError(detail="Metrics access restricted in production")
        elif not is_loopback:
            raise ForbiddenError(detail="Metrics access restricted: authentication required")

        db_status, migration_status = await _inspect_db_and_migration(
            db,
            settings.REQUIRED_ALEMBIC_REVISION,
        )
        return {
            "version": APP_VERSION,
            "environment": settings.ENV,
            "db": db_status,
            "migration": migration_status,
            "db_pool": get_pool_status(),
            "rate_limiting_enabled": settings.RATE_LIMIT_ENABLED,
        }

    # --- Static media files (when local backend) ---
    try:
        media_path = Path(settings.MEDIA_ROOT)
        media_path.mkdir(parents=True, exist_ok=True)
        application.mount(
            "/media",
            StaticFiles(directory=settings.MEDIA_ROOT, check_dir=False),
            name="media",
        )
    except OSError as exc:
        log.warning("media.mount_skipped", error_type=type(exc).__name__)

    # --- API v1 router ---
    from app.api.v1 import router as api_v1_router

    application.include_router(api_v1_router, prefix="/api/v1")

    return application


app = create_app()
