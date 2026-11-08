"""Multi-worker PostgreSQL-backed sliding-window rate limiter with spoof-proof IP extraction.

Design & Failure Semantics
--------------------------
1. **Cross-Worker Enforcement (Primary Path):**
   Records sliding-window events in `rate_limit_events` using HMAC-SHA256 hashed scope keys
   (zero PII, emails, IPs, or credentials persisted). On PostgreSQL, acquires transaction-scoped
   advisory locks (`pg_advisory_xact_lock`) in deterministic key order so concurrent workers
   cannot exceed `max_attempts` under parallel bursts. Commits immediately so subsequent 4xx
   responses (e.g., 401 failed login) never roll back recorded attempts.
2. **Proxy Spoofing Protection (`get_client_ip`):**
   `X-Forwarded-For` and `X-Real-IP` headers are completely ignored unless `request.client.host`
   belongs to `TRUSTED_PROXY_IPS`. When behind a trusted proxy, `X-Forwarded-For` is parsed
   right-to-left to select the rightmost untrusted valid IP address.
3. **Database Outage Behavior:**
   Controlled by `RATE_LIMIT_FAIL_CLOSED`:
   - `False` (default): degrades gracefully to a bounded (`max_keys=4096`) process-local
     sliding-window limiter while logging a structured warning.
   - `True`: fails closed with HTTP 503 (`ServiceUnavailableError`).
"""

from __future__ import annotations

import contextlib
import hashlib
import hmac
import ipaddress
import math
import time
from collections import OrderedDict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

import structlog
from fastapi import Request, status
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AppError, ServiceUnavailableError
from app.models.rate_limit import RateLimitEvent

log = structlog.get_logger(__name__)


def _ensure_utc(dt: datetime) -> datetime:
    """Normalize naive (SQLite) or aware (PostgreSQL) timestamps to UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


class RateLimitExceededError(AppError):
    """Raised when request rate exceeds allowed limits (HTTP 429 + Retry-After)."""

    status = status.HTTP_429_TOO_MANY_REQUESTS
    title = "Rate Limit Exceeded"
    type_uri = "/errors/rate-limit-exceeded"

    def __init__(
        self,
        detail: str | None = None,
        retry_after: int = 60,
    ) -> None:
        safe_retry = max(1, int(retry_after))
        msg = detail or f"Too many requests. Please try again in {safe_retry} seconds."
        super().__init__(
            detail=msg,
            headers={"Retry-After": str(safe_retry)},
        )


@dataclass(frozen=True)
class RateLimitRule:
    """Declarative sliding-window rate-limit rule."""

    scope: str
    identifier: str
    max_attempts: int
    window_seconds: int


class RateLimiter(Protocol):
    """Abstract interface for synchronous single-key rate limiting."""

    def check_and_record(self, key: str, max_attempts: int, window_seconds: int) -> None:
        """Record attempt for key and raise RateLimitExceededError if limit breached."""
        ...


class InMemoryRateLimiter:
    """Bounded sliding-window in-memory rate limiter (fallback & unit-test utility)."""

    def __init__(self, max_keys: int = 4096) -> None:
        self.max_keys = max_keys
        self._attempts: OrderedDict[str, list[float]] = OrderedDict()

    def check_and_record(self, key: str, max_attempts: int, window_seconds: int) -> None:
        now = time.time()
        cutoff = now - window_seconds
        existing = self._attempts.get(key, [])
        attempts = [t for t in existing if t > cutoff]

        if len(attempts) >= max_attempts:
            oldest = min(attempts)
            retry_after = max(1, math.ceil((oldest + window_seconds) - now))
            raise RateLimitExceededError(
                detail=f"Too many requests. Please try again in {retry_after} seconds.",
                retry_after=retry_after,
            )

        attempts.append(now)
        if key in self._attempts:
            self._attempts.move_to_end(key)
        self._attempts[key] = attempts

        while len(self._attempts) > self.max_keys:
            self._attempts.popitem(last=False)

    def reset(self, key: str | None = None) -> None:
        """Reset recorded attempts."""
        if key is not None:
            self._attempts.pop(key, None)
        else:
            self._attempts.clear()


def _parse_trusted_networks(entries: list[str]) -> list[ipaddress._BaseNetwork]:
    networks: list[ipaddress._BaseNetwork] = []
    for raw in entries:
        with contextlib.suppress(ValueError):
            networks.append(ipaddress.ip_network(raw, strict=False))
    return networks


def _is_trusted_ip(ip_str: str, networks: list[ipaddress._BaseNetwork]) -> bool:
    if not networks:
        return False
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    return any(addr in net for net in networks)


def is_trusted_ip(ip_str: str) -> bool:
    """Return True if ip_str belongs to configured TRUSTED_PROXY_IPS."""
    clean_ip = ip_str.strip() if ip_str else ""
    if not clean_ip:
        return False
    trusted_nets = _parse_trusted_networks(get_settings().trusted_proxy_list)
    return _is_trusted_ip(clean_ip, trusted_nets)


def is_trusted_proxy_peer(request: Request) -> bool:
    """Return True when the immediate socket peer belongs to `TRUSTED_PROXY_IPS`."""
    peer_host = request.client.host.strip() if request.client and request.client.host else ""
    if not peer_host:
        return False
    trusted_nets = _parse_trusted_networks(get_settings().trusted_proxy_list)
    return _is_trusted_ip(peer_host, trusted_nets)


def get_client_ip(request: Request) -> str:
    """Extract client IP safely without trusting spoofable forwarding headers by default.

    `X-Forwarded-For` and `X-Real-IP` are ignored unless the immediate socket peer
    (`request.client.host`) belongs to `Settings.TRUSTED_PROXY_IPS`.
    """
    peer_host = request.client.host.strip() if request.client and request.client.host else "unknown"
    trusted_nets = _parse_trusted_networks(get_settings().trusted_proxy_list)

    if not _is_trusted_ip(peer_host, trusted_nets):
        return peer_host

    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        # Walk right-to-left: return the rightmost valid IP not belonging to trusted proxies
        candidates = [part.strip() for part in xff.split(",") if part.strip()]
        for candidate in reversed(candidates):
            try:
                ipaddress.ip_address(candidate)
            except ValueError:
                continue
            if not _is_trusted_ip(candidate, trusted_nets):
                return candidate

    x_real_ip = request.headers.get("x-real-ip", "").strip()
    if x_real_ip:
        with contextlib.suppress(ValueError):
            ipaddress.ip_address(x_real_ip)
            return x_real_ip

    return peer_host


def _compute_scope_key(scope: str, identifier: str) -> str:
    """Compute keyed HMAC-SHA256 rate-limit key so no PII or credentials are stored."""
    secret = get_settings().JWT_SECRET.encode("utf-8")
    digest = hmac.new(secret, f"{scope}:{identifier}".encode(), hashlib.sha256).hexdigest()
    return f"{scope}:{digest}"


def _advisory_lock_id(scope_key: str) -> int:
    """Derive deterministic signed 64-bit integer for `pg_advisory_xact_lock(bigint)`."""
    raw = hashlib.sha256(scope_key.encode("utf-8")).digest()[:8]
    return int.from_bytes(raw, byteorder="big", signed=True)


class DatabaseRateLimiter:
    """PostgreSQL-backed sliding-window rate limiter shared across Uvicorn workers."""

    def __init__(self, fallback: InMemoryRateLimiter | None = None) -> None:
        self.fallback = fallback or InMemoryRateLimiter()

    async def check_limits(
        self,
        db: AsyncSession,
        rules: Sequence[RateLimitRule],
    ) -> None:
        """Atomically evaluate and record `rules`, raising `RateLimitExceededError` on breach."""
        settings = get_settings()
        if not settings.RATE_LIMIT_ENABLED or not rules:
            return

        keyed_rules = [(rule, _compute_scope_key(rule.scope, rule.identifier)) for rule in rules]

        try:
            dialect = db.get_bind().dialect.name
            if dialect == "postgresql":
                # Acquire transaction-scoped advisory locks in sorted order to prevent deadlocks
                for lock_id in sorted({_advisory_lock_id(sk) for _, sk in keyed_rules}):
                    await db.execute(
                        text("SELECT pg_advisory_xact_lock(:lock_id)"),
                        {"lock_id": lock_id},
                    )

            now = datetime.now(UTC)

            # 1. Check all rules before recording so a breach on rule 2 doesn't pollute rule 1
            for rule, scope_key in keyed_rules:
                cutoff = now - timedelta(seconds=rule.window_seconds)
                res = await db.execute(
                    select(
                        func.count(RateLimitEvent.id),
                        func.min(RateLimitEvent.created_at),
                    ).where(
                        RateLimitEvent.scope_key == scope_key,
                        RateLimitEvent.created_at > cutoff,
                    )
                )
                count_val, oldest_dt = res.one()
                current_count = int(count_val or 0)
                if current_count >= rule.max_attempts:
                    retry_after = rule.window_seconds
                    if oldest_dt is not None:
                        oldest_utc = _ensure_utc(oldest_dt)
                        remaining = (
                            oldest_utc + timedelta(seconds=rule.window_seconds) - now
                        ).total_seconds()
                        retry_after = max(1, math.ceil(remaining))

                    # Commit empty write transaction to release advisory locks cleanly
                    await db.commit()
                    log.warning(
                        "security.rate_limit.exceeded",
                        scope=rule.scope,
                        retry_after=retry_after,
                    )
                    raise RateLimitExceededError(
                        detail=f"Too many requests. Please try again in {retry_after} seconds.",
                        retry_after=retry_after,
                    )

            # 2. Opportunistically prune expired rows for the touched keys and record events
            scope_keys = [sk for _, sk in keyed_rules]
            await db.execute(
                delete(RateLimitEvent)
                .where(
                    RateLimitEvent.scope_key.in_(scope_keys),
                    RateLimitEvent.expires_at <= now,
                )
                .execution_options(synchronize_session=False)
            )

            for rule, scope_key in keyed_rules:
                db.add(
                    RateLimitEvent(
                        scope_key=scope_key,
                        created_at=now,
                        expires_at=now + timedelta(seconds=rule.window_seconds),
                    )
                )

            await db.commit()

        except RateLimitExceededError:
            raise
        except (SQLAlchemyError, OSError) as exc:
            with contextlib.suppress(Exception):
                await db.rollback()

            scopes = [r.scope for r in rules]
            log.warning(
                "rate_limit.db_unavailable",
                scopes=scopes,
                fail_closed=settings.RATE_LIMIT_FAIL_CLOSED,
                error_type=type(exc).__name__,
            )

            if settings.RATE_LIMIT_FAIL_CLOSED:
                raise ServiceUnavailableError(
                    detail="Rate limiting service temporarily unavailable."
                ) from exc

            for rule, scope_key in keyed_rules:
                self.fallback.check_and_record(
                    scope_key,
                    max_attempts=rule.max_attempts,
                    window_seconds=rule.window_seconds,
                )

    async def cleanup_expired(self, db: AsyncSession) -> int:
        """Delete all expired sliding-window rate-limit rows."""
        now = datetime.now(UTC)
        res = await db.execute(
            delete(RateLimitEvent)
            .where(RateLimitEvent.expires_at <= now)
            .execution_options(synchronize_session=False)
        )
        await db.commit()
        return int(res.rowcount or 0)


login_rate_limiter = InMemoryRateLimiter()
rate_limiter = DatabaseRateLimiter(fallback=login_rate_limiter)
