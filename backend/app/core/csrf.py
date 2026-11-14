"""CSRF protection and trusted-origin validation for cookie-authenticated endpoints.

Implements defense-in-depth CSRF protection per OWASP & Modern Web Guidance:
  1. Disallows simple HTML form Content-Types on cookie-authenticated endpoints.
  2. Enforces Fetch Metadata isolation (`Sec-Fetch-Site` != `cross-site`).
  3. Validates `Origin` / `Referer` against an explicit trusted-origin allowlist.
  4. Binds a cryptographic HMAC-SHA256 `X-CSRF-Token` (`sf_csrf`) to the active
     `HttpOnly` refresh token so cross-site or cookie-tossing attackers cannot
     forge a valid token.
"""

from __future__ import annotations

import hashlib
import hmac
from typing import TYPE_CHECKING
from urllib.parse import urlsplit

import structlog
from fastapi import Request, Response

from app.core.config import get_settings
from app.core.errors import ForbiddenError
from app.core.rate_limit import is_trusted_proxy_peer

if TYPE_CHECKING:
    from app.core.config import Settings

log = structlog.get_logger(__name__)

CSRF_COOKIE_NAME = "sf_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_VARY_HEADERS = "Origin, Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site"

_FORM_CONTENT_TYPES: frozenset[str] = frozenset(
    {
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
    }
)

_ALLOWED_SEC_FETCH_SITES: frozenset[str] = frozenset(
    {
        "same-origin",
        "same-site",
        "none",
    }
)

DEV_LOCAL_ORIGINS: tuple[str, ...] = (
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
)


def resolve_trusted_origins(settings: Settings) -> list[str]:
    """Return normalized explicit CORS / CSRF trusted origins (never wildcard '*')."""
    configured: list[str] = []
    for raw_origin in settings.cors_origins_list:
        if raw_origin == "*":
            if settings.is_production:
                raise ValueError(
                    "Wildcard '*' in CORS_ORIGINS is forbidden when credentials are enabled."
                )
            log.warning("security.cors.wildcard_ignored")
            continue

        parts = urlsplit(raw_origin)
        if parts.scheme not in {"http", "https"} or not parts.netloc:
            log.warning("security.cors.invalid_origin_ignored", origin=raw_origin)
            continue

        normalized = f"{parts.scheme}://{parts.netloc}"
        if normalized not in configured:
            configured.append(normalized)

    if settings.is_production:
        if not configured:
            log.warning("security.cors.empty_in_production")
        return configured

    merged = list(configured)
    for dev_origin in DEV_LOCAL_ORIGINS:
        if dev_origin not in merged:
            merged.append(dev_origin)
    return merged


def compute_csrf_token(refresh_token: str) -> str:
    """Compute a domain-separated HMAC-SHA256 CSRF token bound to `refresh_token`.

    Reveals zero information about `refresh_token` or `JWT_SECRET`, while preventing
    subdomain cookie-tossing because only the server can compute a digest matching the
    caller's `HttpOnly` refresh cookie.
    """
    secret = get_settings().JWT_SECRET.encode("utf-8")
    refresh_digest = hmac.new(secret, refresh_token.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.new(secret, f"csrf:{refresh_digest}".encode(), hashlib.sha256).hexdigest()


def attach_csrf_vary_headers(response: Response) -> None:
    """Ensure intermediate caches vary on Origin and Fetch Metadata headers."""
    existing = response.headers.get("Vary", "")
    existing_parts = [p.strip() for p in existing.split(",") if p.strip()]
    existing_lower = {p.lower() for p in existing_parts}
    for required in ("Origin", "Sec-Fetch-Dest", "Sec-Fetch-Mode", "Sec-Fetch-Site"):
        if required.lower() not in existing_lower:
            existing_parts.append(required)
            existing_lower.add(required.lower())
    response.headers["Vary"] = ", ".join(existing_parts)


def _csrf_forbidden(detail: str) -> ForbiddenError:
    return ForbiddenError(detail=detail, headers={"Vary": CSRF_VARY_HEADERS})


def validate_csrf_request(request: Request, refresh_token: str | None) -> None:
    """Validate Fetch Metadata, Origin/Referer, and double-submit `X-CSRF-Token`.

    Raises:
        ForbiddenError (403): when any CSRF check fails.
    """
    settings = get_settings()
    path = request.url.path

    # 1. Block HTML form-submittable Content-Types
    raw_ct = request.headers.get("content-type", "")
    media_type = raw_ct.split(";", 1)[0].strip().lower()
    if media_type in _FORM_CONTENT_TYPES:
        log.warning(
            "security.csrf.rejected",
            reason="form_content_type",
            content_type=media_type,
            path=path,
        )
        raise _csrf_forbidden("CSRF validation failed: unsupported request content type")

    # 2. Fetch Metadata cross-site isolation
    sec_fetch_site = request.headers.get("sec-fetch-site", "").strip().lower()
    if sec_fetch_site and sec_fetch_site not in _ALLOWED_SEC_FETCH_SITES:
        log.warning(
            "security.csrf.rejected",
            reason="cross_site_fetch_metadata",
            sec_fetch_site=sec_fetch_site,
            path=path,
        )
        raise _csrf_forbidden("CSRF validation failed: cross-site request blocked")

    # 3. Trusted Origin / Referer verification
    allowed_origins = set(resolve_trusted_origins(settings))
    if request.url.scheme and request.url.netloc:
        allowed_origins.add(f"{request.url.scheme}://{request.url.netloc}")
    if is_trusted_proxy_peer(request):
        fwd_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip().lower()
        fwd_host = (
            request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
        ).split(",", 1)[0].strip()
        if fwd_proto in {"http", "https"} and fwd_host:
            allowed_origins.add(f"{fwd_proto}://{fwd_host}")

    origin_header = request.headers.get("origin")
    referer_header = request.headers.get("referer")

    if origin_header is not None:
        normalized_origin = origin_header.strip().rstrip("/")
        if normalized_origin.lower() == "null" or normalized_origin not in allowed_origins:
            log.warning(
                "security.csrf.rejected",
                reason="untrusted_origin",
                origin=normalized_origin[:128],
                path=path,
            )
            raise _csrf_forbidden("CSRF validation failed: untrusted request origin")
    elif referer_header is not None:
        ref_parts = urlsplit(referer_header.strip())
        ref_origin = (
            f"{ref_parts.scheme}://{ref_parts.netloc}"
            if ref_parts.scheme and ref_parts.netloc
            else ""
        )
        if not ref_origin or ref_origin not in allowed_origins:
            log.warning(
                "security.csrf.rejected",
                reason="untrusted_referer",
                referer_origin=ref_origin[:128],
                path=path,
            )
            raise _csrf_forbidden("CSRF validation failed: untrusted request referer")

    # 4. Cryptographic double-submit X-CSRF-Token check when an ambient refresh cookie exists
    if not refresh_token:
        return

    header_token = request.headers.get(CSRF_HEADER_NAME)
    has_browser_context = any(
        hdr in request.headers for hdr in ("origin", "referer", "sec-fetch-site")
    )
    require_token = (
        settings.is_production
        or settings.CSRF_REQUIRE_TOKEN
        or has_browser_context
        or header_token is not None
    )

    if not require_token:
        return

    expected_token = compute_csrf_token(refresh_token)
    if not header_token or not hmac.compare_digest(header_token, expected_token):
        log.warning(
            "security.csrf.rejected",
            reason="missing_csrf_token" if not header_token else "invalid_csrf_token",
            path=path,
        )
        raise _csrf_forbidden("CSRF validation failed: missing or invalid CSRF token")

    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    if cookie_token is not None and not hmac.compare_digest(cookie_token, expected_token):
        log.warning(
            "security.csrf.rejected",
            reason="csrf_cookie_mismatch",
            path=path,
        )
        raise _csrf_forbidden("CSRF validation failed: CSRF cookie mismatch")
