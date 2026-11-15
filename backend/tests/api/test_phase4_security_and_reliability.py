"""Phase 4 automated tests: CSRF, CSP & security headers, maintenance cleanup, and observability."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.csrf import (
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    compute_csrf_token,
    resolve_trusted_origins,
)
from app.core.logging import REDACTED, redact_sensitive_fields
from app.core.rate_limit import login_rate_limiter
from app.core.security import compute_token_hash
from app.main import create_app
from app.models.ai_action import PendingAIAction
from app.models.auth import RefreshToken, Role, User
from app.models.rate_limit import RateLimitEvent
from app.services.maintenance import run_maintenance_cleanup
from scripts.cleanup_expired import build_parser
from scripts.seed import seed_database


@pytest.fixture(autouse=True)
async def _seed_env(db_session: AsyncSession) -> None:
    await seed_database(db_session)
    login_rate_limiter.reset()


def _extract_cookie(set_cookie_headers: list[str], cookie_name: str) -> str:
    prefix = f"{cookie_name}="
    for hdr in set_cookie_headers:
        for part in hdr.split(","):
            trimmed = part.strip()
            if trimmed.startswith(prefix):
                return trimmed[len(prefix) :].split(";", 1)[0]
    raise AssertionError(f"Cookie {cookie_name!r} not found in {set_cookie_headers!r}")


# ============================================================================
# Task 2 & Task 3 — Cookie Auth CSRF Protection Tests
# ============================================================================


@pytest.mark.asyncio
async def test_browser_refresh_and_logout_csrf_happy_path_and_rotation(
    client: AsyncClient,
) -> None:
    """Browser /auth/refresh and /auth/logout succeed with valid Origin + X-CSRF-Token."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "csrf_happy@example.com",
            "username": "csrf_happy",
            "password": "StrongPassword123!",
        },
        headers={"Origin": "http://localhost:5174", "Sec-Fetch-Site": "same-origin"},
    )
    assert reg.status_code == 201
    set_cookies = reg.headers.get_list("set-cookie")
    r1 = _extract_cookie(set_cookies, "refresh_token")
    csrf1 = _extract_cookie(set_cookies, CSRF_COOKIE_NAME)
    assert reg.headers[CSRF_HEADER_NAME] == csrf1
    assert csrf1 == compute_csrf_token(r1)

    # Rotate via browser context
    client.cookies.set("refresh_token", r1)
    client.cookies.set(CSRF_COOKIE_NAME, csrf1)
    ref = await client.post(
        "/api/v1/auth/refresh",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-origin",
            CSRF_HEADER_NAME: csrf1,
        },
    )
    assert ref.status_code == 200
    assert "Origin" in ref.headers.get("Vary", "")
    assert "Sec-Fetch-Site" in ref.headers.get("Vary", "")

    ref_cookies = ref.headers.get_list("set-cookie")
    r2 = _extract_cookie(ref_cookies, "refresh_token")
    csrf2 = _extract_cookie(ref_cookies, CSRF_COOKIE_NAME)
    assert r2 != r1
    assert csrf2 != csrf1
    assert csrf2 == compute_csrf_token(r2)

    # Logout with rotated CSRF token succeeds and invalidates refresh token
    client.cookies.set("refresh_token", r2)
    client.cookies.set(CSRF_COOKIE_NAME, csrf2)
    out = await client.post(
        "/api/v1/auth/logout",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-origin",
            CSRF_HEADER_NAME: csrf2,
        },
    )
    assert out.status_code == 204


@pytest.mark.asyncio
async def test_csrf_blocks_cross_site_untrusted_origin_form_and_token_tampering(
    client: AsyncClient,
) -> None:
    """Cross-site Fetch Metadata, bad Origin/Referer, form POSTs, and forged CSRF tokens -> 403."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "csrf_guard@example.com",
            "username": "csrf_guard",
            "password": "StrongPassword123!",
        },
    )
    assert reg.status_code == 201
    set_cookies = reg.headers.get_list("set-cookie")
    r1 = _extract_cookie(set_cookies, "refresh_token")
    csrf1 = _extract_cookie(set_cookies, CSRF_COOKIE_NAME)

    client.cookies.set("refresh_token", r1)
    client.cookies.set(CSRF_COOKIE_NAME, csrf1)

    # 1. Cross-site Sec-Fetch-Site blocked on both /refresh and /logout
    for endpoint in ("/api/v1/auth/refresh", "/api/v1/auth/logout"):
        cross = await client.post(
            endpoint,
            headers={
                "Origin": "https://evil.example",
                "Sec-Fetch-Site": "cross-site",
                CSRF_HEADER_NAME: csrf1,
            },
        )
        assert cross.status_code == 403
        assert "Sec-Fetch-Site" in cross.headers.get("Vary", "")

    # 2. Untrusted Origin & sandboxed 'null' Origin blocked
    for bad_origin in ("https://evil.example", "null"):
        bad_orig_resp = await client.post(
            "/api/v1/auth/refresh",
            headers={"Origin": bad_origin, CSRF_HEADER_NAME: csrf1},
        )
        assert bad_orig_resp.status_code == 403

    # 3. Untrusted Referer (when Origin omitted) blocked
    bad_ref_resp = await client.post(
        "/api/v1/auth/refresh",
        headers={"Referer": "https://evil.example/csrf.html", CSRF_HEADER_NAME: csrf1},
    )
    assert bad_ref_resp.status_code == 403

    # 4. HTML form Content-Type blocked even without Origin
    form_resp = await client.post(
        "/api/v1/auth/refresh",
        content="a=1",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert form_resp.status_code == 403

    # 5. Browser Origin present but missing X-CSRF-Token -> 403
    missing_hdr = await client.post(
        "/api/v1/auth/refresh",
        headers={"Origin": "http://localhost:5174", "Sec-Fetch-Site": "same-origin"},
    )
    assert missing_hdr.status_code == 403

    # 6. Browser Origin present with forged X-CSRF-Token -> 403
    forged_hdr = await client.post(
        "/api/v1/auth/refresh",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-origin",
            CSRF_HEADER_NAME: "0" * 64,
        },
    )
    assert forged_hdr.status_code == 403

    # 7. Subdomain cookie-tossing attack (sf_csrf cookie overwritten with attacker value) -> 403
    client.cookies.set(CSRF_COOKIE_NAME, "f" * 64)
    tossed = await client.post(
        "/api/v1/auth/refresh",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-site",
            CSRF_HEADER_NAME: csrf1,
        },
    )
    assert tossed.status_code == 403

    # Victim's legitimate token was NOT consumed or revoked by any blocked CSRF attempt!
    client.cookies.set(CSRF_COOKIE_NAME, csrf1)
    valid_after_attacks = await client.post(
        "/api/v1/auth/refresh",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-origin",
            CSRF_HEADER_NAME: csrf1,
        },
    )
    assert valid_after_attacks.status_code == 200


# ============================================================================
# Task 3 — Content Security Policy (CSP), Security Headers & CORS Hardening
# ============================================================================


@pytest.mark.asyncio
async def test_security_headers_csp_and_cors_hardening(client: AsyncClient) -> None:
    """Every API response includes strict CSP and browser isolation headers; wildcard CORS fails."""
    resp = await client.get("/api/v1/diseases")
    assert resp.status_code == 200

    csp = resp.headers["content-security-policy"]
    assert "default-src 'none'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "base-uri 'none'" in csp
    assert "form-action 'none'" in csp
    assert "object-src 'none'" in csp
    assert "'unsafe-eval'" not in csp
    assert "'unsafe-inline'" not in csp

    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["x-frame-options"] == "DENY"
    assert resp.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in resp.headers["permissions-policy"]
    assert resp.headers["cross-origin-opener-policy"] == "same-origin-allow-popups"
    assert resp.headers["cross-origin-resource-policy"] == "same-site"

    # Production settings enforce HSTS, disable /docs, and forbid wildcard '*' CORS
    settings = get_settings()
    with (
        patch.object(settings, "ENV", "production"),
        patch.object(settings, "CORS_ORIGINS", "*"),
        pytest.raises(ValueError, match="Wildcard"),
    ):
        resolve_trusted_origins(settings)

    with (
        patch.object(settings, "ENV", "production"),
        patch.object(settings, "CORS_ORIGINS", "https://sunflower.example.com/"),
    ):
        origins = resolve_trusted_origins(settings)
        assert origins == ["https://sunflower.example.com"]
        prod_app = create_app()
        assert prod_app.docs_url is None
        assert prod_app.redoc_url is None
        async with AsyncClient(
            transport=ASGITransport(app=prod_app),  # type: ignore[arg-type]
            base_url="https://sunflower.example.com",
        ) as prod_client:
            live = await prod_client.get("/health/live")
            assert live.status_code == 200
            assert "max-age=31536000" in live.headers["strict-transport-security"]


# ============================================================================
# Task 4 — Automated Maintenance Cleanup (Idempotency & Active Preservation)
# ============================================================================


@pytest.mark.asyncio
async def test_maintenance_cleanup_dry_run_idempotency_and_active_preservation(
    db_session: AsyncSession,
) -> None:
    """Cleanup prunes expired/past-retention rows, supports dry-run, and keeps active rows."""
    role = (await db_session.execute(select(Role).where(Role.name == "admin"))).scalar_one()
    user = User(
        email="maint_admin@example.com",
        username="maint_admin",
        password_hash="unused-hash",
        role_id=role.id,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    now = datetime.now(UTC)

    # 1. PendingAIAction rows:
    # - active_pending: expires in +10m (MUST survive untouched)
    # - recent_overdue_pending: expired 1h ago (within 24h retention -> marked 'expired')
    # - old_expired_action: expired 48h ago (past 24h retention -> deleted)
    active_pending = PendingAIAction(
        action_id="act-active-1",
        token_hash=compute_token_hash("tok-active"),
        user_id=user.id,
        conversation_id="conv-1",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Active proposal",
        details={"name": "Active"},
        affected_records=[],
        status="pending",
        created_at=now,
        expires_at=now + timedelta(minutes=10),
    )
    recent_overdue_pending = PendingAIAction(
        action_id="act-overdue-recent",
        token_hash=compute_token_hash("tok-overdue"),
        user_id=user.id,
        conversation_id="conv-1",
        action_type="create_disease",
        required_permission="disease:create",
        summary="Overdue proposal within retention",
        details={"name": "Overdue"},
        affected_records=[],
        status="pending",
        created_at=now - timedelta(hours=2),
        expires_at=now - timedelta(hours=1),
    )
    old_expired_action = PendingAIAction(
        action_id="act-old-expired",
        token_hash=compute_token_hash("tok-old"),
        user_id=user.id,
        conversation_id="conv-1",
        action_type="delete_disease",
        required_permission="disease:delete",
        summary="Historical expired proposal",
        details={"id": 999},
        affected_records=[],
        status="cancelled",
        created_at=now - timedelta(hours=50),
        expires_at=now - timedelta(hours=48),
    )

    # 2. RefreshToken rows:
    # - active_rt: unrevoked, expires in +30d (MUST survive)
    # - recent_revoked_rt: revoked 1h ago, expires in +29d (within 24h retention -> MUST survive)
    # - old_revoked_rt: revoked 48h ago (past 24h retention -> deleted)
    # - expired_rt: unrevoked, expired 2h ago (deleted immediately)
    active_rt = RefreshToken(
        token_hash=compute_token_hash("rt-active"),
        family_id="fam-active",
        user_id=user.id,
        expires_at=now + timedelta(days=30),
        revoked_at=None,
        created_at=now,
    )
    recent_revoked_rt = RefreshToken(
        token_hash=compute_token_hash("rt-recent-revoked"),
        family_id="fam-revoked-recent",
        user_id=user.id,
        expires_at=now + timedelta(days=29),
        revoked_at=now - timedelta(hours=1),
        created_at=now - timedelta(days=1),
    )
    old_revoked_rt = RefreshToken(
        token_hash=compute_token_hash("rt-old-revoked"),
        family_id="fam-revoked-old",
        user_id=user.id,
        expires_at=now + timedelta(days=20),
        revoked_at=now - timedelta(hours=48),
        created_at=now - timedelta(days=3),
    )
    expired_rt = RefreshToken(
        token_hash=compute_token_hash("rt-expired"),
        family_id="fam-expired",
        user_id=user.id,
        expires_at=now - timedelta(hours=2),
        revoked_at=None,
        created_at=now - timedelta(days=31),
    )

    # 3. RateLimitEvent rows:
    # - active_rl: expires in +10m (MUST survive)
    # - expired_rl: expired 5m ago (deleted)
    active_rl = RateLimitEvent(
        scope_key=f"auth:login:ip:{compute_token_hash('active-ip')}",
        created_at=now,
        expires_at=now + timedelta(minutes=10),
    )
    expired_rl = RateLimitEvent(
        scope_key=f"auth:login:ip:{compute_token_hash('expired-ip')}",
        created_at=now - timedelta(minutes=20),
        expires_at=now - timedelta(minutes=5),
    )

    db_session.add_all(
        [
            active_pending,
            recent_overdue_pending,
            old_expired_action,
            active_rt,
            recent_revoked_rt,
            old_revoked_rt,
            expired_rt,
            active_rl,
            expired_rl,
        ]
    )
    await db_session.commit()

    # Dry-run preview must report exact counts without changing DB rows
    preview = await run_maintenance_cleanup(
        db_session,
        dry_run=True,
        ai_action_retention_hours=24,
        refresh_token_retention_hours=24,
        expired_token_grace_hours=0,
        rate_limit_retention_hours=0,
        now_override=now,
    )
    assert preview.dry_run is True
    assert preview.marked_expired_ai_actions == 1
    assert preview.deleted_ai_actions == 1
    assert preview.deleted_refresh_tokens == 2
    assert preview.deleted_rate_limit_events == 1
    assert preview.total_deleted == 4

    # Verify dry-run left all rows intact
    assert len((await db_session.execute(select(PendingAIAction))).scalars().all()) == 3
    assert len((await db_session.execute(select(RefreshToken))).scalars().all()) == 4
    assert len((await db_session.execute(select(RateLimitEvent))).scalars().all()) == 2

    # Live execution prunes expired/past-retention rows and marks recent overdue pending as expired
    live = await run_maintenance_cleanup(
        db_session,
        dry_run=False,
        ai_action_retention_hours=24,
        refresh_token_retention_hours=24,
        expired_token_grace_hours=0,
        rate_limit_retention_hours=0,
        now_override=now,
    )
    assert live.dry_run is False
    assert live.marked_expired_ai_actions == 1
    assert live.deleted_ai_actions == 1
    assert live.deleted_refresh_tokens == 2
    assert live.deleted_rate_limit_events == 1

    # Immediate repeat run is 100% idempotent
    repeat = await run_maintenance_cleanup(
        db_session,
        dry_run=False,
        ai_action_retention_hours=24,
        refresh_token_retention_hours=24,
        expired_token_grace_hours=0,
        rate_limit_retention_hours=0,
        now_override=now,
    )
    assert repeat.marked_expired_ai_actions == 0
    assert repeat.total_deleted == 0

    # Verify active & within-retention records remain completely intact
    remaining_ai = {
        r.action_id: r.status
        for r in (await db_session.execute(select(PendingAIAction))).scalars().all()
    }
    assert remaining_ai == {
        "act-active-1": "pending",
        "act-overdue-recent": "expired",
    }

    remaining_rt_hashes = {
        r.token_hash for r in (await db_session.execute(select(RefreshToken))).scalars().all()
    }
    assert remaining_rt_hashes == {
        compute_token_hash("rt-active"),
        compute_token_hash("rt-recent-revoked"),
    }

    remaining_rl_keys = {
        r.scope_key for r in (await db_session.execute(select(RateLimitEvent))).scalars().all()
    }
    assert remaining_rl_keys == {f"auth:login:ip:{compute_token_hash('active-ip')}"}

    #Even with 0h retention across the board, truly active records are NEVER deleted
    aggressive = await run_maintenance_cleanup(
        db_session,
        dry_run=False,
        ai_action_retention_hours=0,
        refresh_token_retention_hours=0,
        expired_token_grace_hours=0,
        rate_limit_retention_hours=0,
        now_override=now,
    )
    assert aggressive.deleted_ai_actions == 1  # act-overdue-recent now eligible
    assert aggressive.deleted_refresh_tokens == 1  # rt-recent-revoked now eligible
    assert aggressive.deleted_rate_limit_events == 0

    assert [
        r.action_id for r in (await db_session.execute(select(PendingAIAction))).scalars().all()
    ] == ["act-active-1"]
    assert [
        r.token_hash for r in (await db_session.execute(select(RefreshToken))).scalars().all()
    ] == [compute_token_hash("rt-active")]


def test_cleanup_cli_parser_arguments() -> None:
    """CLI parser supports --dry-run, --json, and granular retention overrides."""
    parser = build_parser()
    args = parser.parse_args(
        [
            "--dry-run",
            "--json",
            "--ai-retention-hours",
            "48",
            "--token-retention-hours",
            "72",
            "--expired-token-grace-hours",
            "2",
            "--rate-limit-retention-hours",
            "1",
        ]
    )
    assert args.dry_run is True
    assert args.json_output is True
    assert args.ai_retention_hours == 48
    assert args.token_retention_hours == 72
    assert args.expired_token_grace_hours == 2
    assert args.rate_limit_retention_hours == 1


# ============================================================================
# Task 5 — Observability, Readiness Verification & Secret Redaction
# ============================================================================


@pytest.mark.asyncio
async def test_health_live_ready_alembic_verification_and_zero_credential_disclosure(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Readiness verifies Alembic 0004 and never leaks DSNs/passwords on DB failure."""
    live = await client.get("/health/live")
    assert live.status_code == 200
    assert live.json() == {"status": "ok", "version": "0.1.0"}

    # In-memory SQLite has no alembic_version table initially -> 503 uninitialized
    ready_uninit = await client.get("/health/ready")
    assert ready_uninit.status_code == 503
    assert ready_uninit.json()["status"] == "not_ready"
    assert ready_uninit.json()["db"] == "up"
    assert ready_uninit.json()["migration"] == "uninitialized"

    # Create alembic_version with stale revision 0003 -> 503 mismatch
    await db_session.execute(
        text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
    )
    await db_session.execute(text("INSERT INTO alembic_version (version_num) VALUES ('0003')"))
    await db_session.commit()

    ready_mismatch = await client.get("/health/ready")
    assert ready_mismatch.status_code == 503
    assert ready_mismatch.json()["migration"] == "mismatch"

    # Upgrade alembic_version to 0004 -> 200 ready
    await db_session.execute(text("UPDATE alembic_version SET version_num = '0004'"))
    await db_session.commit()

    ready_ok = await client.get("/health/ready")
    assert ready_ok.status_code == 200
    assert ready_ok.json() == {
        "status": "ready",
        "version": "0.1.0",
        "db": "up",
        "migration": "ok",
        "required_revision": "0004",
    }

    # Simulate DB failure containing sensitive DSN credentials -> 503 with ZERO secret leakage
    sensitive_err = OperationalError(
        "SELECT 1",
        {},
        Exception(
            "FATAL: postgresql+asyncpg://sunflower_admin:TopSecretDbPass99@db:5432/sunflower_db"
        ),
    )
    with patch.object(db_session, "execute", new=AsyncMock(side_effect=sensitive_err)):
        health_down = await client.get("/health")
        assert health_down.status_code == 200
        assert health_down.json()["db"] == "down"
        assert "TopSecretDbPass99" not in health_down.text
        assert "postgresql+asyncpg" not in health_down.text

        ready_down = await client.get("/health/ready")
        assert ready_down.status_code == 503
        assert ready_down.json()["db"] == "down"
        assert "TopSecretDbPass99" not in ready_down.text
        assert "postgresql+asyncpg" not in ready_down.text


@pytest.mark.asyncio
async def test_unhandled_exception_sanitization_request_id_and_log_redaction(
    app_instance: FastAPI,
) -> None:
    """Unhandled route errors return sanitized 500 problem+json and log processor scrubs secrets."""

    @app_instance.get("/_test_boom_phase4")
    async def _boom() -> dict[str, str]:
        raise RuntimeError(
            "Connection failed for postgresql+asyncpg://admin:UltraSecretPw@10.0.0.5:5432/prod "
            "with Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret.sig"
        )

    async with AsyncClient(
        transport=ASGITransport(app=app_instance, raise_app_exceptions=False),  # type: ignore[arg-type]
        base_url="http://test",
    ) as ac:
        # Valid correlation ID is echoed back
        resp = await ac.get("/_test_boom_phase4", headers={"X-Request-Id": "corr-id-12345"})
        assert resp.status_code == 500
        assert resp.headers["x-request-id"] == "corr-id-12345"
        assert resp.headers["content-type"].startswith("application/problem+json")
        body = resp.json()
        assert body["status"] == 500
        assert body["detail"] == "An unexpected internal error occurred."
        assert "UltraSecretPw" not in resp.text
        assert "eyJhbGciOiJIUzI1NiJ9" not in resp.text

        # Unsafe X-Request-Id (log injection attempt) is rejected and replaced with fresh UUID4
        bad_id_resp = await ac.get(
            "/health/live",
            headers={"X-Request-Id": "bad id with spaces"},
        )
        assert bad_id_resp.status_code == 200
        assert bad_id_resp.headers["x-request-id"] != "bad id with spaces"
        assert len(bad_id_resp.headers["x-request-id"]) == 36

    # Direct verification of structlog redaction processor
    sample_event = {
        "event": "test.event",
        "password": "my-plain-password",
        "access_token": "jwt-access-secret",
        "refresh_token": "jwt-refresh-secret",
        "confirmation_token": "ai-confirm-secret",
        "database_url": "postgresql+asyncpg://user:pass123@localhost:5434/sunflower_db",
        "token_type": "bearer",
        "deleted_refresh_tokens": 5,
        "nested": {
            "authorization": "Bearer eyJ.secret.payload",
            "dsn_msg": "failed on postgresql://u:pw999@host:5432/db",
        },
    }
    redacted = redact_sensitive_fields(None, "info", sample_event)
    assert redacted["password"] == REDACTED
    assert redacted["access_token"] == REDACTED
    assert redacted["refresh_token"] == REDACTED
    assert redacted["confirmation_token"] == REDACTED
    assert redacted["database_url"] == REDACTED
    # Safe operational fields preserved
    assert redacted["token_type"] == "bearer"
    assert redacted["deleted_refresh_tokens"] == 5
    # Nested secrets & embedded DSNs scrubbed
    assert redacted["nested"]["authorization"] == REDACTED
    assert "pw999" not in redacted["nested"]["dsn_msg"]
    assert f"postgresql://{REDACTED}@host:5432/db" in redacted["nested"]["dsn_msg"]
