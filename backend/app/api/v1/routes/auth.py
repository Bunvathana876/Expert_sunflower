"""Authentication API routes: register, login, refresh, logout, me."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.csrf import (
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    attach_csrf_vary_headers,
    compute_csrf_token,
    validate_csrf_request,
)
from app.core.deps import get_current_user, get_db
from app.core.errors import UnauthorizedError
from app.core.rate_limit import RateLimitRule, get_client_ip, rate_limiter
from app.models.auth import User
from app.repositories.user import UserRepository
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import AuthService, user_to_response

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    # 30 days TTL in seconds
    max_age = settings.REFRESH_TTL_DAYS * 24 * 60 * 60
    csrf_token = compute_csrf_token(refresh_token)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
        max_age=max_age,
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
        max_age=max_age,
    )
    response.headers[CSRF_HEADER_NAME] = csrf_token


def _clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )
    response.delete_cookie(
        key=CSRF_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        secure=settings.cookie_secure,
        httponly=False,
        samesite="lax",
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new grower",
)
async def register(
    req: RegisterRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Register a new grower account and issue initial access/refresh tokens."""
    settings = get_settings()
    client_ip = get_client_ip(request)
    await rate_limiter.check_limits(
        db,
        [
            RateLimitRule(
                scope="auth:register:ip",
                identifier=client_ip,
                max_attempts=settings.RATE_LIMIT_REGISTER_IP_MAX,
                window_seconds=settings.RATE_LIMIT_REGISTER_WINDOW_SEC,
            )
        ],
    )

    service = AuthService(UserRepository(db))
    token_resp, refresh_token = await service.register(req)
    _set_refresh_cookie(response, refresh_token)
    return token_resp


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate with username or email and password",
)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Authenticate credentials, issue access token, and set refresh cookie."""
    client_ip = get_client_ip(request)
    service = AuthService(UserRepository(db))
    token_resp, refresh_token = await service.login(req, client_ip)
    _set_refresh_cookie(response, refresh_token)
    return token_resp


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate refresh token and issue new access token",
)
async def refresh(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE_NAME)] = None,
) -> TokenResponse:
    """Rotate the refresh token and return a fresh access token."""
    request_started_at = datetime.now(UTC)
    settings = get_settings()
    client_ip = get_client_ip(request)
    await rate_limiter.check_limits(
        db,
        [
            RateLimitRule(
                scope="auth:refresh:ip",
                identifier=client_ip,
                max_attempts=settings.RATE_LIMIT_REFRESH_IP_MAX,
                window_seconds=settings.RATE_LIMIT_REFRESH_WINDOW_SEC,
            )
        ],
    )

    if not refresh_token:
        attach_csrf_vary_headers(response)
        validate_csrf_request(request, None)
        raise UnauthorizedError(detail="Missing refresh token cookie")

    attach_csrf_vary_headers(response)
    validate_csrf_request(request, refresh_token)

    service = AuthService(UserRepository(db))
    token_resp, new_refresh = await service.refresh_tokens(
        refresh_token,
        request_started_at=request_started_at,
    )
    _set_refresh_cookie(response, new_refresh)
    return token_resp


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log out and invalidate refresh token",
)
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str | None, Cookie(alias=REFRESH_COOKIE_NAME)] = None,
) -> None:
    """Clear the refresh token cookie and invalidate its server-side digest."""
    attach_csrf_vary_headers(response)
    validate_csrf_request(request, refresh_token)
    service = AuthService(UserRepository(db))
    await service.logout(refresh_token)
    _clear_refresh_cookie(response)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile and permissions",
)
async def me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Return the profile, role, and permission capabilities of the active user."""
    return user_to_response(current_user)
