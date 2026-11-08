"""Regression and security audit tests for Phase 6 security controls.

Verifies:
- RFC 7518 compliance: JWT_SECRET minimum length of 32 bytes (256 bits).
- Production environment safeguards: rejection of development placeholder secrets in production.
- Production access control and secret verification for /health/metrics telemetry.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings


def test_jwt_secret_length_validation() -> None:
    """Settings must reject JWT secrets under 32 bytes per RFC 7518."""
    # Under 32 bytes
    with pytest.raises(ValidationError, match="at least 32 bytes"):
        Settings(JWT_SECRET="short-secret-under-32-chars")

    # Exactly 32 bytes
    s_32 = Settings(JWT_SECRET="a" * 32)
    assert s_32.JWT_SECRET == "a" * 32

    # 64 bytes
    s_64 = Settings(JWT_SECRET="a" * 64)
    assert s_64.JWT_SECRET == "a" * 64


def test_production_rejects_placeholder_secrets() -> None:
    """In production (ENV=production), development placeholder keys must be rejected."""
    placeholders = [
        "test-secret-key-with-padding-to-reach-32-bytes-minimum",
        "changeme-security-key-with-padding-to-reach-32-bytes-min",
        "placeholder-super-secret-key-padding-to-reach-32-bytes",
        "default-super-secret-key-padding-to-reach-32-bytes-min",
    ]
    for placeholder in placeholders:
        with pytest.raises(ValidationError, match="insecure development placeholder in production"):
            Settings(ENV="production", JWT_SECRET=placeholder)

    # Valid production secret
    valid_prod = Settings(
        ENV="production",
        JWT_SECRET="production-random-generated-entropy-high-sunflower-key-2026-64-bytes",
    )
    assert valid_prod.is_production is True


@pytest.mark.asyncio
async def test_health_metrics_requires_secret_key_when_configured(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When METRICS_SECRET_KEY is configured, requests without valid header are rejected."""
    settings = get_settings()
    monkeypatch.setattr(settings, "METRICS_SECRET_KEY", "test-metrics-token-secret-1234")

    # Missing header -> 403
    resp_missing = await client.get("/health/metrics")
    assert resp_missing.status_code == 403
    assert "Invalid or missing metrics access key" in resp_missing.json()["detail"]

    # Incorrect header -> 403
    resp_wrong = await client.get(
        "/health/metrics",
        headers={"X-Metrics-Key": "wrong-token-value"},
    )
    assert resp_wrong.status_code == 403
    assert "Invalid or missing metrics access key" in resp_wrong.json()["detail"]

    # Valid header -> 200
    resp_ok = await client.get(
        "/health/metrics",
        headers={"X-Metrics-Key": "test-metrics-token-secret-1234"},
    )
    assert resp_ok.status_code == 200
    assert "db_pool" in resp_ok.json()


@pytest.mark.asyncio
async def test_health_metrics_production_ip_restrictions(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """In production without METRICS_SECRET_KEY, public untrusted IPs receive 403 Forbidden."""
    settings = get_settings()
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "METRICS_SECRET_KEY", "")

    # Simulate untrusted public client IP
    monkeypatch.setattr("app.main.get_client_ip", lambda req: "198.51.100.25")

    resp_forbidden = await client.get("/health/metrics")
    assert resp_forbidden.status_code == 403
    assert "Metrics access restricted in production" in resp_forbidden.json()["detail"]

    # Simulate loopback client IP
    monkeypatch.setattr("app.main.get_client_ip", lambda req: "127.0.0.1")

    resp_allowed = await client.get("/health/metrics")
    assert resp_allowed.status_code == 200
    assert "db_pool" in resp_allowed.json()


@pytest.mark.asyncio
async def test_health_metrics_non_production_ip_restrictions(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """In non-production without METRICS_SECRET_KEY, non-loopback IPs receive 403 Forbidden."""
    settings = get_settings()
    monkeypatch.setattr(settings, "ENV", "development")
    monkeypatch.setattr(settings, "METRICS_SECRET_KEY", "")

    # Untrusted remote IP
    monkeypatch.setattr("app.main.get_client_ip", lambda req: "198.51.100.25")
    resp_remote = await client.get("/health/metrics")
    assert resp_remote.status_code == 403
    assert "Metrics access restricted: authentication required" in resp_remote.json()["detail"]

    # Loopback IP
    monkeypatch.setattr("app.main.get_client_ip", lambda req: "127.0.0.1")
    resp_loopback = await client.get("/health/metrics")
    assert resp_loopback.status_code == 200
    assert "db_pool" in resp_loopback.json()


@pytest.mark.asyncio
async def test_hsts_policy_and_preload_omission(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """HSTS must enforce includeSubDomains without premature preload in production."""
    settings = get_settings()

    # 1. In production: max-age=31536000 and includeSubDomains present; preload omitted
    monkeypatch.setattr(settings, "ENV", "production")
    resp_prod = await client.get("/health/live")
    assert resp_prod.status_code == 200
    hsts_prod = resp_prod.headers.get("Strict-Transport-Security", "")
    assert "max-age=31536000" in hsts_prod
    assert "includeSubDomains" in hsts_prod
    assert "preload" not in hsts_prod, "HSTS preload must not be enabled prematurely"

    # 2. In development: Strict-Transport-Security header omitted
    monkeypatch.setattr(settings, "ENV", "development")
    resp_dev = await client.get("/health/live")
    assert resp_dev.status_code == 200
    assert "Strict-Transport-Security" not in resp_dev.headers


@pytest.mark.asyncio
async def test_ai_vision_route_security_and_disabled_state(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """AI image analysis route requires authentication and honors disable flag."""
    from sqlalchemy import select

    from ai.config import ai_config
    from app.core.security import create_access_token
    from app.models.auth import User
    from scripts.seed import seed_database

    await seed_database(db_session)
    admin = (await db_session.execute(select(User).where(User.username == "admin"))).scalar_one()

    # 1. Unauthenticated request -> 401 Unauthorized
    resp_unauth = await client.post(
        "/api/v1/ai/analyze-image",
        json={"image_base64": "dummy", "locale": "en"},
    )
    assert resp_unauth.status_code == 401

    # 2. Authenticated user when vision is disabled -> 503 Service Unavailable
    token, _ = create_access_token(user_id=admin.id, role="admin", permissions=[])
    monkeypatch.setattr(ai_config, "AI_ENABLED", True)
    monkeypatch.setattr(ai_config, "AI_VISION_ENABLED", False)

    resp_disabled = await client.post(
        "/api/v1/ai/analyze-image",
        headers={"Authorization": f"Bearer {token}"},
        json={"image_base64": "dummy", "locale": "en"},
    )
    assert resp_disabled.status_code == 503
    assert "Vision AI features are currently disabled" in resp_disabled.json()["detail"]


def test_tightened_trusted_proxy_boundary_and_spoof_rejection() -> None:
    """Tightened trust boundary (172.28.2.0/24) blocks forwarded spoofing from untrusted IPs."""
    from starlette.requests import Request

    from app.core.rate_limit import get_client_ip, is_trusted_ip, is_trusted_proxy_peer

    settings = get_settings()

    def _build_req(peer: str, xff: str = "", x_real: str = "") -> Request:
        headers: list[tuple[bytes, bytes]] = []
        if xff:
            headers.append((b"x-forwarded-for", xff.encode("latin-1")))
        if x_real:
            headers.append((b"x-real-ip", x_real.encode("latin-1")))
        scope = {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/auth/login",
            "client": (peer, 54321),
            "headers": headers,
        }
        return Request(scope)

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(settings, "TRUSTED_PROXY_IPS", "172.28.2.0/24,127.0.0.1/32")

        # 1. Untrusted peer (e.g. 10.0.0.5 or 192.168.1.1): broad RFC1918 addresses are NOT trusted
        req_broad_private = _build_req("10.0.0.5", xff="203.0.113.10", x_real="203.0.113.10")
        assert is_trusted_proxy_peer(req_broad_private) is False
        assert get_client_ip(req_broad_private) == "10.0.0.5"

        req_public = _build_req("198.51.100.25", xff="1.2.3.4", x_real="5.6.7.8")
        assert is_trusted_proxy_peer(req_public) is False
        assert get_client_ip(req_public) == "198.51.100.25"

        # 2. Trusted proxy peer inside edge-net (172.28.2.10): XFF safely extracts client IP
        req_trusted = _build_req(
            "172.28.2.10",
            xff="1.1.1.1, 203.0.113.42, 172.28.2.5",
        )
        assert is_trusted_proxy_peer(req_trusted) is True
        assert get_client_ip(req_trusted) == "203.0.113.42"

        # 3. is_trusted_ip verification
        assert is_trusted_ip("172.28.2.1") is True
        assert is_trusted_ip("172.28.2.254") is True
        assert is_trusted_ip("127.0.0.1") is True
        assert is_trusted_ip("10.0.0.1") is False
        assert is_trusted_ip("192.168.1.1") is False
        assert is_trusted_ip("172.16.0.1") is False


@pytest.mark.asyncio
async def test_health_metrics_tightened_trusted_proxy_access(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """In production, /health/metrics allows edge-net proxy IPs and denies broad private IPs."""
    settings = get_settings()
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "METRICS_SECRET_KEY", "")
    monkeypatch.setattr(settings, "TRUSTED_PROXY_IPS", "172.28.2.0/24,127.0.0.1/32")

    # 1. IP in verified edge-net proxy subnet -> 200 OK
    monkeypatch.setattr("app.main.get_client_ip", lambda req: "172.28.2.15")
    resp_trusted = await client.get("/health/metrics")
    assert resp_trusted.status_code == 200
    assert "db_pool" in resp_trusted.json()

    # 2. IP in former broad 10.0.0.0/8 subnet -> 403 Forbidden
    monkeypatch.setattr("app.main.get_client_ip", lambda req: "10.0.1.20")
    resp_untrusted = await client.get("/health/metrics")
    assert resp_untrusted.status_code == 403
    assert "Metrics access restricted in production" in resp_untrusted.json()["detail"]
