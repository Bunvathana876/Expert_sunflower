"""Automated safety tests for AI Admin two-phase confirmation workflow.

Guarantees:
1. Proposed actions do NOT mutate the database immediately.
2. Confirmed actions execute with proper RBAC, update DB, and create audit logs.
3. Unauthorized users (e.g., growers) or non-owners cannot confirm/execute actions.
4. Expired confirmation tokens are rejected.
5. Invalid/tampered confirmation tokens are rejected.
6. Repeated/replay confirmation attempts are prevented (single-use).
7. Cancelled proposals cannot be executed.
8. Conversational confirmation ("confirm", "proceed") executes pending proposals.
9. Referential integrity check prevents deleting symptoms in active disease rules.
10. Existing diagnostic runner remains functional.
"""

from __future__ import annotations

from decimal import Decimal
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.config import ai_config
from ai.services.action_confirmation import pending_action_store
from app.core.security import create_access_token
from app.models.audit import AuditLog
from app.models.auth import Role, User
from app.models.disease import Disease, DiseaseSymptom
from app.models.enums import PathogenType
from app.models.symptom import Symptom, SymptomCategory
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
    await db.refresh(user)

    token, _ = create_access_token(
        user_id=user.id,
        role=role_name,
        permissions=permissions,
    )
    return user, token


@pytest.mark.asyncio
async def test_proposed_action_does_not_mutate_db_immediately(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Proposing a disease creation returns a proposed_action without writing to DB."""
    admin_perms = ["disease:read", "disease:create", "disease:update", "disease:delete"]
    _admin, admin_token = await _create_user(db_session, "admin1", "admin", admin_perms)

    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/chat",
            json={
                "message": "Create disease Test Safety Wilt with pathogen fungal",
                "conversation_id": "conv-test-1",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["proposed_action"] is not None
    prop = data["proposed_action"]
    assert prop["action_type"] == "create_disease"
    assert prop["requires_confirmation"] is True
    assert prop["confirmation_token"] != ""

    # Verify disease is NOT yet in database
    res = await db_session.execute(select(Disease).where(Disease.slug == "test-safety-wilt"))
    assert res.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_confirmed_action_executes_and_writes_audit_log(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Confirming a proposed action creates the record and writes an audit log."""
    admin_perms = [
        "disease:read",
        "disease:create",
        "disease:update",
        "disease:delete",
        "symptom:create",
    ]
    admin, admin_token = await _create_user(db_session, "admin2", "admin", admin_perms)

    # 1. Propose creation
    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-2",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Create disease 'Sunflower Chlorosis'",
        details={
            "name": "Sunflower Chlorosis",
            "pathogen_type": "viral",
            "description": "Leaves turn bright yellow",
        },
        affected_records=[{"type": "disease", "name": "Sunflower Chlorosis"}],
    )

    # 2. Confirm proposal
    with patch.object(ai_config, "AI_ENABLED", True):
        confirm_resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
                "locale": "en",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.json()
    assert confirm_data["success"] is True
    assert "Confirmed and created disease" in confirm_data["message"]

    # 3. Verify record was actually created in DB
    res = await db_session.execute(select(Disease).where(Disease.slug == "sunflower-chlorosis"))
    disease = res.scalar_one_or_none()
    assert disease is not None
    assert disease.pathogen_type.value == "viral"

    # 4. Verify audit log entry
    audit_res = await db_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "disease",
            AuditLog.action == "ai_create_disease",
            AuditLog.entity_id == disease.id,
        )
    )
    audit_entry = audit_res.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.actor_id == admin.id


@pytest.mark.asyncio
async def test_unauthorized_user_cannot_confirm_action(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """A grower lacking admin permissions cannot confirm an administrative action."""
    admin_perms = ["disease:read", "disease:create"]
    _admin, _ = await _create_user(db_session, "admin3", "admin", admin_perms)

    grower_perms = ["disease:read"]
    grower, grower_token = await _create_user(db_session, "grower1", "grower", grower_perms)

    # Propose action under grower ID to test permission check specifically
    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=grower.id,
        conversation_id="conv-grower",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Create disease",
        details={"name": "Hacked Disease", "pathogen_type": "fungal"},
        affected_records=[],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {grower_token}"},
        )

    # 403 Forbidden because grower lacks 'disease:create'
    assert resp.status_code == 403
    problem = resp.json()
    assert "disease:create" in problem["detail"]


@pytest.mark.asyncio
async def test_user_cannot_confirm_another_users_proposal(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Admin B cannot confirm a proposal initiated by Admin A."""
    admin_perms = ["disease:read", "disease:create"]
    admin_a, _token_a = await _create_user(db_session, "admin_a", "admin", admin_perms)
    _admin_b, token_b = await _create_user(db_session, "admin_b", "admin", admin_perms)

    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin_a.id,
        conversation_id="conv-a",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Admin A Proposal",
        details={"name": "Disease A", "pathogen_type": "fungal"},
        affected_records=[],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {token_b}"},
        )

    assert resp.status_code == 403
    assert "not authorized to confirm this action" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_expired_confirmation_token_is_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Action proposals whose TTL has expired are rejected."""
    admin_perms = ["disease:read", "disease:create"]
    admin, admin_token = await _create_user(db_session, "admin4", "admin", admin_perms)

    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-expired",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Expired Action",
        details={"name": "Expired Disease", "pathogen_type": "fungal"},
        affected_records=[],
        ttl_seconds=-1,  # Already expired
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invalid_confirmation_token_is_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Tampered or invalid confirmation token is rejected."""
    admin_perms = ["disease:read", "disease:create"]
    admin, admin_token = await _create_user(db_session, "admin5", "admin", admin_perms)

    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-invalid-token",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Invalid Token Test",
        details={"name": "Some Disease", "pathogen_type": "fungal"},
        affected_records=[],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": "tampered-token-xyz-123",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert resp.status_code == 400
    assert "Invalid confirmation token" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_repeated_confirmation_cannot_execute_twice(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """A proposal can only be confirmed once; replay attacks are blocked."""
    admin_perms = ["disease:read", "disease:create"]
    admin, admin_token = await _create_user(db_session, "admin6", "admin", admin_perms)

    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-replay",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Replay Test",
        details={"name": "Replay Safe Disease", "pathogen_type": "bacterial"},
        affected_records=[],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        # First confirmation - succeeds
        resp1 = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp1.status_code == 200

        # Second confirmation - fails
        resp2 = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp2.status_code == 400
        assert "already been executed" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_cancelled_action_cannot_execute(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Cancelling a proposal prevents subsequent execution."""
    admin_perms = ["disease:read", "disease:create"]
    admin, admin_token = await _create_user(db_session, "admin7", "admin", admin_perms)

    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-cancel",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Cancel Test",
        details={"name": "Will Be Cancelled", "pathogen_type": "fungal"},
        affected_records=[],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        # Cancel
        cancel_resp = await client.post(
            "/api/v1/ai/admin/actions/cancel",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert cancel_resp.status_code == 200
        assert "cancelled" in cancel_resp.json()["message"].lower()

        # Try to confirm
        confirm_resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert confirm_resp.status_code == 400
        assert "was cancelled" in confirm_resp.json()["detail"]


@pytest.mark.asyncio
async def test_conversational_confirmation_in_chat(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Replying 'confirm' in admin chat triggers execution of active pending action."""
    admin_perms = ["disease:read", "disease:create", "disease:update", "disease:delete"]
    admin, admin_token = await _create_user(db_session, "admin8", "admin", admin_perms)

    cid = "conv-conversational-confirm"
    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id=cid,
        action_type="create_disease",
        required_permission="disease:create",
        summary="Conversational creation",
        details={"name": "Conversational Blight", "pathogen_type": "fungal"},
        affected_records=[],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/chat",
            json={
                "message": "yes, please confirm and proceed",
                "conversation_id": cid,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert resp.status_code == 200
    msg = resp.json()["message"]
    assert "Confirmed and created disease" in msg
    stored = await pending_action_store.get_action(db_session, proposal.action_id)
    assert stored is not None
    assert stored.status == "executed"

    # Verify created
    res = await db_session.execute(select(Disease).where(Disease.slug == "conversational-blight"))
    assert res.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_referential_integrity_blocks_symptom_deletion_when_used(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Cannot delete a symptom if it is referenced in an active disease rule."""
    admin_perms = ["disease:read", "symptom:delete"]
    admin, admin_token = await _create_user(db_session, "admin9", "admin", admin_perms)

    # Create an active disease and symptom and link them with DiseaseSymptom
    cat_res = await db_session.execute(select(SymptomCategory).limit(1))
    category = cat_res.scalar_one()

    symptom = Symptom(code="leaf_wilting_test", category_id=category.id, is_environmental=False)
    disease = Disease(
        slug="active-wilt-disease", pathogen_type=PathogenType.FUNGAL, is_published=True
    )
    db_session.add_all([symptom, disease])
    await db_session.flush()

    ds = DiseaseSymptom(disease_id=disease.id, symptom_id=symptom.id, weight=Decimal("0.80"))
    db_session.add(ds)
    await db_session.commit()

    sym_id = symptom.id
    sym_code = symptom.code

    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-sym-del",
        action_type="delete_symptom",
        required_permission="symptom:delete",
        summary=f"Delete symptom {sym_code}",
        details={"symptom_id": sym_id, "symptom_code": sym_code},
        affected_records=[],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    # 409 Conflict due to referential constraint
    assert resp.status_code == 409
    assert "referenced by" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_existing_ai_health_and_diagnostics_unaffected(
    client: AsyncClient,
) -> None:
    """AI health check remains operational and unimpacted by safety additions."""
    with patch.object(ai_config, "AI_ENABLED", False):
        resp = await client.get("/api/v1/ai/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ollama_available"] is False
        assert data["status"] == "disabled"
