"""Application settings loaded from environment variables.

Required secrets (no default — startup fails loudly if missing):
  DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        # Extra env vars (e.g. POSTGRES_*) are silently ignored.
        extra="ignore",
    )

    # ---- Database ----
    DATABASE_URL: str  # no default — required
    ALEMBIC_DATABASE_URL: str = ""

    # ---- Auth (JWT_SECRET has no default — startup fails if missing) ----
    JWT_SECRET: str  # no default — required
    JWT_ALG: str = "HS256"
    ACCESS_TTL_MIN: int = 15
    REFRESH_TTL_DAYS: int = 30

    # ---- API ----
    ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    # Comma-separated string. Use the cors_origins_list property in code.
    # Kept as str so pydantic-settings does not attempt JSON list parsing.
    CORS_ORIGINS: str = ""

    # ---- Media storage ----
    MEDIA_BACKEND: str = "local"
    MEDIA_ROOT: str = "/var/lib/sunflower/media"
    MEDIA_PUBLIC_URL: str = "http://localhost:8000/media"
    MEDIA_MAX_BYTES: int = 5_242_880  # 5 MB

    # ---- Seed admin (no default for password — required for seed script) ----
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str  # no default — required

    # ---- Frontend (Vite) ----
    VITE_API_BASE_URL: str = "http://localhost:8000/api/v1"

    # ---- Rate Limiting & Trusted Proxy Security ----
    TRUSTED_PROXY_IPS: str = ""
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_FAIL_CLOSED: bool = False

    RATE_LIMIT_LOGIN_MAX: int = 10
    RATE_LIMIT_LOGIN_IP_MAX: int = 30
    RATE_LIMIT_LOGIN_WINDOW_SEC: int = 900

    RATE_LIMIT_REGISTER_IP_MAX: int = 10
    RATE_LIMIT_REGISTER_WINDOW_SEC: int = 3600

    RATE_LIMIT_REFRESH_IP_MAX: int = 30
    RATE_LIMIT_REFRESH_WINDOW_SEC: int = 300

    RATE_LIMIT_PROFILE_USER_MAX: int = 10
    RATE_LIMIT_PROFILE_IP_MAX: int = 20
    RATE_LIMIT_PROFILE_WINDOW_SEC: int = 900

    RATE_LIMIT_AI_ADMIN_USER_MAX: int = 20
    RATE_LIMIT_AI_ADMIN_IP_MAX: int = 40
    RATE_LIMIT_AI_ADMIN_WINDOW_SEC: int = 60

    RATE_LIMIT_AI_CONFIRM_USER_MAX: int = 15
    RATE_LIMIT_AI_CONFIRM_IP_MAX: int = 30
    RATE_LIMIT_AI_CONFIRM_WINDOW_SEC: int = 60

    # ---- AI Action Proposal Security ----
    AI_ACTION_PROPOSAL_TTL_SEC: int = 300

    # ---- CSRF & Origin Security ----
    CSRF_REQUIRE_TOKEN: bool = False
    COOKIE_SECURE: bool | None = None
    REFRESH_CONCURRENT_LEEWAY_MS: int = 0

    # ---- Readiness & Schema Verification ----
    REQUIRED_ALEMBIC_REVISION: str = "0004"

    # ---- Metrics & Operational Security ----
    METRICS_SECRET_KEY: str = ""

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret_length(cls, v: str) -> str:
        if len(v.encode("utf-8")) < 32:
            raise ValueError(
                "JWT_SECRET must be at least 32 bytes (256 bits) for HS256 according to RFC 7518"
            )
        return v

    @model_validator(mode="after")
    def validate_production_secrets(self) -> Settings:
        if self.is_production:
            lower_sec = self.JWT_SECRET.lower()
            if any(w in lower_sec for w in ("test-secret", "changeme", "placeholder", "default")):
                raise ValueError(
                    "JWT_SECRET contains an insecure development placeholder in production"
                )
        return self

    # ---- Automated Maintenance Retention ----
    MAINTENANCE_AI_ACTION_RETENTION_HOURS: int = 24
    MAINTENANCE_REFRESH_TOKEN_RETENTION_HOURS: int = 24
    MAINTENANCE_EXPIRED_TOKEN_GRACE_HOURS: int = 0
    MAINTENANCE_RATE_LIMIT_RETENTION_HOURS: int = 0

    @property
    def trusted_proxy_list(self) -> list[str]:
        """Return TRUSTED_PROXY_IPS as a list of IP/CIDR strings."""
        return [p.strip() for p in self.TRUSTED_PROXY_IPS.split(",") if p.strip()]

    @property
    def cors_origins_list(self) -> list[str]:
        """Return normalized CORS_ORIGINS list (trailing slashes stripped)."""
        return [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        """Whether auth cookies require HTTPS (`Secure`), defaulting to `is_production`."""
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.is_production


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached application settings.

    Call this everywhere instead of constructing Settings() directly so that
    the environment is only parsed once.
    """
    return Settings()  # type: ignore[call-arg]
