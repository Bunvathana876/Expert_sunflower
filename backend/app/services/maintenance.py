"""Automated maintenance service for pruning expired security and rate-limiting records.

Guarantees:
  - Active records (`pending_ai_actions` with `expires_at > now`, active unrevoked
    `refresh_tokens` with `expires_at > now`, and active `rate_limit_events` with
    `expires_at > now`) are NEVER modified or deleted, even if retention hours are 0.
  - Runs inside a single database transaction with explicit rollback on failure or
    `dry_run=True`.
  - Emits structured telemetry suitable for log aggregation and alerting.
"""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.repositories.maintenance import MaintenanceRepository

log = structlog.get_logger(__name__)


@dataclass(frozen=True)
class MaintenanceCleanupResult:
    """Summary of an idempotent maintenance cleanup run."""

    dry_run: bool
    executed_at: str
    marked_expired_ai_actions: int
    deleted_ai_actions: int
    deleted_refresh_tokens: int
    deleted_rate_limit_events: int
    ai_action_retention_hours: int
    refresh_token_retention_hours: int
    expired_token_grace_hours: int
    rate_limit_retention_hours: int
    duration_ms: float

    @property
    def total_deleted(self) -> int:
        return (
            self.deleted_ai_actions
            + self.deleted_refresh_tokens
            + self.deleted_rate_limit_events
        )

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["total_deleted"] = self.total_deleted
        return data


async def run_maintenance_cleanup(
    session: AsyncSession,
    *,
    dry_run: bool = False,
    ai_action_retention_hours: int | None = None,
    refresh_token_retention_hours: int | None = None,
    expired_token_grace_hours: int | None = None,
    rate_limit_retention_hours: int | None = None,
    now_override: datetime | None = None,
) -> MaintenanceCleanupResult:
    """Execute or preview idempotent cleanup of expired operational tables."""
    settings = get_settings()
    ai_hours = max(
        0,
        settings.MAINTENANCE_AI_ACTION_RETENTION_HOURS
        if ai_action_retention_hours is None
        else ai_action_retention_hours,
    )
    token_hours = max(
        0,
        settings.MAINTENANCE_REFRESH_TOKEN_RETENTION_HOURS
        if refresh_token_retention_hours is None
        else refresh_token_retention_hours,
    )
    expired_grace_hours = max(
        0,
        settings.MAINTENANCE_EXPIRED_TOKEN_GRACE_HOURS
        if expired_token_grace_hours is None
        else expired_token_grace_hours,
    )
    rl_hours = max(
        0,
        settings.MAINTENANCE_RATE_LIMIT_RETENTION_HOURS
        if rate_limit_retention_hours is None
        else rate_limit_retention_hours,
    )

    now = now_override.astimezone(UTC) if now_override is not None else datetime.now(UTC)
    ai_cutoff = now - timedelta(hours=ai_hours)
    expired_token_cutoff = now - timedelta(hours=expired_grace_hours)
    revoked_token_cutoff = now - timedelta(hours=token_hours)
    rl_cutoff = now - timedelta(hours=rl_hours)

    repo = MaintenanceRepository(session)
    started = time.perf_counter()

    try:
        if dry_run:
            marked_ai = await repo.count_overdue_pending_ai_actions(now)
            deleted_ai = await repo.count_prunable_ai_actions(
                now,
                ai_cutoff,
                include_overdue_pending=True,
            )
            deleted_tokens = await repo.count_prunable_refresh_tokens(
                now,
                expired_token_cutoff,
                revoked_token_cutoff,
            )
            deleted_rl = await repo.count_prunable_rate_limit_events(now, rl_cutoff)
            await session.rollback()
        else:
            marked_ai = await repo.mark_overdue_pending_ai_actions(now)
            deleted_ai = await repo.delete_prunable_ai_actions(now, ai_cutoff)
            deleted_tokens = await repo.delete_prunable_refresh_tokens(
                now,
                expired_token_cutoff,
                revoked_token_cutoff,
            )
            deleted_rl = await repo.delete_prunable_rate_limit_events(now, rl_cutoff)
            await session.commit()
            session.expire_all()
    except Exception as exc:
        await session.rollback()
        log.error(
            "maintenance.cleanup_failed",
            dry_run=dry_run,
            error_type=type(exc).__name__,
        )
        raise

    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    result = MaintenanceCleanupResult(
        dry_run=dry_run,
        executed_at=now.isoformat(),
        marked_expired_ai_actions=marked_ai,
        deleted_ai_actions=deleted_ai,
        deleted_refresh_tokens=deleted_tokens,
        deleted_rate_limit_events=deleted_rl,
        ai_action_retention_hours=ai_hours,
        refresh_token_retention_hours=token_hours,
        expired_token_grace_hours=expired_grace_hours,
        rate_limit_retention_hours=rl_hours,
        duration_ms=duration_ms,
    )

    log.info(
        "maintenance.cleanup_completed",
        dry_run=result.dry_run,
        marked_expired_ai_actions=result.marked_expired_ai_actions,
        deleted_ai_actions=result.deleted_ai_actions,
        deleted_refresh_tokens=result.deleted_refresh_tokens,
        deleted_rate_limit_events=result.deleted_rate_limit_events,
        total_deleted=result.total_deleted,
        duration_ms=result.duration_ms,
    )
    return result
