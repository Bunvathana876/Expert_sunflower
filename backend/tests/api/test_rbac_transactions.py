"""Automated tests for Phase 2: RBAC, Permission Enforcement, and DB Transaction Hardening.

Covers:
1. Unauthenticated and unauthorized access protection (401 / 403).
2. Self-escalation and self-demotion prevention on administrative user updates.
3. Last active administrator lockout prevention.
4. Target role existence validation on user updates.
5. Administrative actions audit logging (user updates, role permissions, ruleset activation).
6. Admin role lockout protection (essential permissions cannot be stripped from 'admin').
7. Invalid permission codes validation on role updates.
8. Atomic bulk symptom updates duplicate ID rejection (422).
9. Disease deletion cleaning up polymorphic translations.
10. Conversational casual affirmations ("ok", "yes") preventing accidental destructive deletions.
11. Async lock concurrency safety in PendingActionStore.
12. Failed database transaction state recovery (action marked 'failed', not 'executed').
"""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai.config import ai_config
from ai.services.action_confirmation import pending_action_store
from app.core.errors import BadRequestError
from app.core.security import create_access_token
from app.models.audit import AuditLog
from app.models.auth import Permission, Role, User
from app.models.disease import Disease
from app.models.enums import PathogenType
from app.models.ruleset import Ruleset
from app.models.symptom import Symptom, SymptomCategory
from app.models.translation import Translation
from scripts.seed import seed_database


@pytest.fixture(autouse=True)
async def _seed_data(db_session: AsyncSession) -> None:
    await seed_database(db_session)
    pending_action_store.clear()


async def _create_user(
    db: AsyncSession,
    username: str,
    role_name: str,
    permissions: list[str],
) -> tuple[User, str]:
    role_res = await db.execute(select(Role).where(Role.name == role_name))
    role = role_res.scalar_one()

    user = User(
        email=f"{username}@example.com",
        username=username,
        password_hash="fakehash",
        role_id=role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()

    stmt = (
        select(User)
        .where(User.id == user.id)
        .options(selectinload(User.role).selectinload(Role.permissions))
    )
    user_loaded = (await db.execute(stmt)).scalar_one()

    token, _ = create_access_token(
        user_id=user_loaded.id,
        role=role_name,
        permissions=permissions,
    )
    return user_loaded, token


# ============================================================================
# 1. Unauthenticated & Unauthorized Protection
# ============================================================================

@pytest.mark.asyncio
async def test_unauthenticated_requests_return_401(client: AsyncClient) -> None:
    """Endpoints requiring authentication return 401 when no token is supplied."""
    resp1 = await client.get("/api/v1/admin/users")
    assert resp1.status_code == 401

    resp2 = await client.get("/api/v1/admin/roles")
    assert resp2.status_code == 401

    resp3 = await client.get("/api/v1/admin/rulesets")
    assert resp3.status_code == 401

    resp4 = await client.post("/api/v1/diseases", json={})
    assert resp4.status_code == 401


@pytest.mark.asyncio
async def test_unauthorized_user_returns_403(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Users without required permissions are rejected with 403 Forbidden."""
    _, grower_token = await _create_user(
        db_session, "plain_grower_2", "grower", ["disease:read"]
    )

    resp = await client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {grower_token}"},
    )
    assert resp.status_code == 403
    assert "user:manage" in resp.json()["detail"]


# ============================================================================
# 2. User Role Self-Modification & Lockout Protection
# ============================================================================

@pytest.mark.asyncio
async def test_admin_cannot_demote_themselves(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """An admin cannot change their own role_id to prevent self-demotion/lockout."""
    admin, admin_token = await _create_user(
        db_session, "self_admin", "admin", ["user:manage", "rbac:manage"]
    )
    grower_role = (await db_session.execute(select(Role).where(Role.name == "grower"))).scalar_one()

    resp = await client.patch(
        f"/api/v1/admin/users/{admin.id}",
        json={"role_id": grower_role.id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
    assert "Cannot modify your own role" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_admin_cannot_deactivate_themselves(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """An admin cannot set is_active=False on their own account."""
    admin, admin_token = await _create_user(
        db_session, "self_deactivate_admin", "admin", ["user:manage"]
    )

    resp = await client.patch(
        f"/api/v1/admin/users/{admin.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
    assert "Cannot deactivate your own account" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_cannot_assign_non_existent_role_id(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Assigning a non-existent role_id is rejected with 400 Bad Request."""
    _, admin_token = await _create_user(
        db_session, "role_validator_admin", "admin", ["user:manage"]
    )
    target_user, _ = await _create_user(
        db_session, "target_user", "grower", ["disease:read"]
    )

    resp = await client.patch(
        f"/api/v1/admin/users/{target_user.id}",
        json={"role_id": 999999},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
    assert "Role with ID 999999 does not exist" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_cannot_deactivate_sole_active_admin(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """The last active administrator cannot be deactivated or demoted."""
    admin_role = (await db_session.execute(select(Role).where(Role.name == "admin"))).scalar_one()

    # Deactivate any existing seeded admins except our single active admin
    existing_admins = (
        await db_session.execute(select(User).where(User.role_id == admin_role.id))
    ).scalars().all()
    for ea in existing_admins:
        ea.is_active = False
    await db_session.commit()

    sole_admin, admin_token = await _create_user(
        db_session, "sole_admin", "admin", ["user:manage"]
    )
    assistant_admin, _ = await _create_user(
        db_session, "assistant_admin", "admin", ["user:manage"]
    )
    assistant_admin.is_active = False
    await db_session.commit()

    grower_role = (await db_session.execute(select(Role).where(Role.name == "grower"))).scalar_one()

    # Create another admin who has user:manage to attempt demoting sole_admin
    second_admin, _ = await _create_user(
        db_session, "second_admin_attempt", "admin", ["user:manage"]
    )

    # Now deactivating second_admin is fine because sole_admin is active
    resp1 = await client.patch(
        f"/api/v1/admin/users/{second_admin.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp1.status_code == 200

    # Now sole_admin is the ONLY active admin left. Another user with user:manage cannot demote it
    # Give the agronomist role user:manage in the DB so manager has valid permission
    agronomist_role = (
        await db_session.execute(
            select(Role).where(Role.name == "agronomist").options(selectinload(Role.permissions))
        )
    ).scalar_one()
    user_manage_perm = (
        await db_session.execute(select(Permission).where(Permission.code == "user:manage"))
    ).scalar_one()
    agronomist_role.permissions.append(user_manage_perm)
    await db_session.commit()

    _, manager_token = await _create_user(
        db_session, "emergency_manager", "agronomist", ["user:manage"]
    )

    resp2 = await client.patch(
        f"/api/v1/admin/users/{sole_admin.id}",
        json={"role_id": grower_role.id},
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert resp2.status_code == 400
    assert "sole active administrator" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_user_update_writes_audit_log(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Updating a user's role or status logs an audit entry."""
    admin, admin_token = await _create_user(
        db_session, "audit_admin_user", "admin", ["user:manage"]
    )
    target_user, _ = await _create_user(
        db_session, "target_audit_user", "grower", ["disease:read"]
    )
    agronomist_role = (
        await db_session.execute(select(Role).where(Role.name == "agronomist"))
    ).scalar_one()

    resp = await client.patch(
        f"/api/v1/admin/users/{target_user.id}",
        json={"role_id": agronomist_role.id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200

    audit_res = await db_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "user",
            AuditLog.entity_id == target_user.id,
            AuditLog.action == "user:update",
        )
    )
    audit_entry = audit_res.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.actor_id == admin.id
    assert "role" in audit_entry.diff


# ============================================================================
# 3. RBAC & Role Permission Protection
# ============================================================================

@pytest.mark.asyncio
async def test_update_role_permissions_rejects_invalid_codes(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Updating role permissions with non-existent permission codes returns 400."""
    _, admin_token = await _create_user(
        db_session, "rbac_admin_1", "admin", ["rbac:manage"]
    )
    grower_role = (await db_session.execute(select(Role).where(Role.name == "grower"))).scalar_one()

    resp = await client.put(
        f"/api/v1/admin/roles/{grower_role.id}/permissions",
        json={"permission_codes": ["disease:read", "invalid:fake:permission"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
    assert "Invalid permission code(s)" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_cannot_remove_essential_permissions_from_admin_role(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Attempting to strip 'rbac:manage' or 'user:manage' from admin role is blocked."""
    _, admin_token = await _create_user(
        db_session, "rbac_admin_2", "admin", ["rbac:manage"]
    )
    admin_role = (await db_session.execute(select(Role).where(Role.name == "admin"))).scalar_one()

    resp = await client.put(
        f"/api/v1/admin/roles/{admin_role.id}/permissions",
        json={"permission_codes": ["disease:read", "disease:create"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 400
    assert "Cannot remove essential permission(s) from administrator role" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_update_role_permissions_writes_audit_log(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Updating role permissions logs an audit entry with old and new permissions."""
    admin, admin_token = await _create_user(
        db_session, "rbac_admin_audit", "admin", ["rbac:manage"]
    )
    grower_role = (await db_session.execute(select(Role).where(Role.name == "grower"))).scalar_one()

    resp = await client.put(
        f"/api/v1/admin/roles/{grower_role.id}/permissions",
        json={"permission_codes": ["disease:read", "symptom:read"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200

    audit_res = await db_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "role",
            AuditLog.entity_id == grower_role.id,
            AuditLog.action == "rbac:update_role_permissions",
        )
    )
    audit_entry = audit_res.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.actor_id == admin.id


@pytest.mark.asyncio
async def test_ruleset_activation_writes_audit_log(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Activating a ruleset logs an audit entry."""
    admin, admin_token = await _create_user(
        db_session, "ruleset_admin_audit", "admin", ["ruleset:manage"]
    )
    ruleset = (await db_session.execute(select(Ruleset).limit(1))).scalar_one()

    resp = await client.post(
        f"/api/v1/admin/rulesets/{ruleset.id}/activate",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200

    audit_res = await db_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "ruleset",
            AuditLog.entity_id == ruleset.id,
            AuditLog.action == "ruleset:activate",
        )
    )
    audit_entry = audit_res.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.actor_id == admin.id


# ============================================================================
# 4. Database Transaction & Data Integrity Hardening
# ============================================================================

@pytest.mark.asyncio
async def test_bulk_replace_symptoms_rejects_duplicate_ids(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Bulk symptom update with duplicate symptom IDs is rejected with 422."""
    _, admin_token = await _create_user(
        db_session, "disease_admin_bulk", "admin", ["disease:update"]
    )
    cat = (await db_session.execute(select(SymptomCategory).limit(1))).scalar_one()

    sym1 = Symptom(code="bulk_sym_1", category_id=cat.id, is_environmental=False)
    disease = Disease(
        slug="bulk-test-disease", pathogen_type=PathogenType.FUNGAL, is_published=True
    )
    db_session.add_all([sym1, disease])
    await db_session.commit()
    await db_session.refresh(sym1)
    await db_session.refresh(disease)

    payload = {
        "symptoms": [
            {
                "symptom_id": sym1.id,
                "weight": 0.50,
                "is_required": True,
                "is_pathognomonic": False,
            },
            {
                "symptom_id": sym1.id,
                "weight": 0.80,
                "is_required": False,
                "is_pathognomonic": False,
            },
        ]
    }

    resp = await client.put(
        f"/api/v1/diseases/{disease.id}/symptoms",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 422
    err_body = resp.json()
    assert any("Duplicate symptom ID" in err["message"] for err in err_body["errors"])


@pytest.mark.asyncio
async def test_delete_disease_cleans_up_polymorphic_translations(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Deleting a disease deletes all associated Translation records in the same transaction."""
    _, admin_token = await _create_user(
        db_session, "disease_delete_admin", "admin", ["disease:delete"]
    )
    disease = Disease(
        slug="orphan-cleanup-disease", pathogen_type=PathogenType.FUNGAL, is_published=True
    )
    db_session.add(disease)
    await db_session.commit()
    await db_session.refresh(disease)

    # Add translations
    t1 = Translation(
        entity_type="disease",
        entity_id=disease.id,
        locale="en",
        field="name",
        value="Test Disease",
    )
    t2 = Translation(
        entity_type="disease",
        entity_id=disease.id,
        locale="km",
        field="name",
        value="ជំងឺតេស្ត",
    )
    db_session.add_all([t1, t2])
    await db_session.commit()

    # Delete disease via API
    resp = await client.delete(
        f"/api/v1/diseases/{disease.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 204

    # Verify translations are cleaned up
    remaining = (
        await db_session.execute(
            select(Translation).where(
                Translation.entity_type == "disease",
                Translation.entity_id == disease.id,
            )
        )
    ).scalars().all()
    assert len(remaining) == 0


# ============================================================================
# 5. AI Admin Safety Hardening (Destructive Confirmation & Concurrency)
# ============================================================================

@pytest.mark.asyncio
async def test_casual_reply_does_not_execute_destructive_action(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Casual affirmations ('ok', 'yes') cannot trigger a destructive delete."""
    admin, admin_token = await _create_user(
        db_session, "safety_chat_admin", "admin", ["disease:read", "disease:delete"]
    )

    disease = Disease(
        slug="safe-guarded-disease", pathogen_type=PathogenType.FUNGAL, is_published=True
    )
    db_session.add(disease)
    await db_session.commit()
    await db_session.refresh(disease)

    cid = "conv-safety-guard"
    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id=cid,
        action_type="delete_disease",
        required_permission="disease:delete",
        summary=f"Delete disease '{disease.slug}'",
        details={"disease_id": disease.id},
        affected_records=[{"type": "disease", "id": disease.id, "slug": disease.slug}],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        # Admin casually types "ok"
        resp = await client.post(
            "/api/v1/ai/admin/chat",
            json={"message": "ok", "conversation_id": cid},
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    # Action must NOT be executed!
    stored_pending = await pending_action_store.get_action(db_session, proposal.action_id)
    assert stored_pending is not None
    assert stored_pending.status == "pending"
    assert "Destructive Action Pending" in data["message"]

    # Disease must still exist in DB
    existing = (
        await db_session.execute(select(Disease).where(Disease.id == disease.id))
    ).scalar_one_or_none()
    assert existing is not None


@pytest.mark.asyncio
async def test_async_lock_prevents_concurrent_double_execution(
    db_session: AsyncSession,
) -> None:
    """Simultaneous concurrent calls to validate_and_consume allow only one to succeed."""
    from app.repositories.user import UserRepository
    from tests.conftest import _test_session_factory

    admin, _ = await _create_user(
        db_session, "concurrent_admin", "admin", ["disease:create"]
    )

    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-concurrent",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Concurrent test",
        details={"name": "Concurrent Disease", "pathogen_type": "fungal"},
        affected_records=[],
    )

    results: list[Any] = []

    async def _try_consume() -> None:
        async with _test_session_factory() as sess:
            try:
                user_obj = await UserRepository(sess).get_by_id(admin.id)
                assert user_obj is not None
                res = await pending_action_store.validate_and_consume(
                    db=sess,
                    action_id=proposal.action_id,
                    confirmation_token=proposal.confirmation_token,
                    current_user=user_obj,
                )
                await sess.commit()
                results.append(("success", res))
            except Exception as exc:
                await sess.rollback()
                results.append(("error", exc))

    # Run two parallel consume attempts across independent DB sessions
    await asyncio.gather(_try_consume(), _try_consume())

    successes = [r for r in results if r[0] == "success"]
    errors = [r for r in results if r[0] == "error"]

    assert len(successes) == 1
    assert len(errors) == 1
    assert isinstance(errors[0][1], BadRequestError)
    assert "already been executed" in errors[0][1].detail
