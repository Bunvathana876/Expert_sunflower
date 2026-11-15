"""Application error hierarchy and FastAPI exception handlers.

Every error renders as application/problem+json:
  { type, title, status, detail, errors: [{ field, message }] }

This matches the contract in docs/ARCHITECTURE.md § Conventions.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import structlog
from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import sanitize_log_text

log = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Error hierarchy
# ---------------------------------------------------------------------------


class AppError(Exception):
    """Base for all application-level errors.

    Subclass this, set ``status`` and ``title``, and raise. The exception
    handler below converts it to a problem+json response.
    """

    status: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    title: str = "Internal Server Error"
    type_uri: str = "about:blank"

    def __init__(
        self,
        detail: str = "",
        errors: Sequence[dict[str, Any]] | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.errors: list[dict[str, Any]] = list(errors) if errors else []
        self.headers: dict[str, str] | None = dict(headers) if headers else None


class NotFoundError(AppError):
    status = status.HTTP_404_NOT_FOUND
    title = "Not Found"
    type_uri = "/errors/not-found"


class ConflictError(AppError):
    status = status.HTTP_409_CONFLICT
    title = "Conflict"
    type_uri = "/errors/conflict"


class BadRequestError(AppError):
    status = status.HTTP_400_BAD_REQUEST
    title = "Bad Request"
    type_uri = "/errors/bad-request"


class ForbiddenError(AppError):
    status = status.HTTP_403_FORBIDDEN
    title = "Forbidden"
    type_uri = "/errors/forbidden"


class UnauthorizedError(AppError):
    status = status.HTTP_401_UNAUTHORIZED
    title = "Unauthorized"
    type_uri = "/errors/unauthorized"


class ValidationFailedError(AppError):
    status = status.HTTP_422_UNPROCESSABLE_CONTENT
    title = "Validation Failed"
    type_uri = "/errors/validation-failed"


class ServiceUnavailableError(AppError):
    status = status.HTTP_503_SERVICE_UNAVAILABLE
    title = "Service Unavailable"
    type_uri = "/errors/service-unavailable"


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


def _problem_response(
    status_code: int,
    type_uri: str,
    title: str,
    detail: str,
    errors: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": type_uri,
        "title": title,
        "status": status_code,
        "detail": detail,
        "errors": errors or [],
    }
    return JSONResponse(
        content=body,
        status_code=status_code,
        media_type="application/problem+json",
        headers=headers,
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Render AppError subclasses as application/problem+json."""
    if exc.status >= 500:
        log.error(
            "http.app_error",
            status_code=exc.status,
            error_type=type(exc).__name__,
            detail=sanitize_log_text(exc.detail),
        )
    return _problem_response(
        status_code=exc.status,
        type_uri=exc.type_uri,
        title=exc.title,
        detail=exc.detail,
        errors=exc.errors,
        headers=exc.headers,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log unexpected exceptions securely and return sanitized problem+json without secrets."""
    request_id = getattr(request.state, "request_id", None)
    log.error(
        "http.unhandled_exception",
        error_type=type(exc).__name__,
        error_summary=sanitize_log_text(str(exc))[:500],
    )
    headers: dict[str, str] = {}
    if request_id:
        headers["X-Request-Id"] = str(request_id)
    return _problem_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        type_uri="/errors/internal-server-error",
        title="Internal Server Error",
        detail="An unexpected internal error occurred.",
        headers=headers or None,
    )


async def validation_error_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Convert Pydantic RequestValidationError to application/problem+json.

    Each Pydantic error becomes one entry in errors[]:
      { "field": "body.email", "message": "value is not a valid email address" }
    """
    errors = [
        {
            "field": ".".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
        }
        for err in exc.errors()
    ]
    return _problem_response(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        type_uri="/errors/validation-failed",
        title="Validation Failed",
        detail="One or more fields failed validation.",
        errors=errors,
    )
