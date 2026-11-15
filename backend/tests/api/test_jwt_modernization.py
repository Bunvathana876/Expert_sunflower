"""Regression and security tests for PyJWT modernization.

Verifies:
- Symmetric HS256 algorithm enforcement.
- Strict rejection of unsigned tokens (alg='none').
- Strict rejection of algorithm confusion / unexpected algorithms (e.g. RS256, HS384).
- Strict rejection of tampered signatures.
- Strict rejection of expired tokens.
- Strict rejection of tokens with missing required claims ('sub', 'exp', 'type').
- Token type isolation (access vs refresh token usage boundaries).
- Refresh token rotation, family-level revocation, and replay detection using PyJWT.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    token_store,
)
from app.models.auth import User


def _forge_token(
    claims: dict[str, Any],
    *,
    key: str | None = None,
    algorithm: str = "HS256",
    headers: dict[str, Any] | None = None,
) -> str:
    """Construct raw JWTs with custom headers, keys, or algorithms for attack simulation."""
    settings = get_settings()
    signing_key = key if key is not None else settings.JWT_SECRET
    return jwt.encode(claims, signing_key, algorithm=algorithm, headers=headers)


@pytest.mark.asyncio
async def test_jwt_standard_hs256_roundtrip() -> None:
    """Standard access and refresh tokens encode and decode correctly via PyJWT."""
    access_token, jti = create_access_token(
        user_id=42,
        role="grower",
        permissions=["disease:read"],
    )
    assert isinstance(access_token, str)
    assert isinstance(jti, str)

    payload = decode_token(access_token)
    assert payload["sub"] == "42"
    assert payload["role"] == "grower"
    assert payload["permissions"] == ["disease:read"]
    assert payload["type"] == "access"
    assert payload["jti"] == jti
    assert payload["exp"] > time.time()

    refresh_token, r_jti = create_refresh_token(user_id=42)
    r_payload = decode_token(refresh_token)
    assert r_payload["sub"] == "42"
    assert r_payload["type"] == "refresh"
    assert r_payload["jti"] == r_jti
    assert r_payload["exp"] > time.time()


@pytest.mark.asyncio
async def test_jwt_rejects_none_algorithm() -> None:
    """Unsigned tokens using alg='none' are strictly rejected."""
    now = int(time.time())
    unsecured_token = _forge_token(
        {
            "sub": "1",
            "role": "admin",
            "permissions": ["*"],
            "iat": now,
            "exp": now + 3600,
            "type": "access",
            "jti": "fake-jti",
        },
        key="",
        algorithm="none",
    )

    with pytest.raises(UnauthorizedError, match="Invalid token"):
        decode_token(unsecured_token)


@pytest.mark.asyncio
async def test_jwt_rejects_unexpected_algorithms() -> None:
    """Tokens signed with algorithms other than configured JWT_ALG are rejected."""
    settings = get_settings()
    now = int(time.time())
    claims = {
        "sub": "1",
        "role": "admin",
        "permissions": ["*"],
        "iat": now,
        "exp": now + 3600,
        "type": "access",
        "jti": "fake-jti-hs384",
    }
    hs384_token = _forge_token(claims, key=settings.JWT_SECRET, algorithm="HS384")

    with pytest.raises(UnauthorizedError, match="Invalid token"):
        decode_token(hs384_token)


@pytest.mark.asyncio
async def test_jwt_rejects_tampered_signature() -> None:
    """Tampering with token payload or signature yields 401 Unauthorized."""
    access_token, _ = create_access_token(user_id=1, role="grower", permissions=[])
    parts = access_token.split(".")
    assert len(parts) == 3

    # Tamper the signature part
    tampered_sig = parts[2][:-4] + "AAAA"
    tampered_token = f"{parts[0]}.{parts[1]}.{tampered_sig}"

    with pytest.raises(UnauthorizedError, match="Invalid token"):
        decode_token(tampered_token)


@pytest.mark.asyncio
async def test_jwt_rejects_expired_token() -> None:
    """Tokens past expiration raise UnauthorizedError with explicit 'expired' detail."""
    now = int(time.time())
    expired_token = _forge_token(
        {
            "sub": "1",
            "role": "grower",
            "permissions": [],
            "iat": now - 3600,
            "exp": now - 60,
            "type": "access",
            "jti": "expired-jwt",
        }
    )

    with pytest.raises(UnauthorizedError, match="Token has expired"):
        decode_token(expired_token)


@pytest.mark.asyncio
async def test_jwt_rejects_missing_required_claims() -> None:
    """Tokens missing required claims ('sub', 'exp', or 'type') are rejected."""
    now = int(time.time())

    # Missing 'sub'
    t1 = _forge_token({"type": "access", "exp": now + 3600, "jti": "j1"})
    with pytest.raises(UnauthorizedError, match="Invalid token"):
        decode_token(t1)

    # Missing 'type'
    t2 = _forge_token({"sub": "1", "exp": now + 3600, "jti": "j2"})
    with pytest.raises(UnauthorizedError, match="Invalid token"):
        decode_token(t2)

    # Missing 'exp'
    t3 = _forge_token({"sub": "1", "type": "access", "jti": "j3"})
    with pytest.raises(UnauthorizedError, match="Invalid token"):
        decode_token(t3)


@pytest.mark.asyncio
async def test_jwt_auth_endpoints_enforce_type_and_algorithm(client: AsyncClient) -> None:
    """API endpoints reject tokens with invalid algorithms or wrong type via HTTP 401."""
    now = int(time.time())

    # 1. Unsigned 'none' algorithm token to protected endpoint
    none_token = _forge_token(
        {
            "sub": "1",
            "role": "admin",
            "permissions": ["admin:read"],
            "iat": now,
            "exp": now + 3600,
            "type": "access",
            "jti": "none-attack",
        },
        key="",
        algorithm="none",
    )
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {none_token}"},
    )
    assert resp.status_code == 401
    assert "invalid token" in resp.json()["detail"].lower()

    # 2. Refresh token used as Bearer access token
    refresh_token, _ = create_refresh_token(user_id=1)
    resp2 = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert resp2.status_code == 401
    detail = resp2.json()["detail"].lower()
    assert "token type" in detail or "invalid" in detail


@pytest.mark.asyncio
async def test_refresh_token_family_rotation_and_revocation_with_pyjwt(
    db_session: AsyncSession,
) -> None:
    """Verify refresh token store rotation, replacement tracking, and replay revocation."""
    user = User(
        email="pyjwt_rotator@example.com",
        username="pyjwt_user",
        password_hash="argon2_fake_hash",
        role_id=1,
    )
    db_session.add(user)
    await db_session.flush()

    _, jti1 = create_refresh_token(user.id)
    await token_store.issue_token(db_session, user_id=user.id, jti=jti1)
    assert await token_store.is_valid(db_session, jti1)

    # Rotate token1 -> token2
    _, jti2 = await token_store.rotate_token(db_session, old_jti=jti1, user_id=user.id)
    assert not await token_store.is_valid(db_session, jti1)
    assert await token_store.is_valid(db_session, jti2)

    # Replay token1 -> compromise detection triggers family revocation
    with pytest.raises(UnauthorizedError, match="reuse detected"):
        await token_store.rotate_token(
            db_session,
            old_jti=jti1,
            user_id=user.id,
            request_started_at=datetime.now(UTC) + timedelta(seconds=5),
        )

    # Token2 should now be revoked as part of the family
    assert not await token_store.is_valid(db_session, jti2)
