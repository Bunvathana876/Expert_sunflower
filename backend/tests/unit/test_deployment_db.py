"""Unit tests for deployment resilience, URL normalization, and health aliases."""

from __future__ import annotations

import ssl

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.db.session import prepare_async_database_url_and_args
from app.main import create_app


def test_prepare_async_database_url_postgres_alias() -> None:
    raw = "postgres://sunflower_user:secret@db.render.internal:5432/sunflower_db"
    clean_url, connect_args = prepare_async_database_url_and_args(raw)
    assert clean_url.startswith("postgresql+asyncpg://")
    assert "sunflower_user:secret@db.render.internal:5432/sunflower_db" in clean_url
    assert connect_args == {}


def test_prepare_async_database_url_postgresql_alias() -> None:
    raw = "postgresql://sunflower_user:secret@localhost:5432/sunflower_db"
    clean_url, connect_args = prepare_async_database_url_and_args(raw)
    assert clean_url.startswith("postgresql+asyncpg://")
    assert connect_args == {}


def test_prepare_async_database_url_supabase_pooler_with_sslmode() -> None:
    raw = (
        "postgresql://postgres.projectref:pass123@"
        "aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
    )
    clean_url, connect_args = prepare_async_database_url_and_args(raw)
    assert clean_url.startswith("postgresql+asyncpg://")
    # sslmode must be stripped from asyncpg URL query
    assert "sslmode" not in clean_url
    assert connect_args.get("statement_cache_size") == 0
    ssl_val = connect_args.get("ssl")
    assert isinstance(ssl_val, ssl.SSLContext)
    assert ssl_val.verify_mode == ssl.CERT_NONE


def test_prepare_async_database_url_with_sslrootcert() -> None:
    import certifi
    cert_file = certifi.where()
    raw = f"postgresql+asyncpg://user:pass@remote:5432/db?sslmode=verify-full&sslrootcert={cert_file}"
    clean_url, connect_args = prepare_async_database_url_and_args(raw)
    assert "sslmode" not in clean_url
    assert "sslrootcert" not in clean_url
    assert isinstance(connect_args.get("ssl"), ssl.SSLContext)


def test_prepare_async_database_url_sqlite() -> None:
    raw = "sqlite+aiosqlite:///:memory:"
    clean_url, connect_args = prepare_async_database_url_and_args(raw)
    assert clean_url == raw
    assert connect_args == {}


def test_settings_admin_password_optional_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    monkeypatch.setenv("ADMIN_PASSWORD", "")
    settings = Settings(
        DATABASE_URL="sqlite+aiosqlite:///:memory:",
        JWT_SECRET="super-secret-key-that-is-at-least-32-bytes-long",
    )
    assert settings.ADMIN_PASSWORD == ""


@pytest.mark.asyncio
async def test_api_v1_health_endpoints() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # /api/v1/health/live
        live_res = await client.get("/api/v1/health/live")
        assert live_res.status_code == 200
        assert live_res.json()["status"] == "ok"

        # /api/v1/health
        health_res = await client.get("/api/v1/health")
        assert health_res.status_code == 200
        assert "db" in health_res.json()
        assert "migration" in health_res.json()
