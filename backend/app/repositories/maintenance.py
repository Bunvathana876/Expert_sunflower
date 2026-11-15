"""Database queries for idempotent maintenance cleanup of security & rate-limit tables."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_action import PendingAIAction
from app.models.auth import RefreshToken
from app.models.rate_limit import RateLimitEvent

_TERMINAL_AI_STATUSES: tuple[str, ...] = ("expired", "cancelled", "failed", "executed")


class MaintenanceRepository:
    """Encapsulates bounded, index-friendly SQL operations for expired record pruning."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def count_overdue_pending_ai_actions(self, now: datetime) -> int:
        res = await self.session.execute(
            select(func.count(PendingAIAction.action_id)).where(
                PendingAIAction.status == "pending",
                PendingAIAction.expires_at <= now,
            )
        )
        return int(res.scalar_one() or 0)

    async def mark_overdue_pending_ai_actions(self, now: datetime) -> int:
        res = await self.session.execute(
            update(PendingAIAction)
            .where(
                PendingAIAction.status == "pending",
                PendingAIAction.expires_at <= now,
            )
            .values(status="expired")
            .execution_options(synchronize_session=False)
        )
        return int(res.rowcount or 0)

    async def count_prunable_ai_actions(
        self,
        now: datetime,
        ai_cutoff: datetime,
        include_overdue_pending: bool = False,
    ) -> int:
        statuses = (
            (*_TERMINAL_AI_STATUSES, "pending")
            if include_overdue_pending
            else _TERMINAL_AI_STATUSES
        )
        res = await self.session.execute(
            select(func.count(PendingAIAction.action_id)).where(
                PendingAIAction.status.in_(statuses),
                PendingAIAction.expires_at <= now,
                PendingAIAction.expires_at <= ai_cutoff,
            )
        )
        return int(res.scalar_one() or 0)

    async def delete_prunable_ai_actions(self, now: datetime, ai_cutoff: datetime) -> int:
        res = await self.session.execute(
            delete(PendingAIAction)
            .where(
                PendingAIAction.status.in_(_TERMINAL_AI_STATUSES),
                PendingAIAction.expires_at <= now,
                PendingAIAction.expires_at <= ai_cutoff,
            )
            .execution_options(synchronize_session=False)
        )
        return int(res.rowcount or 0)

    async def count_prunable_refresh_tokens(
        self,
        now: datetime,
        expired_cutoff: datetime,
        revoked_cutoff: datetime,
    ) -> int:
        res = await self.session.execute(
            select(func.count(RefreshToken.id)).where(
                or_(
                    and_(
                        RefreshToken.expires_at <= now,
                        RefreshToken.expires_at <= expired_cutoff,
                    ),
                    and_(
                        RefreshToken.revoked_at.is_not(None),
                        RefreshToken.revoked_at <= now,
                        RefreshToken.revoked_at <= revoked_cutoff,
                    ),
                )
            )
        )
        return int(res.scalar_one() or 0)

    async def delete_prunable_refresh_tokens(
        self,
        now: datetime,
        expired_cutoff: datetime,
        revoked_cutoff: datetime,
    ) -> int:
        res = await self.session.execute(
            delete(RefreshToken)
            .where(
                or_(
                    and_(
                        RefreshToken.expires_at <= now,
                        RefreshToken.expires_at <= expired_cutoff,
                    ),
                    and_(
                        RefreshToken.revoked_at.is_not(None),
                        RefreshToken.revoked_at <= now,
                        RefreshToken.revoked_at <= revoked_cutoff,
                    ),
                )
            )
            .execution_options(synchronize_session=False)
        )
        return int(res.rowcount or 0)

    async def count_prunable_rate_limit_events(
        self,
        now: datetime,
        rate_limit_cutoff: datetime,
    ) -> int:
        res = await self.session.execute(
            select(func.count(RateLimitEvent.id)).where(
                RateLimitEvent.expires_at <= now,
                RateLimitEvent.expires_at <= rate_limit_cutoff,
            )
        )
        return int(res.scalar_one() or 0)

    async def delete_prunable_rate_limit_events(
        self,
        now: datetime,
        rate_limit_cutoff: datetime,
    ) -> int:
        res = await self.session.execute(
            delete(RateLimitEvent)
            .where(
                RateLimitEvent.expires_at <= now,
                RateLimitEvent.expires_at <= rate_limit_cutoff,
            )
            .execution_options(synchronize_session=False)
        )
        return int(res.rowcount or 0)
