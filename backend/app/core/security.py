"""Security utilities: password hashing, JWT management, and durable refresh tokens."""

from __future__ import annotations

import contextlib
import hashlib
import hmac
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import structlog
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWTError
from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import UnauthorizedError
from app.models.auth import RefreshToken

log = structlog.get_logger(__name__)

_ph = PasswordHasher()

# Pre-computed dummy hash to prevent timing attacks / user enumeration
_DUMMY_HASH: str = _ph.hash("sunflower-dummy-timing-password")


def _ensure_utc(dt: datetime) -> datetime:
    """Normalize naive (SQLite) or aware (PostgreSQL) timestamps to UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def compute_token_hash(value: str) -> str:
    """Compute keyed HMAC-SHA256 digest using JWT_SECRET.

    Never store plaintext refresh tokens or raw JTIs in the database.
    """
    secret = get_settings().JWT_SECRET.encode("utf-8")
    return hmac.new(secret, value.encode("utf-8"), hashlib.sha256).hexdigest()


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return _ph.hash(password)


def is_legacy_hash(hashed: str) -> bool:
    """Return True if the hash string is in a legacy format (Werkzeug scrypt/pbkdf2)."""
    return hashed.startswith("scrypt:") or hashed.startswith("pbkdf2:")


def _verify_legacy_hash(password: str, hashed: str) -> bool:
    """Verify password against Werkzeug scrypt or pbkdf2 hash format using standard library."""
    try:
        if hashed.startswith("scrypt:"):
            parts = hashed.split("$")
            if len(parts) != 3:
                return False
            method_params = parts[0].split(":")
            n = int(method_params[1])
            r = int(method_params[2])
            p = int(method_params[3])
            salt = parts[1].encode("utf-8")
            target_digest = bytes.fromhex(parts[2])
            derived = hashlib.scrypt(
                password.encode("utf-8"),
                salt=salt,
                n=n,
                r=r,
                p=p,
                maxmem=128 * 1024 * 1024,
            )
            return hmac.compare_digest(derived, target_digest)
        if hashed.startswith("pbkdf2:"):
            parts = hashed.split("$")
            if len(parts) != 3:
                return False
            method_params = parts[0].split(":")
            hash_name = method_params[1]
            iterations = int(method_params[2])
            salt = parts[1].encode("utf-8")
            target_digest = bytes.fromhex(parts[2])
            derived = hashlib.pbkdf2_hmac(
                hash_name,
                password.encode("utf-8"),
                salt,
                iterations,
            )
            return hmac.compare_digest(derived, target_digest)
        return False
    except Exception:
        return False


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against an Argon2id hash or legacy Werkzeug hash."""
    if is_legacy_hash(hashed):
        return _verify_legacy_hash(password, hashed)
    try:
        return _ph.verify(hashed, password)
    except (VerifyMismatchError, Exception):
        return False


def verify_dummy_password(password: str) -> None:
    """Run a real Argon2 verify against a dummy hash to keep timing constant on unknown accounts."""
    with contextlib.suppress(Exception):
        _ph.verify(_DUMMY_HASH, password)


def _build_refresh_jwt(user_id: int) -> tuple[str, str, datetime]:
    """Generate a signed refresh JWT along with its unique JTI and UTC expiry."""
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + timedelta(days=settings.REFRESH_TTL_DAYS)
    token_jti = str(uuid.uuid4())

    claims: dict[str, Any] = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": token_jti,
        "type": "refresh",
    }

    token = jwt.encode(claims, settings.JWT_SECRET, algorithm=settings.JWT_ALG)
    return token, token_jti, expires_at


class RefreshTokenStore:
    """PostgreSQL-backed refresh-token allowlist, rotation, and revocation store.

    Stores only keyed HMAC-SHA256 digests (`token_hash`) so database exposure cannot
    yield usable refresh tokens or raw JTIs. Safe across multiple Uvicorn workers via
    `SELECT ... FOR UPDATE` and atomic conditional `UPDATE` transitions.
    """

    async def issue_token(
        self,
        db: AsyncSession,
        user_id: int,
        jti: str,
        expires_at: datetime | None = None,
        family_id: str | None = None,
    ) -> RefreshToken:
        """Persist a newly issued refresh-token verifier."""
        settings = get_settings()
        now = datetime.now(UTC)
        exp = (
            _ensure_utc(expires_at)
            if expires_at is not None
            else now + timedelta(days=settings.REFRESH_TTL_DAYS)
        )
        token_hash = compute_token_hash(jti)
        family = family_id or str(uuid.uuid4())

        record = RefreshToken(
            token_hash=token_hash,
            family_id=family,
            user_id=user_id,
            expires_at=exp,
            revoked_at=None,
            replaced_by_hash=None,
            created_at=now,
        )
        db.add(record)
        await db.flush()
        return record

    async def is_valid(self, db: AsyncSession, jti: str) -> bool:
        """Return True if the refresh token digest exists, is unrevoked, and has not expired."""
        token_hash = compute_token_hash(jti)
        now = datetime.now(UTC)
        res = await db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
            )
        )
        row = res.scalar_one_or_none()
        if row is None:
            return False
        return _ensure_utc(row.expires_at) > now

    async def revoke_family(
        self,
        db: AsyncSession,
        family_id: str,
        now: datetime | None = None,
    ) -> int:
        """Atomically revoke all active refresh tokens in `family_id`."""
        ts = _ensure_utc(now) if now is not None else datetime.now(UTC)
        res = await db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.family_id == family_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=ts)
            .execution_options(synchronize_session=False)
        )
        return int(res.rowcount or 0)

    async def rotate_token(
        self,
        db: AsyncSession,
        old_jti: str,
        user_id: int,
        *,
        request_started_at: datetime | None = None,
    ) -> tuple[str, str]:
        """Atomically lock, validate, revoke `old_jti`, and persist a single rotated refresh token.

        Compromise Detection & Concurrency Semantics:
        - Acquires `SELECT ... FOR UPDATE` on `token_hash` so concurrent workers serialize cleanly.
        - If `old_jti` was already rotated (`replaced_by_hash` is set):
          * Requests arriving at/before the winning rotation (`arrival_ts <= revoked_at + leeway`)
            while the immediate replacement token is still unrotated/unrevoked are treated as benign
            concurrent browser/worker duplicates and rejected with 401 without revoking the family.
          * Any request arriving AFTER the rotation completed (or replaying an ancestor whose
            replacement has already been rotated/revoked) is treated as refresh-token replay:
            all unrevoked tokens in `row.family_id` are atomically revoked and durably committed
            before raising `UnauthorizedError`.
        """
        arrival_ts = (
            _ensure_utc(request_started_at)
            if request_started_at is not None
            else datetime.now(UTC)
        )
        old_hash = compute_token_hash(old_jti)
        res = await db.execute(
            select(RefreshToken)
            .where(RefreshToken.token_hash == old_hash)
            .with_for_update()
        )
        row = res.scalar_one_or_none()
        if row is None or row.user_id != user_id:
            raise UnauthorizedError(detail="Refresh token has been revoked or is invalid")

        now = datetime.now(UTC)
        if row.revoked_at is not None:
            if row.replaced_by_hash is not None:
                revoked_utc = _ensure_utc(row.revoked_at)
                leeway = timedelta(
                    milliseconds=max(0, get_settings().REFRESH_CONCURRENT_LEEWAY_MS)
                )
                successor = (
                    await db.execute(
                        select(RefreshToken).where(
                            RefreshToken.token_hash == row.replaced_by_hash
                        )
                    )
                ).scalar_one_or_none()
                successor_is_fresh = successor is not None and successor.revoked_at is None

                if successor_is_fresh and arrival_ts <= revoked_utc + leeway:
                    log.info(
                        "security.auth.concurrent_refresh_rejected",
                        user_id=user_id,
                        family_id=row.family_id,
                    )
                    raise UnauthorizedError(detail="Refresh token has been superseded")

                revoked_count = await self.revoke_family(db, row.family_id, now)
                await db.commit()
                log.warning(
                    "security.auth.token_family_compromised",
                    user_id=user_id,
                    family_id=row.family_id,
                    revoked_family_tokens=revoked_count,
                )
                raise UnauthorizedError(
                    detail="Refresh token reuse detected; session family revoked"
                )

            raise UnauthorizedError(detail="Refresh token has been revoked or is invalid")

        if _ensure_utc(row.expires_at) <= now:
            row.revoked_at = now
            await db.commit()
            raise UnauthorizedError(detail="Refresh token has expired")

        new_refresh_jwt, new_jti, new_expires_at = _build_refresh_jwt(user_id)
        new_hash = compute_token_hash(new_jti)
        commit_ts = datetime.now(UTC)

        upd_res = await db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.id == row.id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > commit_ts,
            )
            .values(revoked_at=commit_ts, replaced_by_hash=new_hash)
            .execution_options(synchronize_session=False)
        )
        if upd_res.rowcount != 1:
            raise UnauthorizedError(detail="Refresh token has been revoked or is invalid")

        row.revoked_at = commit_ts
        row.replaced_by_hash = new_hash

        new_record = RefreshToken(
            token_hash=new_hash,
            family_id=row.family_id,
            user_id=user_id,
            expires_at=new_expires_at,
            revoked_at=None,
            replaced_by_hash=None,
            created_at=commit_ts,
        )
        db.add(new_record)
        await db.commit()

        return new_refresh_jwt, new_jti

    async def revoke_token(self, db: AsyncSession, jti: str) -> bool:
        """Durably revoke a single refresh token across all workers."""
        token_hash = compute_token_hash(jti)
        now = datetime.now(UTC)
        res = await db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=now)
            .execution_options(synchronize_session=False)
        )
        await db.commit()
        return bool(res.rowcount)

    async def revoke_all_for_user(self, db: AsyncSession, user_id: int) -> int:
        """Revoke all active refresh tokens belonging to `user_id`."""
        now = datetime.now(UTC)
        res = await db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=now)
            .execution_options(synchronize_session=False)
        )
        await db.flush()
        return int(res.rowcount or 0)

    async def cleanup_expired(
        self,
        db: AsyncSession,
        revoked_retention_seconds: int = 86400,
    ) -> int:
        """Purge expired refresh tokens and historical revoked records past retention."""
        now = datetime.now(UTC)
        revoked_cutoff = now - timedelta(seconds=max(0, revoked_retention_seconds))
        res = await db.execute(
            delete(RefreshToken)
            .where(
                or_(
                    RefreshToken.expires_at <= now,
                    (RefreshToken.revoked_at.is_not(None))
                    & (RefreshToken.revoked_at <= revoked_cutoff),
                )
            )
            .execution_options(synchronize_session=False)
        )
        await db.commit()
        return int(res.rowcount or 0)


token_store = RefreshTokenStore()


def create_access_token(user_id: int, role: str, permissions: list[str]) -> tuple[str, str]:
    """Create a short-lived access token containing user permissions.

    Returns:
        (access_token_str, jti)
    """
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.ACCESS_TTL_MIN)
    token_jti = str(uuid.uuid4())

    claims: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "permissions": permissions,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": token_jti,
        "type": "access",
    }

    token = jwt.encode(claims, settings.JWT_SECRET, algorithm=settings.JWT_ALG)
    return token, token_jti


def create_refresh_token(user_id: int) -> tuple[str, str]:
    """Create a long-lived refresh token JWT with unique JTI.

    Call `await token_store.issue_token(db, user_id, jti)` to persist its digest.

    Returns:
        (refresh_token_str, jti)
    """
    token, token_jti, _ = _build_refresh_jwt(user_id)
    return token, token_jti


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token's signature, algorithm, and expiration.

    Enforces symmetric HS256 verification (rejecting 'none' and asymmetric key confusion attacks),
    expiration validation, and mandatory presence of required claims ('exp', 'sub', 'type').
    """
    settings = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALG],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "require": ["exp", "sub", "type"],
            },
        )
        return payload
    except ExpiredSignatureError as exc:
        raise UnauthorizedError(detail="Token has expired") from exc
    except (InvalidTokenError, PyJWTError) as exc:
        raise UnauthorizedError(detail="Invalid token") from exc
