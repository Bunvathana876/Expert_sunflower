"""User management routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import RateLimitRule, get_client_ip, rate_limiter
from app.models.auth import User
from app.repositories.user import UserRepository
from app.schemas.auth import UpdateMeRequest, UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/users", tags=["users"])


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile (requires current_password)",
)
async def update_me(
    req: UpdateMeRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Update username, email, or password for the authenticated user.

    A username or email change requires current_password.
    A password change requires current_password.
    """
    settings = get_settings()
    client_ip = get_client_ip(request)
    await rate_limiter.check_limits(
        db,
        [
            RateLimitRule(
                scope="users:me:user",
                identifier=f"user:{current_user.id}",
                max_attempts=settings.RATE_LIMIT_PROFILE_USER_MAX,
                window_seconds=settings.RATE_LIMIT_PROFILE_WINDOW_SEC,
            ),
            RateLimitRule(
                scope="users:me:ip",
                identifier=client_ip,
                max_attempts=settings.RATE_LIMIT_PROFILE_IP_MAX,
                window_seconds=settings.RATE_LIMIT_PROFILE_WINDOW_SEC,
            ),
        ],
    )

    service = AuthService(UserRepository(db))
    return await service.update_me(current_user, req)
