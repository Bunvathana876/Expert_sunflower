"""Add persistent AI actions, refresh tokens, rate-limit events, and performance indexes.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-07
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB, "postgresql")

    # 1. pending_ai_actions — durable two-phase AI admin confirmation proposals
    op.create_table(
        "pending_ai_actions",
        sa.Column("action_id", sa.String(length=64), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.String(length=128), nullable=False),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("required_permission", sa.String(length=64), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("details", json_type, nullable=False),
        sa.Column("affected_records", json_type, nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'executing', 'executed', 'cancelled', 'expired', 'failed')",
            name=op.f("ck_pending_ai_actions_ck_pending_ai_actions_status"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_pending_ai_actions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("action_id", name=op.f("pk_pending_ai_actions")),
    )
    op.create_index(
        "ix_pending_ai_actions_conv_user_status",
        "pending_ai_actions",
        ["conversation_id", "user_id", "status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_pending_ai_actions_user_created",
        "pending_ai_actions",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_pending_ai_actions_status_expires",
        "pending_ai_actions",
        ["status", "expires_at"],
        unique=False,
    )

    # 2. refresh_tokens — durable refresh-token rotation and revocation ledger
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("family_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_hash", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_refresh_tokens_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_refresh_tokens_token_hash")),
    )
    op.create_index(
        "ix_refresh_tokens_user_active",
        "refresh_tokens",
        ["user_id", "revoked_at"],
        unique=False,
    )
    op.create_index(
        "ix_refresh_tokens_expires_at",
        "refresh_tokens",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_refresh_tokens_family_id",
        "refresh_tokens",
        ["family_id"],
        unique=False,
    )

    # 3. rate_limit_events — multi-worker sliding-window rate-limiting store
    op.create_table(
        "rate_limit_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scope_key", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rate_limit_events")),
    )
    op.create_index(
        "ix_rate_limit_events_scope_created",
        "rate_limit_events",
        ["scope_key", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_rate_limit_events_expires_at",
        "rate_limit_events",
        ["expires_at"],
        unique=False,
    )

    # 4. Justified indexes on existing domain tables (non-destructive)
    op.create_index(
        "ix_diseases_published_slug",
        "diseases",
        ["is_published", "slug"],
        unique=False,
    )
    op.create_index(
        "ix_diseases_pathogen_type",
        "diseases",
        ["pathogen_type"],
        unique=False,
    )
    op.create_index(
        "ix_symptoms_category_id",
        "symptoms",
        ["category_id"],
        unique=False,
    )
    op.create_index(
        "ix_disease_symptoms_symptom_id",
        "disease_symptoms",
        ["symptom_id"],
        unique=False,
    )
    op.create_index(
        "ix_translations_type_field_locale",
        "translations",
        ["entity_type", "field", "locale"],
        unique=False,
    )
    op.create_index(
        "ix_users_role_active",
        "users",
        ["role_id", "is_active"],
        unique=False,
    )
    op.create_index(
        "ix_role_permissions_permission_id",
        "role_permissions",
        ["permission_id"],
        unique=False,
    )
    op.create_index(
        "ix_diagnosis_results_session_rank",
        "diagnosis_results",
        ["session_id", "rank"],
        unique=False,
    )
    op.create_index(
        "ix_diagnosis_selected_symptoms_symptom_id",
        "diagnosis_selected_symptoms",
        ["symptom_id"],
        unique=False,
    )
    op.create_index(
        "ix_audit_log_entity_lookup",
        "audit_log",
        ["entity_type", "entity_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_audit_log_actor_created",
        "audit_log",
        ["actor_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_audit_log_created_at",
        "audit_log",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    # Drop added domain indexes in reverse order (preserves all domain rows)
    op.drop_index("ix_audit_log_created_at", table_name="audit_log")
    op.drop_index("ix_audit_log_actor_created", table_name="audit_log")
    op.drop_index("ix_audit_log_entity_lookup", table_name="audit_log")
    op.drop_index(
        "ix_diagnosis_selected_symptoms_symptom_id",
        table_name="diagnosis_selected_symptoms",
    )
    op.drop_index("ix_diagnosis_results_session_rank", table_name="diagnosis_results")
    op.drop_index("ix_role_permissions_permission_id", table_name="role_permissions")
    op.drop_index("ix_users_role_active", table_name="users")
    op.drop_index("ix_translations_type_field_locale", table_name="translations")
    op.drop_index("ix_disease_symptoms_symptom_id", table_name="disease_symptoms")
    op.drop_index("ix_symptoms_category_id", table_name="symptoms")
    op.drop_index("ix_diseases_pathogen_type", table_name="diseases")
    op.drop_index("ix_diseases_published_slug", table_name="diseases")

    # Drop Phase 3 operational tables
    op.drop_index("ix_rate_limit_events_expires_at", table_name="rate_limit_events")
    op.drop_index("ix_rate_limit_events_scope_created", table_name="rate_limit_events")
    op.drop_table("rate_limit_events")

    op.drop_index("ix_refresh_tokens_family_id", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_expires_at", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_active", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_pending_ai_actions_status_expires", table_name="pending_ai_actions")
    op.drop_index("ix_pending_ai_actions_user_created", table_name="pending_ai_actions")
    op.drop_index("ix_pending_ai_actions_conv_user_status", table_name="pending_ai_actions")
    op.drop_table("pending_ai_actions")
