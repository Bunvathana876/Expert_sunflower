"""Authentication and user management business logic."""

from __future__ import annotations

import contextlib
from datetime import datetime
from typing import Any

import structlog

from app.core.config import get_settings
from app.core.errors import ConflictError, ForbiddenError, UnauthorizedError
from app.core.rate_limit import RateLimitRule, rate_limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    is_legacy_hash,
    token_store,
    verify_dummy_password,
    verify_password,
)
from app.models.auth import User
from app.repositories.user import UserRepository
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateMeRequest,
    UserResponse,
)

log = structlog.get_logger(__name__)


def user_to_response(user: User) -> UserResponse:
    """Convert User ORM model to UserResponse schema with flattened permissions."""
    permission_codes = sorted([p.code for p in user.role.permissions]) if user.role else []
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role.name if user.role else "unknown",
        permissions=permission_codes,
        is_active=user.is_active,
    )


class AuthService:
    """Authentication and profile management service."""

    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(self, req: RegisterRequest) -> tuple[TokenResponse, str]:
        """Register a new grower account and persist its initial refresh-token digest.

        Raises:
            ConflictError: if email or username is already taken.
        """
        existing_email = await self.user_repo.get_by_email(req.email)
        if existing_email:
            raise ConflictError(detail="A user with this email already exists")

        existing_username = await self.user_repo.get_by_username(req.username)
        if existing_username:
            raise ConflictError(detail="A user with this username already exists")

        grower_role = await self.user_repo.get_role_by_name("grower")
        if not grower_role:
            raise RuntimeError("Default 'grower' role is not seeded in database")

        user = User(
            email=req.email,
            username=req.username,
            password_hash=hash_password(req.password),
            role_id=grower_role.id,
            is_active=True,
        )
        created_user = await self.user_repo.create(user)

        user_resp = user_to_response(created_user)
        access_token, _ = create_access_token(
            created_user.id,
            user_resp.role,
            user_resp.permissions,
        )
        refresh_token, refresh_jti = create_refresh_token(created_user.id)
        await token_store.issue_token(self.user_repo.session, created_user.id, refresh_jti)
        await self.user_repo.session.commit()
        log.info("security.auth.registered", user_id=created_user.id, role=user_resp.role)

        token_resp = TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_resp,
        )
        return token_resp, refresh_token

    async def login(self, req: LoginRequest, client_ip: str) -> tuple[TokenResponse, str]:
        """Authenticate user with multi-worker rate limiting and constant-time failure timing.

        Returns:
            (TokenResponse, refresh_token_string)
        """
        settings = get_settings()
        normalized_ident = req.identifier.strip().lower()
        await rate_limiter.check_limits(
            self.user_repo.session,
            [
                RateLimitRule(
                    scope="auth:login:ip_ident",
                    identifier=f"{client_ip}:{normalized_ident}",
                    max_attempts=settings.RATE_LIMIT_LOGIN_MAX,
                    window_seconds=settings.RATE_LIMIT_LOGIN_WINDOW_SEC,
                ),
                RateLimitRule(
                    scope="auth:login:ip",
                    identifier=client_ip,
                    max_attempts=settings.RATE_LIMIT_LOGIN_IP_MAX,
                    window_seconds=settings.RATE_LIMIT_LOGIN_WINDOW_SEC,
                ),
            ],
        )

        user = await self.user_repo.get_by_identifier(req.identifier)
        if not user:
            verify_dummy_password(req.password)
            log.warning("security.auth.login_failed", reason="unknown_identifier")
            raise UnauthorizedError(detail="Invalid email/username or password")

        if not verify_password(req.password, user.password_hash):
            log.warning("security.auth.login_failed", user_id=user.id, reason="invalid_password")
            raise UnauthorizedError(detail="Invalid email/username or password")

        # Transparently upgrade legacy Werkzeug hashes to Argon2id upon successful authentication
        if is_legacy_hash(user.password_hash):
            user.password_hash = hash_password(req.password)
            await self.user_repo.session.flush()

        if not user.is_active:
            log.warning("security.auth.login_failed", user_id=user.id, reason="inactive_account")
            raise ForbiddenError(detail="User account is inactive")

        user_resp = user_to_response(user)
        access_token, _ = create_access_token(
            user.id,
            user_resp.role,
            user_resp.permissions,
        )
        refresh_token, refresh_jti = create_refresh_token(user.id)
        await token_store.issue_token(self.user_repo.session, user.id, refresh_jti)
        await self.user_repo.session.commit()
        log.info("security.auth.login_succeeded", user_id=user.id, role=user_resp.role)

        token_resp = TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_resp,
        )
        return token_resp, refresh_token

    async def refresh_tokens(
        self,
        old_refresh_token: str,
        *,
        request_started_at: datetime | None = None,
    ) -> tuple[TokenResponse, str]:
        """Validate and atomically rotate refresh token in persistent storage.

        Revokes the old token digest under row lock, detects rotated-token replay to
        revoke compromised token families, and returns a new access & refresh token pair.
        """
        payload = decode_token(old_refresh_token)
        if payload.get("type") != "refresh":
            raise UnauthorizedError(detail="Invalid token type")

        jti = payload.get("jti")
        if not jti or not isinstance(jti, str):
            raise UnauthorizedError(detail="Refresh token has been revoked or is invalid")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedError(detail="Invalid token payload")

        try:
            user_id = int(user_id_str)
        except ValueError as exc:
            raise UnauthorizedError(detail="Invalid token payload") from exc

        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            await token_store.revoke_all_for_user(self.user_repo.session, user_id)
            await self.user_repo.session.commit()
            raise UnauthorizedError(detail="User no longer active or exists")

        # Atomically lock, validate, revoke old_jti, and issue single rotated refresh token
        new_refresh, _ = await token_store.rotate_token(
            self.user_repo.session,
            jti,
            user.id,
            request_started_at=request_started_at,
        )
        log.info("security.auth.token_rotated", user_id=user.id)

        user_resp = user_to_response(user)
        new_access, _ = create_access_token(user.id, user_resp.role, user_resp.permissions)

        token_resp = TokenResponse(
            access_token=new_access,
            token_type="bearer",
            user=user_resp,
        )
        return token_resp, new_refresh

    async def logout(self, refresh_token: str | None) -> None:
        """Durably revoke refresh token across all workers if valid."""
        if not refresh_token:
            return
        with contextlib.suppress(Exception):
            payload: dict[str, Any] = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                return
            jti = payload.get("jti")
            if jti and isinstance(jti, str):
                revoked = await token_store.revoke_token(self.user_repo.session, jti)
                log.info("security.auth.logout", revoked=revoked)

    async def update_me(self, user: User, req: UpdateMeRequest) -> UserResponse:
        """Update current user profile. Requires current_password verification."""
        if not verify_password(req.current_password, user.password_hash):
            raise UnauthorizedError(detail="Current password is required and incorrect")

        if req.email is not None and req.email != user.email:
            existing_email = await self.user_repo.get_by_email(req.email)
            if existing_email:
                raise ConflictError(detail="A user with this email already exists")
            user.email = req.email

        if req.username is not None and req.username != user.username:
            existing_username = await self.user_repo.get_by_username(req.username)
            if existing_username:
                raise ConflictError(detail="A user with this username already exists")
            user.username = req.username

        if req.new_password is not None:
            user.password_hash = hash_password(req.new_password)
            await token_store.revoke_all_for_user(self.user_repo.session, user.id)

        await self.user_repo.session.flush()
        # Re-fetch with loaded relationships
        updated = await self.user_repo.get_by_id(user.id)
        assert updated is not None
        return user_to_response(updated)
