"""Phase 5 security tests: refresh-token family compromise detection & proxy CSRF validation."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.csrf import CSRF_HEADER_NAME
from app.core.rate_limit import login_rate_limiter
from app.core.security import compute_token_hash, decode_token
from app.models.auth import RefreshToken
from scripts.seed import seed_database


@pytest.fixture(autouse=True)
async def _seed_env(db_session: AsyncSession) -> None:
    await seed_database(db_session)
    login_rate_limiter.reset()


def _extract_refresh_cookie(set_cookie_header: str) -> str:
    return set_cookie_header.split("refresh_token=")[1].split(";")[0]


@pytest.mark.asyncio
async def test_rotated_refresh_token_reuse_revokes_entire_family(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    """Reusing an already-rotated refresh token revokes all active descendants in its family."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "family_compromise@example.com",
            "username": "family_compromise",
            "password": "StrongPassword123!",
        },
        headers={"Origin": "http://localhost:5174", "Sec-Fetch-Site": "same-origin"},
    )
    assert reg.status_code == 201
    user_id = int(reg.json()["user"]["id"])
    rt_0 = _extract_refresh_cookie(reg.headers["set-cookie"])
    csrf_0 = reg.headers[CSRF_HEADER_NAME]

    # Rotate rt_0 -> rt_1
    client.cookies.set("refresh_token", rt_0)
    client.cookies.set("sf_csrf", csrf_0)
    rot_1 = await client.post(
        "/api/v1/auth/refresh",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-origin",
            CSRF_HEADER_NAME: csrf_0,
        },
    )
    assert rot_1.status_code == 200
    rt_1 = _extract_refresh_cookie(rot_1.headers["set-cookie"])
    csrf_1 = rot_1.headers[CSRF_HEADER_NAME]

    # Rotate rt_1 -> rt_2
    client.cookies.set("refresh_token", rt_1)
    client.cookies.set("sf_csrf", csrf_1)
    rot_2 = await client.post(
        "/api/v1/auth/refresh",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-origin",
            CSRF_HEADER_NAME: csrf_1,
        },
    )
    assert rot_2.status_code == 200
    rt_2 = _extract_refresh_cookie(rot_2.headers["set-cookie"])
    csrf_2 = rot_2.headers[CSRF_HEADER_NAME]

    # Replay rotated rt_1 -> must return 401 AND revoke active leaf rt_2
    client.cookies.set("refresh_token", rt_1)
    client.cookies.set("sf_csrf", csrf_1)
    replay = await client.post(
        "/api/v1/auth/refresh",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-origin",
            CSRF_HEADER_NAME: csrf_1,
        },
    )
    assert replay.status_code == 401

    # rt_2 is now revoked too!
    client.cookies.set("refresh_token", rt_2)
    client.cookies.set("sf_csrf", csrf_2)
    descendant_resp = await client.post(
        "/api/v1/auth/refresh",
        headers={
            "Origin": "http://localhost:5174",
            "Sec-Fetch-Site": "same-origin",
            CSRF_HEADER_NAME: csrf_2,
        },
    )
    assert descendant_resp.status_code == 401

    # Verify zero unrevoked tokens remain in DB and zero plaintext JTIs were stored
    db_session.expire_all()
    rows = (
        await db_session.execute(select(RefreshToken).where(RefreshToken.user_id == user_id))
    ).scalars().all()
    assert len(rows) == 3
    assert all(r.revoked_at is not None for r in rows)
    for tok in (rt_0, rt_1, rt_2):
        jti = decode_token(tok)["jti"]
        assert any(r.token_hash == compute_token_hash(jti) for r in rows)
        assert all(jti not in r.token_hash for r in rows)


@pytest.mark.asyncio
async def test_logout_revokes_only_target_session_not_other_device_family(
    client: AsyncClient,
) -> None:
    """Explicit logout revokes that session without revoking an independent login family."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "multi_device@example.com",
            "username": "multi_device",
            "password": "StrongPassword123!",
        },
    )
    assert reg.status_code == 201
    rt_device_1 = _extract_refresh_cookie(reg.headers["set-cookie"])
    csrf_1 = reg.headers[CSRF_HEADER_NAME]

    login_2 = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "multi_device", "password": "StrongPassword123!"},
    )
    assert login_2.status_code == 200
    rt_device_2 = _extract_refresh_cookie(login_2.headers["set-cookie"])
    csrf_2 = login_2.headers[CSRF_HEADER_NAME]

    # Logout Device 1 and even replay Device 1's logged-out token
    client.cookies.set("refresh_token", rt_device_1)
    client.cookies.set("sf_csrf", csrf_1)
    out = await client.post(
        "/api/v1/auth/logout",
        headers={"Origin": "http://localhost:5174", CSRF_HEADER_NAME: csrf_1},
    )
    assert out.status_code == 204

    client.cookies.set("refresh_token", rt_device_1)
    client.cookies.set("sf_csrf", csrf_1)
    replay_logged_out = await client.post(
        "/api/v1/auth/refresh",
        headers={"Origin": "http://localhost:5174", CSRF_HEADER_NAME: csrf_1},
    )
    assert replay_logged_out.status_code == 401

    # Device 2 remains valid!
    client.cookies.set("refresh_token", rt_device_2)
    client.cookies.set("sf_csrf", csrf_2)
    dev2_refresh = await client.post(
        "/api/v1/auth/refresh",
        headers={"Origin": "http://localhost:5174", CSRF_HEADER_NAME: csrf_2},
    )
    assert dev2_refresh.status_code == 200


@pytest.mark.asyncio
async def test_trusted_reverse_proxy_forwarded_origin_csrf_validation(
    client: AsyncClient,
) -> None:
    """Trusted proxy X-Forwarded-Proto + Host allows HTTPS origin; untrusted peer cannot spoof."""
    settings = get_settings()
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "proxy_csrf@example.com",
            "username": "proxy_csrf",
            "password": "StrongPassword123!",
        },
    )
    assert reg.status_code == 201
    rt = _extract_refresh_cookie(reg.headers["set-cookie"])
    csrf = reg.headers[CSRF_HEADER_NAME]

    # 1. Untrusted peer spoofing X-Forwarded-Proto/Host in production is rejected (403)
    with (
        patch.object(settings, "ENV", "production"),
        patch.object(settings, "CORS_ORIGINS", "https://sunflower.example.org"),
        patch.object(settings, "TRUSTED_PROXY_IPS", ""),
    ):
        client.cookies.set("refresh_token", rt)
        client.cookies.set("sf_csrf", csrf)
        spoofed = await client.post(
            "/api/v1/auth/refresh",
            headers={
                "Origin": "https://spoofed.example.net",
                "X-Forwarded-Proto": "https",
                "X-Forwarded-Host": "spoofed.example.net",
                "Sec-Fetch-Site": "same-origin",
                CSRF_HEADER_NAME: csrf,
            },
        )
        assert spoofed.status_code == 403

    # 2. Trusted proxy peer (127.0.0.1 in ASGITransport) forwarding HTTPS same-origin succeeds
    with (
        patch.object(settings, "ENV", "production"),
        patch.object(settings, "CORS_ORIGINS", ""),
        patch.object(settings, "TRUSTED_PROXY_IPS", "127.0.0.0/8"),
    ):
        client.cookies.set("refresh_token", rt)
        client.cookies.set("sf_csrf", csrf)
        valid_proxied = await client.post(
            "/api/v1/auth/refresh",
            headers={
                "Origin": "https://sunflower.internal",
                "X-Forwarded-Proto": "https",
                "X-Forwarded-Host": "sunflower.internal",
                "Sec-Fetch-Site": "same-origin",
                CSRF_HEADER_NAME: csrf,
            },
        )
        assert valid_proxied.status_code == 200
