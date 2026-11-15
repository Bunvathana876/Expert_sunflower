"""Persistent sliding-window rate-limiting event model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RateLimitEvent(Base):
    """Database-backed sliding-window rate-limit timestamp record.

    `scope_key` stores `<scope>:<hmac_sha256>` so no plaintext IPs, credentials,
    emails, or tokens are persisted in rate-limiting tables.
    """

    __tablename__ = "rate_limit_events"
    __table_args__ = (
        Index("ix_rate_limit_events_scope_created", "scope_key", "created_at"),
        Index("ix_rate_limit_events_expires_at", "expires_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope_key: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
