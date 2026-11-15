"""Persistent two-phase administrative action confirmation store and security validation.

Replaces process-local memory storage with PostgreSQL-backed durable state (`pending_ai_actions`).
Prevents unauthorized, unconfirmed, expired, cross-worker race, or duplicate AI-initiated
database changes without storing raw confirmation tokens.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ai.schemas.ai_schemas import ProposedActionDTO
from app.core.config import get_settings
from app.core.errors import BadRequestError, ForbiddenError, NotFoundError
from app.models.ai_action import PendingAIAction
from app.models.auth import User

log = structlog.get_logger(__name__)


def _ensure_utc(dt: datetime) -> datetime:
    """Normalize naive (SQLite) or aware (PostgreSQL) timestamps to UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def compute_action_token_hash(raw_token: str) -> str:
    """Compute keyed HMAC-SHA256 verifier for an action confirmation token.

    Plaintext confirmation tokens are never persisted in the database.
    """
    secret = get_settings().JWT_SECRET.encode("utf-8")
    return hmac.new(secret, raw_token.encode("utf-8"), hashlib.sha256).hexdigest()


@dataclass
class ProposedAction:
    """Domain representation of an AI-proposed database change requiring user confirmation."""

    action_id: str
    user_id: int
    conversation_id: str
    action_type: str
    required_permission: str
    summary: str
    details: dict[str, Any]
    affected_records: list[dict[str, Any]]
    created_at: datetime
    expires_at: datetime
    status: str = "pending"
    confirmation_token: str = ""  # Populated ONLY once on initial creation; never loaded from DB
    error_detail: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def is_expired(self) -> bool:
        """Return True if current time has passed the expiration timestamp."""
        return datetime.now(UTC) >= _ensure_utc(self.expires_at)

    def to_dto(self) -> ProposedActionDTO:
        """Convert into API response schema DTO."""
        return ProposedActionDTO(
            action_id=self.action_id,
            confirmation_token=self.confirmation_token,
            action_type=self.action_type,
            summary=self.summary,
            details=self.details,
            affected_records=self.affected_records,
            expires_at=_ensure_utc(self.expires_at).isoformat(),
            requires_confirmation=True,
        )


def _row_to_domain(row: PendingAIAction, raw_token: str = "") -> ProposedAction:
    """Convert ORM PendingAIAction row into ProposedAction domain object."""
    return ProposedAction(
        action_id=row.action_id,
        confirmation_token=raw_token,
        user_id=row.user_id,
        conversation_id=row.conversation_id,
        action_type=row.action_type,
        required_permission=row.required_permission,
        summary=row.summary,
        details=dict(row.details) if row.details else {},
        affected_records=list(row.affected_records) if row.affected_records else [],
        created_at=_ensure_utc(row.created_at),
        expires_at=_ensure_utc(row.expires_at),
        status=row.status,
        error_detail=row.error_detail,
    )


class PendingActionStore:
    """PostgreSQL-backed store for pending AI-initiated administrative actions.

    Safe across multiple Uvicorn worker processes via row-level locking (`SELECT ... FOR UPDATE`)
    and atomic conditional `UPDATE` transitions. Does not rely on `asyncio.Lock` or
    in-memory state.
    """

    def __init__(self, default_ttl_seconds: int | None = None) -> None:
        self._default_ttl_seconds = default_ttl_seconds

    @property
    def default_ttl_seconds(self) -> int:
        if self._default_ttl_seconds is not None:
            return self._default_ttl_seconds
        return get_settings().AI_ACTION_PROPOSAL_TTL_SEC

    async def create_proposal(
        self,
        db: AsyncSession,
        user_id: int,
        conversation_id: str,
        action_type: str,
        required_permission: str,
        summary: str,
        details: dict[str, Any],
        affected_records: list[dict[str, Any]],
        ttl_seconds: int | None = None,
    ) -> ProposedAction:
        """Persist a new action proposal storing only the HMAC-SHA256 token verifier."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        action_id = str(uuid.uuid4())
        raw_confirmation_token = secrets.token_urlsafe(32)
        token_hash = compute_action_token_hash(raw_confirmation_token)

        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=ttl)

        # Opportunistically mark overdue pending actions for this user as expired
        await db.execute(
            update(PendingAIAction)
            .where(
                PendingAIAction.user_id == user_id,
                PendingAIAction.status == "pending",
                PendingAIAction.expires_at <= now,
            )
            .values(status="expired")
            .execution_options(synchronize_session=False)
        )

        row = PendingAIAction(
            action_id=action_id,
            token_hash=token_hash,
            user_id=user_id,
            conversation_id=conversation_id or "default",
            action_type=action_type,
            required_permission=required_permission,
            summary=summary,
            details=details,
            affected_records=affected_records,
            status="pending",
            created_at=now,
            expires_at=expires_at,
        )
        db.add(row)
        await db.commit()
        log.info(
            "security.ai_action.proposed",
            action_id=action_id,
            user_id=user_id,
            action_type=action_type,
            required_permission=required_permission,
        )

        return _row_to_domain(row, raw_token=raw_confirmation_token)

    async def get_action(self, db: AsyncSession, action_id: str) -> ProposedAction | None:
        """Retrieve action by ID and lazily transition overdue pending proposals to 'expired'."""
        res = await db.execute(
            select(PendingAIAction).where(PendingAIAction.action_id == action_id)
        )
        row = res.scalar_one_or_none()
        if not row:
            return None

        now = datetime.now(UTC)
        if row.status == "pending" and _ensure_utc(row.expires_at) <= now:
            row.status = "expired"
            await db.commit()

        return _row_to_domain(row)

    async def get_pending_for_conversation(
        self,
        db: AsyncSession,
        conversation_id: str,
        user_id: int,
    ) -> ProposedAction | None:
        """Retrieve the latest active pending action for a conversation and user."""
        if not conversation_id:
            return None

        res = await db.execute(
            select(PendingAIAction)
            .where(
                PendingAIAction.conversation_id == conversation_id,
                PendingAIAction.user_id == user_id,
                PendingAIAction.status == "pending",
            )
            .order_by(PendingAIAction.created_at.desc())
            .limit(1)
        )
        row = res.scalar_one_or_none()
        if not row:
            return None

        now = datetime.now(UTC)
        if _ensure_utc(row.expires_at) <= now:
            row.status = "expired"
            await db.commit()
            return None

        return _row_to_domain(row)

    async def _lock_and_claim(
        self,
        db: AsyncSession,
        action_id: str,
        current_user: User,
        confirmation_token: str | None,
        expected_conversation_id: str | None = None,
    ) -> ProposedAction:
        """Acquire row lock (`FOR UPDATE`), validate security invariants, and claim execution.

        Does NOT commit the session so the caller can execute domain writes and audit log
        creation within the exact same database transaction.
        """
        stmt = (
            select(PendingAIAction)
            .where(PendingAIAction.action_id == action_id)
            .with_for_update()
        )
        res = await db.execute(stmt)
        row = res.scalar_one_or_none()
        if not row:
            raise NotFoundError(
                detail="Action proposal not found or has already been consumed."
            )

        # 1. Ownership check: Must be confirmed by the exact user who proposed it
        if row.user_id != current_user.id:
            raise ForbiddenError(detail="You are not authorized to confirm this action.")

        # Optional conversation binding check for conversational confirmation
        if expected_conversation_id is not None and row.conversation_id != expected_conversation_id:
            raise ForbiddenError(detail="Action proposal belongs to a different conversation.")

        # 2. Status & expiration checks
        now = datetime.now(UTC)
        if row.status == "executed":
            raise BadRequestError(detail="This action has already been executed.")
        if row.status == "cancelled":
            raise BadRequestError(detail="This action was cancelled.")
        if row.status == "failed":
            raise BadRequestError(
                detail="This action previously failed execution. Please propose it again."
            )
        if row.status == "expired" or _ensure_utc(row.expires_at) <= now:
            row.status = "expired"
            await db.commit()
            raise BadRequestError(
                detail="Action proposal has expired. Please propose it again."
            )
        if row.status != "pending":
            raise BadRequestError(detail="Action proposal is no longer pending.")

        # 3. Cryptographic token verifier check (required for token-based confirmation)
        if confirmation_token is not None:
            if not confirmation_token:
                raise BadRequestError(detail="Invalid confirmation token.")
            candidate_hash = compute_action_token_hash(confirmation_token)
            if not hmac.compare_digest(row.token_hash, candidate_hash):
                raise BadRequestError(detail="Invalid confirmation token.")

        # 4. Backend permission & active account re-validation
        if not current_user.is_active:
            raise ForbiddenError(detail="User account is inactive.")
        if not current_user.has_permission(row.required_permission):
            raise ForbiddenError(
                detail=f"Permission denied: required '{row.required_permission}'."
            )

        # 5. Atomic conditional state transition to prevent cross-worker double execution
        claim_res = await db.execute(
            update(PendingAIAction)
            .where(
                PendingAIAction.action_id == action_id,
                PendingAIAction.status == "pending",
                PendingAIAction.expires_at > now,
            )
            .values(status="executed", executed_at=now)
            .execution_options(synchronize_session=False)
        )
        if claim_res.rowcount != 1:
            raise BadRequestError(detail="This action has already been executed.")

        row.status = "executed"
        row.executed_at = now
        await db.flush()
        log.info(
            "security.ai_action.confirmed",
            action_id=action_id,
            user_id=current_user.id,
            action_type=row.action_type,
        )

        return _row_to_domain(row)

    async def validate_and_consume(
        self,
        db: AsyncSession,
        action_id: str,
        confirmation_token: str,
        current_user: User,
    ) -> ProposedAction:
        """Validate confirmation token, ownership, TTL, and RBAC, then claim execution."""
        return await self._lock_and_claim(
            db=db,
            action_id=action_id,
            current_user=current_user,
            confirmation_token=confirmation_token,
        )

    async def validate_and_consume_conversational(
        self,
        db: AsyncSession,
        action_id: str,
        conversation_id: str,
        current_user: User,
    ) -> ProposedAction:
        """Validate explicit conversational confirmation bound to owner & conversation."""
        return await self._lock_and_claim(
            db=db,
            action_id=action_id,
            current_user=current_user,
            confirmation_token=None,
            expected_conversation_id=conversation_id,
        )

    async def cancel_action(
        self,
        db: AsyncSession,
        action_id: str,
        current_user: User,
        confirmation_token: str | None = None,
    ) -> ProposedAction:
        """Cancel a pending action proposal with row-level lock protection."""
        res = await db.execute(
            select(PendingAIAction)
            .where(PendingAIAction.action_id == action_id)
            .with_for_update()
        )
        row = res.scalar_one_or_none()
        if not row:
            raise NotFoundError(detail="Action proposal not found.")

        if row.user_id != current_user.id:
            raise ForbiddenError(detail="You are not authorized to cancel this action.")

        if row.status == "executed":
            raise BadRequestError(
                detail="Cannot cancel an action that has already been executed."
            )

        if confirmation_token:
            candidate_hash = compute_action_token_hash(confirmation_token)
            if not hmac.compare_digest(row.token_hash, candidate_hash):
                raise BadRequestError(detail="Invalid confirmation token.")

        now = datetime.now(UTC)
        row.status = "cancelled"
        row.cancelled_at = now
        await db.commit()
        log.info(
            "security.ai_action.cancelled",
            action_id=action_id,
            user_id=current_user.id,
            action_type=row.action_type,
        )

        return _row_to_domain(row)

    async def mark_failed(
        self,
        db: AsyncSession,
        action_id: str,
        error_detail: str | None = None,
    ) -> None:
        """Durably mark an action proposal as failed after rolling back failed domain writes."""
        truncated_error = error_detail[:1000] if error_detail else "Execution failed"
        await db.execute(
            update(PendingAIAction)
            .where(
                PendingAIAction.action_id == action_id,
                PendingAIAction.status.in_(["pending", "executing", "executed"]),
            )
            .values(status="failed", error_detail=truncated_error, executed_at=None)
            .execution_options(synchronize_session=False)
        )
        await db.commit()
        log.warning(
            "security.ai_action.failed",
            action_id=action_id,
        )

    async def cleanup_expired(
        self,
        db: AsyncSession,
        retention_seconds: int = 86400,
    ) -> int:
        """Mark overdue pending proposals expired and delete historical expired/terminal records."""
        now = datetime.now(UTC)
        await db.execute(
            update(PendingAIAction)
            .where(
                PendingAIAction.status == "pending",
                PendingAIAction.expires_at <= now,
            )
            .values(status="expired")
            .execution_options(synchronize_session=False)
        )

        cutoff = now - timedelta(seconds=max(0, retention_seconds))
        del_res = await db.execute(
            delete(PendingAIAction)
            .where(
                PendingAIAction.status.in_(["expired", "cancelled", "failed", "executed"]),
                PendingAIAction.expires_at <= cutoff,
            )
            .execution_options(synchronize_session=False)
        )
        await db.commit()
        return int(del_res.rowcount or 0)

    def clear(self) -> None:
        """No-op retained for backward fixture compatibility (state lives in DB)."""


# Global stateless singleton instance
pending_action_store = PendingActionStore()
