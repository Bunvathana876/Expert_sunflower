"""Structured logging configuration, secret redaction, and request correlation middleware.

In production (ENV == "production") logs are emitted as JSON so they can be
ingested by any log aggregator. In development a human-friendly ConsoleRenderer
is used instead.

All log events pass through `redact_sensitive_fields` before rendering so that
credentials, tokens, cookies, and database URLs with embedded passwords are
never written to stdout/stderr.
"""

from __future__ import annotations

import re
import time
import uuid
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

if TYPE_CHECKING:
    from app.core.config import Settings

log = structlog.get_logger(__name__)

REDACTED = "[REDACTED]"

_SAFE_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
_DSN_CREDENTIAL_RE = re.compile(r"([a-zA-Z][a-zA-Z0-9+.-]*://)([^/\s:@]+:[^@\s]+)@")
_BEARER_TOKEN_RE = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9\-._~+/]+=*")

_SAFE_KEY_ALLOWLIST: frozenset[str] = frozenset(
    {
        "token_type",
        "deleted_refresh_tokens",
        "expired_refresh_tokens",
        "revoked_refresh_tokens",
        "token_retention_hours",
        "refresh_token_retention_hours",
        "expired_token_grace_hours",
    }
)

_SENSITIVE_KEY_EXACT: frozenset[str] = frozenset(
    {
        "password",
        "password_hash",
        "current_password",
        "new_password",
        "admin_password",
        "postgres_password",
        "pgadmin_default_password",
        "passwd",
        "secret",
        "jwt_secret",
        "token",
        "access_token",
        "refresh_token",
        "confirmation_token",
        "csrf_token",
        "x_csrf_token",
        "x-csrf-token",
        "authorization",
        "cookie",
        "cookies",
        "set_cookie",
        "set-cookie",
        "database_url",
        "alembic_database_url",
        "dsn",
        "api_key",
        "apikey",
        "private_key",
    }
)

_SENSITIVE_KEY_SUFFIXES: tuple[str, ...] = (
    "_password",
    "_secret",
    "_token",
    "_api_key",
    "_private_key",
    "_dsn",
)


def _is_sensitive_key(key: str) -> bool:
    lowered = key.strip().lower()
    if lowered in _SAFE_KEY_ALLOWLIST:
        return False
    if lowered in _SENSITIVE_KEY_EXACT:
        return True
    return lowered.endswith(_SENSITIVE_KEY_SUFFIXES)


def sanitize_log_text(text_val: str) -> str:
    """Scrub embedded DSN credentials and Bearer tokens from free-form strings."""
    cleaned = _DSN_CREDENTIAL_RE.sub(rf"\1{REDACTED}@", text_val)
    return _BEARER_TOKEN_RE.sub(f"Bearer {REDACTED}", cleaned)


def _scrub_value(value: Any) -> Any:
    if isinstance(value, str):
        return sanitize_log_text(value)
    if isinstance(value, Mapping):
        return {
            k: (REDACTED if _is_sensitive_key(str(k)) else _scrub_value(v))
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [_scrub_value(item) for item in value]
    if isinstance(value, tuple):
        return tuple(_scrub_value(item) for item in value)
    return value


def redact_sensitive_fields(
    _logger: Any,
    _method_name: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    """Structlog processor that redacts secrets, tokens, cookies, and DSN passwords."""
    for key in list(event_dict.keys()):
        if _is_sensitive_key(str(key)):
            event_dict[key] = REDACTED
        else:
            event_dict[key] = _scrub_value(event_dict[key])
    return event_dict


def configure_logging(settings: Settings) -> None:
    """Initialise structlog once at application startup."""
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        redact_sensitive_fields,
    ]

    if settings.is_production:
        renderer: structlog.types.Processor = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            renderer,
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.BoundLogger,
        cache_logger_on_first_use=True,
    )


def _resolve_request_id(request: Request) -> str:
    incoming = request.headers.get("x-request-id", "").strip()
    if incoming and _SAFE_REQUEST_ID_RE.match(incoming):
        return incoming
    return str(uuid.uuid4())


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a correlation request-id and emit structured request timing telemetry."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = _resolve_request_id(request)
        request.state.request_id = request_id

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            http_method=request.method,
            http_path=request.url.path,
        )

        started = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)

        response.headers["X-Request-Id"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        # Security event alerts for authentication failures, authorization blocks, and rate limits
        if response.status_code == 401:
            log.warning(
                "security.event.unauthorized",
                status_code=401,
                path=request.url.path,
                duration_ms=duration_ms,
            )
        elif response.status_code == 403:
            log.warning(
                "security.event.forbidden",
                status_code=403,
                path=request.url.path,
                duration_ms=duration_ms,
            )
        elif response.status_code == 429:
            log.warning(
                "security.event.rate_limited",
                status_code=429,
                path=request.url.path,
                duration_ms=duration_ms,
            )

        if response.status_code >= 500:
            log.error(
                "http.request.completed",
                status_code=response.status_code,
                duration_ms=duration_ms,
            )
        elif not request.url.path.startswith("/health"):
            log.info(
                "http.request.completed",
                status_code=response.status_code,
                duration_ms=duration_ms,
            )

        return response
