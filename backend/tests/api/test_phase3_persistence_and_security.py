"""Phase 3 tests: persistent AI actions, durable refresh tokens, and rate-limiting security."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import Request
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from ai.config import ai_config
from ai.services.action_confirmation import (
    PendingActionStore,
    compute_action_token_hash,
    pending_action_store,
)
from app.core.config import get_settings
from app.core.errors import ServiceUnavailableError
from app.core.rate_limit import (
    DatabaseRateLimiter,
    InMemoryRateLimiter,
    RateLimitExceededError,
    RateLimitRule,
    get_client_ip,
    login_rate_limiter,
)
from app.core.security import (
    RefreshTokenStore,
    compute_token_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    token_store,
)
from app.models.ai_action import PendingAIAction
from app.models.audit import AuditLog
from app.models.auth import RefreshToken, Role, User
from app.models.disease import Disease
from app.models.enums import PathogenType
from app.models.rate_limit import RateLimitEvent
from scripts.seed import seed_database


@pytest.fixture(autouse=True)
async def _seed_env(db_session: AsyncSession) -> None:
    await seed_database(db_session)
    login_rate_limiter.reset()


async def _make_user(
    db: AsyncSession,
    username: str,
    role_name: str,
    permissions: list[str],
) -> tuple[User, str]:
    role = (await db.execute(select(Role).where(Role.name == role_name))).scalar_one()
    user = User(
        email=f"{username}@example.com",
        username=username,
        password_hash="not-used-for-bearer-tests",
        role_id=role.id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    access_token, _ = create_access_token(user.id, role_name, permissions)
    return user, access_token


# ============================================================================
# Task 2 — Persistent AI Admin Action Storage Tests
# ============================================================================


@pytest.mark.asyncio
async def test_pending_action_never_stores_raw_token_and_survives_restart(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Confirmation token is hashed at rest (HMAC-SHA256) and survives store re-instantiation."""
    admin, admin_token = await _make_user(
        db_session,
        "persist_admin",
        "admin",
        ["disease:read", "disease:create"],
    )

    store_instance_1 = PendingActionStore()
    proposal = await store_instance_1.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-persist-1",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Create disease 'Durable Rust'",
        details={"name": "Durable Rust", "pathogen_type": "fungal"},
        affected_records=[{"entity_type": "disease", "name": "Durable Rust"}],
    )

    raw_token = proposal.confirmation_token
    assert raw_token != ""

    # Inspect raw DB row: plaintext token must NEVER appear in storage
    db_row = (
        await db_session.execute(
            select(PendingAIAction).where(PendingAIAction.action_id == proposal.action_id)
        )
    ).scalar_one()
    assert db_row.token_hash != raw_token
    assert db_row.token_hash == compute_action_token_hash(raw_token)
    assert raw_token not in str(db_row.details)
    assert raw_token not in str(db_row.summary)

    # Simulate process restart: a fresh PendingActionStore has zero in-memory state
    fresh_store = PendingActionStore()
    loaded = await fresh_store.get_action(db_session, proposal.action_id)
    assert loaded is not None
    assert loaded.status == "pending"
    assert loaded.confirmation_token == ""  # Never reconstructed from DB

    # Confirm via API endpoint using the newly persisted DB state
    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": raw_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    after_row = (
        await db_session.execute(
            select(PendingAIAction).where(PendingAIAction.action_id == proposal.action_id)
        )
    ).scalar_one()
    assert after_row.status == "executed"
    assert after_row.executed_at is not None


@pytest.mark.asyncio
async def test_action_execution_failure_rolls_back_and_marks_failed(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Failed action execution rolls back domain/audit writes and marks status 'failed'."""
    admin, admin_token = await _make_user(
        db_session,
        "rollback_admin",
        "admin",
        ["disease:read", "disease:create"],
    )

    # Pre-insert a conflicting disease slug AFTER proposal creation to force execution failure
    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="conv-fail-rollback",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Create conflicting disease",
        details={
            "name": "Collision Blight",
            "slug": "collision-blight",
            "pathogen_type": "fungal",
        },
        affected_records=[],
    )

    pre_existing = Disease(
        slug="collision-blight",
        pathogen_type=PathogenType.BACTERIAL,
        is_published=True,
    )
    db_session.add(pre_existing)
    await db_session.commit()

    with patch.object(ai_config, "AI_ENABLED", True):
        resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert resp.status_code == 409

    # Proposal must be marked 'failed', NEVER 'executed'
    action_row = (
        await db_session.execute(
            select(PendingAIAction).where(PendingAIAction.action_id == proposal.action_id)
        )
    ).scalar_one()
    assert action_row.status == "failed"
    assert action_row.executed_at is None
    assert action_row.error_detail is not None
    assert "collision-blight" in action_row.error_detail

    # Zero false audit log entries may exist for the failed AI action
    audits = (
        await db_session.execute(
            select(AuditLog).where(AuditLog.action == "ai_create_disease")
        )
    ).scalars().all()
    assert len(audits) == 0

    # Retrying a failed proposal must be rejected with 400
    with patch.object(ai_config, "AI_ENABLED", True):
        retry_resp = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={
                "action_id": proposal.action_id,
                "confirmation_token": proposal.confirmation_token,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
    assert retry_resp.status_code == 400
    assert "previously failed" in retry_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_conversational_negation_and_casual_replies_never_mutate(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Casual affirmations and negated phrases ('do not confirm') never execute."""
    admin, admin_token = await _make_user(
        db_session,
        "conv_guard_admin",
        "admin",
        ["disease:read", "disease:create"],
    )

    cid = "conv-negation-guard"
    proposal = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id=cid,
        action_type="create_disease",
        required_permission="disease:create",
        summary="Create Guarded Spot",
        details={"name": "Guarded Spot", "slug": "guarded-spot", "pathogen_type": "fungal"},
        affected_records=[],
    )

    with patch.object(ai_config, "AI_ENABLED", True):
        # 1. Casual reply 'sure' must NOT execute even non-destructive actions
        casual_resp = await client.post(
            "/api/v1/ai/admin/chat",
            json={"message": "sure", "conversation_id": cid},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert casual_resp.status_code == 200
        state_after_casual = await pending_action_store.get_action(db_session, proposal.action_id)
        assert state_after_casual is not None
        assert state_after_casual.status == "pending"

        # 2. Negated phrase 'please do not confirm' cancels rather than executing
        neg_resp = await client.post(
            "/api/v1/ai/admin/chat",
            json={"message": "please do not confirm", "conversation_id": cid},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert neg_resp.status_code == 200
        state_after_neg = await pending_action_store.get_action(db_session, proposal.action_id)
        assert state_after_neg is not None
        assert state_after_neg.status == "cancelled"

    created = (
        await db_session.execute(select(Disease).where(Disease.slug == "guarded-spot"))
    ).scalar_one_or_none()
    assert created is None


@pytest.mark.asyncio
async def test_pending_action_cleanup_expired_preserves_active_and_purges_old(
    db_session: AsyncSession,
) -> None:
    """cleanup_expired marks overdue pending proposals expired and deletes old terminal rows."""
    admin, _ = await _make_user(db_session, "cleanup_admin", "admin", ["disease:create"])

    active = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="c-active",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Active",
        details={"name": "Active"},
        affected_records=[],
        ttl_seconds=300,
    )
    just_expired = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="c-just-expired",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Just Expired",
        details={"name": "Just Expired"},
        affected_records=[],
        ttl_seconds=-5,
    )
    ancient = await pending_action_store.create_proposal(
        db=db_session,
        user_id=admin.id,
        conversation_id="c-ancient",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Ancient Expired",
        details={"name": "Ancient"},
        affected_records=[],
        ttl_seconds=-7200,
    )

    deleted_count = await pending_action_store.cleanup_expired(db_session, retention_seconds=3600)
    assert deleted_count == 1

    assert (await pending_action_store.get_action(db_session, ancient.action_id)) is None
    just_exp_row = await pending_action_store.get_action(db_session, just_expired.action_id)
    assert just_exp_row is not None and just_exp_row.status == "expired"
    active_row = await pending_action_store.get_action(db_session, active.action_id)
    assert active_row is not None and active_row.status == "pending"


# ============================================================================
# Task 3 — Persistent Refresh Token Security Tests
# ============================================================================


@pytest.mark.asyncio
async def test_refresh_token_stores_only_hmac_digest_and_survives_restart(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Refresh tokens never persist raw JWTs or raw JTIs and survive store re-instantiation."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "durable_refresh@example.com",
            "username": "durable_refresh",
            "password": "StrongPassword123!",
        },
    )
    assert reg.status_code == 201
    raw_refresh = reg.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]
    payload = decode_token(raw_refresh)
    raw_jti = payload["jti"]

    rows = (await db_session.execute(select(RefreshToken))).scalars().all()
    assert len(rows) == 1
    stored = rows[0]
    assert stored.token_hash != raw_refresh
    assert stored.token_hash != raw_jti
    assert stored.token_hash == compute_token_hash(raw_jti)

    # Fresh RefreshTokenStore instance sees active token and revocation from DB
    fresh_store = RefreshTokenStore()
    assert await fresh_store.is_valid(db_session, raw_jti) is True

    # Logout revokes durably in DB
    client.cookies.set("refresh_token", raw_refresh)
    logout_resp = await client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 204

    assert await fresh_store.is_valid(db_session, raw_jti) is False

    # Replay after simulated restart is rejected
    client.cookies.set("refresh_token", raw_refresh)
    replay_resp = await client.post("/api/v1/auth/refresh")
    assert replay_resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_cannot_authenticate_as_bearer_access_token(
    client: AsyncClient,
) -> None:
    """Passing a refresh JWT in Authorization: Bearer must fail with 401 Invalid token type."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "type_confusion@example.com",
            "username": "type_confusion",
            "password": "StrongPassword123!",
        },
    )
    raw_refresh = reg.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {raw_refresh}"},
    )
    assert resp.status_code == 401
    assert "token type" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_deactivation_and_password_change_revoke_refresh_tokens(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Deactivating a user or changing password revokes existing refresh tokens."""
    _, admin_token = await _make_user(
        db_session,
        "deactivator_admin",
        "admin",
        ["user:manage"],
    )

    # 1. Password change revokes prior refresh token
    reg1 = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pw_rotate@example.com",
            "username": "pw_rotate",
            "password": "OldPassword123!",
        },
    )
    access1 = reg1.json()["access_token"]
    refresh1 = reg1.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

    pw_resp = await client.patch(
        "/api/v1/users/me",
        json={
            "current_password": "OldPassword123!",
            "new_password": "NewPassword456!",
        },
        headers={"Authorization": f"Bearer {access1}"},
    )
    assert pw_resp.status_code == 200

    client.cookies.set("refresh_token", refresh1)
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401

    # 2. Admin deactivation revokes active refresh tokens
    reg2 = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "deact_target@example.com",
            "username": "deact_target",
            "password": "ValidPassword123!",
        },
    )
    target_id = reg2.json()["user"]["id"]
    refresh2 = reg2.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

    deact_resp = await client.patch(
        f"/api/v1/admin/users/{target_id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert deact_resp.status_code == 200

    client.cookies.set("refresh_token", refresh2)
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_cleanup_expired(db_session: AsyncSession) -> None:
    """token_store.cleanup_expired deletes expired tokens and retains active tokens."""
    user, _ = await _make_user(db_session, "tok_cleanup_user", "grower", ["disease:read"])
    now = datetime.now(UTC)

    _, active_jti = create_refresh_token(user.id)
    await token_store.issue_token(
        db_session,
        user.id,
        active_jti,
        expires_at=now + timedelta(days=7),
    )

    _, expired_jti = create_refresh_token(user.id)
    await token_store.issue_token(
        db_session,
        user.id,
        expired_jti,
        expires_at=now - timedelta(minutes=5),
    )
    await db_session.commit()

    purged = await token_store.cleanup_expired(db_session)
    assert purged == 1
    assert await token_store.is_valid(db_session, active_jti) is True
    assert await token_store.is_valid(db_session, expired_jti) is False


# ============================================================================
# Task 5 — API Rate Limiting & Proxy Spoofing Security Tests
# ============================================================================


@pytest.mark.asyncio
async def test_rate_limiting_priority_endpoints_return_429_and_retry_after(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Priority endpoints enforce limits, emit Retry-After, and store zero PII in DB."""
    settings = get_settings()
    admin, admin_token = await _make_user(
        db_session,
        "rl_admin",
        "admin",
        ["disease:read", "disease:create"],
    )

    # Override AI admin chat user limit to 2 for deterministic fast test
    with (
        patch.object(settings, "RATE_LIMIT_AI_ADMIN_USER_MAX", 2),
        patch.object(ai_config, "AI_ENABLED", False),
    ):
        r1 = await client.post(
            "/api/v1/ai/admin/chat",
            json={"message": "list diseases"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        r2 = await client.post(
            "/api/v1/ai/admin/chat",
            json={"message": "list diseases"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        # First 2 pass rate limiter (reach AI_ENABLED=False -> 503)
        assert r1.status_code == 503
        assert r2.status_code == 503

        # 3rd request is blocked by rate limiter with 429 + Retry-After
        r3 = await client.post(
            "/api/v1/ai/admin/chat",
            json={"message": "list diseases"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r3.status_code == 429
        assert r3.headers["content-type"].startswith("application/problem+json")
        assert "retry-after" in r3.headers
        assert int(r3.headers["retry-after"]) >= 1
        assert r3.json()["type"] == "/errors/rate-limit-exceeded"

    # Also test register rate limit
    with patch.object(settings, "RATE_LIMIT_REGISTER_IP_MAX", 2):
        for idx in range(2):
            reg = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": f"rl_reg_{idx}@example.com",
                    "username": f"rl_reg_{idx}",
                    "password": "Password123!",
                },
            )
            assert reg.status_code == 201

        reg_blocked = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "rl_reg_3@example.com",
                "username": "rl_reg_3",
                "password": "Password123!",
            },
        )
        assert reg_blocked.status_code == 429
        assert int(reg_blocked.headers["retry-after"]) >= 1

    # Also test AI confirm rate limit and /users/me rate limit
    with (
        patch.object(settings, "RATE_LIMIT_AI_CONFIRM_USER_MAX", 1),
        patch.object(ai_config, "AI_ENABLED", False),
    ):
        c1 = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={"action_id": "nonexistent", "confirmation_token": "tok"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert c1.status_code == 503
        c2 = await client.post(
            "/api/v1/ai/admin/actions/confirm",
            json={"action_id": "nonexistent", "confirmation_token": "tok"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert c2.status_code == 429
        assert int(c2.headers["retry-after"]) >= 1

    with patch.object(settings, "RATE_LIMIT_PROFILE_USER_MAX", 1):
        p1 = await client.patch(
            "/api/v1/users/me",
            json={"username": "rl_admin_x", "current_password": "wrongPassword!"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert p1.status_code == 401
        p2 = await client.patch(
            "/api/v1/users/me",
            json={"username": "rl_admin_x", "current_password": "wrongPassword!"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert p2.status_code == 429
        assert int(p2.headers["retry-after"]) >= 1

    # Verify zero plaintext usernames, emails, IPs, or raw user IDs are stored in rate_limit_events
    events = (await db_session.execute(select(RateLimitEvent))).scalars().all()
    assert len(events) > 0
    for ev in events:
        assert "rl_admin" not in ev.scope_key
        assert "example.com" not in ev.scope_key
        assert "127.0.0.1" not in ev.scope_key
        scope_prefix, digest_part = ev.scope_key.rsplit(":", 1)
        assert scope_prefix in {
            "ai:admin_chat:user",
            "ai:admin_chat:ip",
            "auth:register:ip",
            "ai:admin_confirm:user",
            "ai:admin_confirm:ip",
            "users:me:user",
            "users:me:ip",
        }
        assert digest_part != str(admin.id)
        assert len(digest_part) == 64
        int(digest_part, 16)  # Valid 256-bit hex HMAC digest


@pytest.mark.asyncio
async def test_spoofed_x_forwarded_for_does_not_bypass_rate_limit(
    client: AsyncClient,
) -> None:
    """Rotating spoofed X-Forwarded-For headers from an untrusted peer cannot bypass limits."""
    settings = get_settings()
    with (
        patch.object(settings, "TRUSTED_PROXY_IPS", ""),
        patch.object(settings, "RATE_LIMIT_REFRESH_IP_MAX", 3),
    ):
        for i in range(3):
            resp = await client.post(
                "/api/v1/auth/refresh",
                headers={
                    "X-Forwarded-For": f"198.51.100.{i + 1}",
                    "X-Real-IP": f"203.0.113.{i + 1}",
                },
            )
            # Reaches missing cookie check -> 401
            assert resp.status_code == 401

        # 4th attempt with a brand-new spoofed IP MUST still be blocked (429)!
        spoof_attempt = await client.post(
            "/api/v1/auth/refresh",
            headers={
                "X-Forwarded-For": "203.0.113.250",
                "X-Real-IP": "203.0.113.250",
            },
        )
        assert spoof_attempt.status_code == 429
        assert "retry-after" in spoof_attempt.headers


def test_trusted_proxy_right_to_left_xff_extraction() -> None:
    """When peer is in TRUSTED_PROXY_IPS, XFF selects rightmost untrusted valid IP."""
    settings = get_settings()

    def _build_req(peer: str, xff: str) -> Request:
        scope = {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/auth/login",
            "client": (peer, 54321),
            "headers": [(b"x-forwarded-for", xff.encode("latin-1"))],
        }
        return Request(scope)

    # Untrusted peer: ignores XFF completely
    with patch.object(settings, "TRUSTED_PROXY_IPS", "10.0.0.0/8"):
        req_untrusted = _build_req("192.0.2.99", "1.2.3.4, 5.6.7.8")
        assert get_client_ip(req_untrusted) == "192.0.2.99"

        # Trusted peer: skips trusted proxy hop (10.1.2.3) and ignores spoofed leftmost (1.1.1.1)
        req_trusted = _build_req("10.0.0.5", "1.1.1.1, 203.0.113.42, 10.1.2.3")
        assert get_client_ip(req_trusted) == "203.0.113.42"


@pytest.mark.asyncio
async def test_rate_limiter_db_failure_fallback_and_fail_closed_modes(
    db_session: AsyncSession,
) -> None:
    """DB operational failures degrade to bounded memory limiter or fail closed (503) per config."""
    settings = get_settings()
    fallback_mem = InMemoryRateLimiter(max_keys=16)
    limiter = DatabaseRateLimiter(fallback=fallback_mem)
    rule = RateLimitRule(
        scope="test:outage",
        identifier="client-1",
        max_attempts=2,
        window_seconds=60,
    )

    # Simulate DB failure on execute
    with (
        patch.object(
            db_session,
            "execute",
            new=AsyncMock(side_effect=OperationalError("SELECT 1", {}, Exception("db down"))),
        ),
        patch.object(settings, "RATE_LIMIT_FAIL_CLOSED", False),
    ):
        await limiter.check_limits(db_session, [rule])
        await limiter.check_limits(db_session, [rule])
        with pytest.raises(RateLimitExceededError):
            await limiter.check_limits(db_session, [rule])

    # Fail-closed mode raises 503 ServiceUnavailableError immediately
    with (
        patch.object(
            db_session,
            "execute",
            new=AsyncMock(side_effect=OperationalError("SELECT 1", {}, Exception("db down"))),
        ),
        patch.object(settings, "RATE_LIMIT_FAIL_CLOSED", True),
        pytest.raises(ServiceUnavailableError),
    ):
        await limiter.check_limits(db_session, [rule])
