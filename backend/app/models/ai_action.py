"""Persistent AI administrative action proposal model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.auth import User


class PendingAIAction(Base):
    """Database-backed two-phase confirmation record for AI-proposed admin mutations.

    Stores a keyed cryptographic verifier (`token_hash`) rather than the plaintext
    confirmation token so database exposure cannot compromise active proposals.
    """

    __tablename__ = "pending_ai_actions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'executing', 'executed', 'cancelled', 'expired', 'failed')",
            name="ck_pending_ai_actions_status",
        ),
        Index(
            "ix_pending_ai_actions_conv_user_status",
            "conversation_id",
            "user_id",
            "status",
            "created_at",
        ),
        Index("ix_pending_ai_actions_user_created", "user_id", "created_at"),
        Index("ix_pending_ai_actions_status_expires", "status", "expires_at"),
    )

    action_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    conversation_id: Mapped[str] = mapped_column(String(128), nullable=False)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    required_permission: Mapped[str] = mapped_column(String(64), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(postgresql.JSONB, "postgresql"),
        nullable=False,
    )
    affected_records: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON().with_variant(postgresql.JSONB, "postgresql"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship("User", foreign_keys=[user_id], lazy="raise")
