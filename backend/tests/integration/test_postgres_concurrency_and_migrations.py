"""Real PostgreSQL integration tests: Alembic migrations, row locks, and multi-worker races.

Spins up an isolated ephemeral PostgreSQL cluster in `/tmp` on a dynamically allocated high port
(never touching default ports 5432 or 5433) to prove real cross-worker transactional locking,
Alembic upgrade/downgrade safety, advisory-lock rate limiting, and expert-system queries.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import uuid
from collections.abc import AsyncGenerator, Generator
from contextlib import asynccontextmanager
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit, urlunsplit

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from ai.config import ai_config
from app.core.config import get_settings
from app.core.csrf import CSRF_COOKIE_NAME, CSRF_HEADER_NAME, compute_csrf_token
from app.core.deps import get_db
from app.core.security import compute_token_hash, create_access_token
from app.main import create_app
from app.models.ai_action import PendingAIAction
from app.models.audit import AuditLog
from app.models.auth import RefreshToken, Role, User
from app.models.disease import Disease, DiseaseSymptom
from app.models.enums import PathogenType
from app.models.rate_limit import RateLimitEvent
from app.models.symptom import Symptom, SymptomCategory
from app.models.translation import Translation
from app.services.maintenance import run_maintenance_cleanup
from scripts.seed import seed_database

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _find_pg_bin(name: str) -> str | None:
    found = shutil.which(name)
    if found:
        return found
    for prefix in ("/opt/homebrew/bin", "/usr/local/bin", "/usr/lib/postgresql/18/bin"):
        candidate = Path(prefix) / name
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def _pick_free_port() -> int:
    for _ in range(20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(("127.0.0.1", 0))
            port = int(sock.getsockname()[1])
            if port not in (5432, 5433, 5434):
                return port
    raise RuntimeError("Could not allocate a free non-default TCP port for ephemeral PostgreSQL")


def _replace_db_in_url(raw_url: str, dbname: str, scheme: str) -> str:
    parts = urlsplit(raw_url)
    return urlunsplit((scheme, parts.netloc, f"/{dbname}", parts.query, parts.fragment))


@pytest.fixture(scope="module")
def ephemeral_postgres() -> Generator[tuple[str, str], None, None]:
    """Provision an isolated ephemeral PostgreSQL database and tear it down cleanly.

    Supports two isolated modes (never touches `sunflower_db`):
    1. `POSTGRES_TEST_ADMIN_URL` (CI service containers / Docker): creates and drops a random
       `sf_ephemeral_test_<hex>` database via `AUTOCOMMIT`.
    2. Local PostgreSQL binaries (`initdb` / `pg_ctl` / `createdb`): boots a temporary cluster
       inside `/tmp` on a dynamically chosen high TCP port.
    """
    admin_url = os.getenv("POSTGRES_TEST_ADMIN_URL", "").strip()
    if admin_url:
        dbname = f"sf_ephemeral_test_{uuid.uuid4().hex[:10]}"
        assert dbname != "sunflower_db"
        sync_admin_url = _replace_db_in_url(admin_url, "postgres", "postgresql+psycopg")
        admin_engine = create_engine(sync_admin_url, isolation_level="AUTOCOMMIT")
        try:
            with admin_engine.connect() as conn:
                conn.execute(text(f'CREATE DATABASE "{dbname}" ENCODING \'UTF8\''))
            sync_url = _replace_db_in_url(admin_url, dbname, "postgresql+psycopg")
            async_url = _replace_db_in_url(admin_url, dbname, "postgresql+asyncpg")
            yield sync_url, async_url
        finally:
            with admin_engine.connect() as conn:
                conn.execute(text(f'DROP DATABASE IF EXISTS "{dbname}" WITH (FORCE)'))
            admin_engine.dispose()
        return

    initdb_bin = _find_pg_bin("initdb")
    pg_ctl_bin = _find_pg_bin("pg_ctl")
    createdb_bin = _find_pg_bin("createdb")
    if not (initdb_bin and pg_ctl_bin and createdb_bin):
        pytest.skip("Local PostgreSQL binaries (initdb/pg_ctl/createdb) not found")

    port = _pick_free_port()
    assert port not in (5432, 5433, 5434)

    with tempfile.TemporaryDirectory(prefix="sf_pg3_", dir="/tmp") as tmp_root:
        pgdata = Path(tmp_root) / "data"
        sockdir = Path(tmp_root) / "sock"
        logfile = Path(tmp_root) / "postgres.log"
        sockdir.mkdir(parents=True, exist_ok=True)

        subprocess.run(  # noqa: S603
            [
                initdb_bin,
                "-D",
                str(pgdata),
                "-U",
                "postgres",
                "-A",
                "trust",
                "--encoding=UTF8",
                "--no-locale",
            ],
            check=True,
            capture_output=True,
            text=True,
        )

        pg_opts = f"-F -p {port} -h 127.0.0.1 -k {sockdir}"
        subprocess.run(  # noqa: S603
            [
                pg_ctl_bin,
                "-D",
                str(pgdata),
                "-l",
                str(logfile),
                "-w",
                "-o",
                pg_opts,
                "start",
            ],
            check=True,
            capture_output=True,
            text=True,
        )

        try:
            dbname = "sunflower_phase3_test"
            subprocess.run(  # noqa: S603
                [
                    createdb_bin,
                    "-h",
                    "127.0.0.1",
                    "-p",
                    str(port),
                    "-U",
                    "postgres",
                    dbname,
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            sync_url = f"postgresql+psycopg://postgres@127.0.0.1:{port}/{dbname}"
            async_url = f"postgresql+asyncpg://postgres@127.0.0.1:{port}/{dbname}"
            yield sync_url, async_url
        finally:
            subprocess.run(  # noqa: S603
                [pg_ctl_bin, "-D", str(pgdata), "-m", "immediate", "stop"],
                check=False,
                capture_output=True,
                text=True,
            )


def _run_alembic(sync_url: str, *args: str) -> subprocess.CompletedProcess[str]:
    env = {
        **os.environ,
        "ALEMBIC_DATABASE_URL": sync_url,
        "DATABASE_URL": sync_url.replace("+psycopg", "+asyncpg"),
    }
    return subprocess.run(  # noqa: S603
        [sys.executable, "-m", "alembic", *args],
        cwd=str(BACKEND_DIR),
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )


@asynccontextmanager
async def _worker_context(
    async_url: str,
) -> AsyncGenerator[tuple[AsyncClient, AsyncEngine, async_sessionmaker[AsyncSession]], None]:
    """Create an independent FastAPI app + AsyncEngine simulating a separate Uvicorn worker."""
    worker_engine = create_async_engine(async_url, pool_size=6, max_overflow=6)
    worker_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
        bind=worker_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    app = create_app()

    async def _worker_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with worker_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _worker_get_db
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    try:
        async with AsyncClient(transport=transport, base_url="http://worker") as client:
            yield client, worker_engine, worker_factory
    finally:
        await worker_engine.dispose()


EXPECTED_PHASE3_INDEXES = {
    "ix_pending_ai_actions_conv_user_status",
    "ix_pending_ai_actions_user_created",
    "ix_pending_ai_actions_status_expires",
    "ix_refresh_tokens_user_active",
    "ix_refresh_tokens_expires_at",
    "ix_refresh_tokens_family_id",
    "ix_rate_limit_events_scope_created",
    "ix_rate_limit_events_expires_at",
    "ix_diseases_published_slug",
    "ix_diseases_pathogen_type",
    "ix_symptoms_category_id",
    "ix_disease_symptoms_symptom_id",
    "ix_translations_type_field_locale",
    "ix_users_role_active",
    "ix_role_permissions_permission_id",
    "ix_diagnosis_results_session_rank",
    "ix_diagnosis_selected_symptoms_symptom_id",
    "ix_audit_log_entity_lookup",
    "ix_audit_log_actor_created",
    "ix_audit_log_created_at",
}


@pytest.mark.asyncio
async def test_01_alembic_upgrade_downgrade_reupgrade_and_seed_on_postgres(
    ephemeral_postgres: tuple[str, str],
) -> None:
    """Verify 0001->0004 upgrade, index catalog, non-destructive downgrade 0003, and re-upgrade."""
    sync_url, async_url = ephemeral_postgres

    # 1. Upgrade from empty DB to head (0004)
    up1 = _run_alembic(sync_url, "upgrade", "head")
    assert up1.returncode == 0
    cur1 = _run_alembic(sync_url, "current")
    assert "0004" in cur1.stdout

    sync_engine = create_engine(sync_url)
    try:
        with sync_engine.connect() as conn:
            tables = {
                r[0]
                for r in conn.execute(
                    text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
                )
            }
            assert {"pending_ai_actions", "refresh_tokens", "rate_limit_events"}.issubset(tables)

            indexes = {
                r[0]
                for r in conn.execute(
                    text("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")
                )
            }
            missing_idx = EXPECTED_PHASE3_INDEXES - indexes
            assert not missing_idx, f"Missing Phase 3 indexes: {missing_idx}"
            assert "ix_diseases_search_vector" in indexes

        # 2. Seed roles/permissions/categories + bilingual domain records on PostgreSQL
        pg_async_engine = create_async_engine(async_url)
        pg_session_factory = async_sessionmaker(bind=pg_async_engine, expire_on_commit=False)
        try:
            async with pg_session_factory() as sess:
                await seed_database(sess)
                leaf_cat = (
                    await sess.execute(
                        select(SymptomCategory).where(SymptomCategory.code == "leaf")
                    )
                ).scalar_one()

                s1 = Symptom(
                    code="downy_white_growth",
                    category_id=leaf_cat.id,
                    is_environmental=False,
                )
                s2 = Symptom(
                    code="chlorotic_leaf_mosaic",
                    category_id=leaf_cat.id,
                    is_environmental=False,
                )
                downy = Disease(
                    slug="downy-mildew",
                    pathogen_type=PathogenType.FUNGAL,
                    is_published=True,
                )
                sess.add_all([s1, s2, downy])
                await sess.flush()

                sess.add_all(
                    [
                        DiseaseSymptom(
                            disease_id=downy.id,
                            symptom_id=s1.id,
                            weight=Decimal("0.90"),
                            is_required=True,
                            is_pathognomonic=True,
                        ),
                        DiseaseSymptom(
                            disease_id=downy.id,
                            symptom_id=s2.id,
                            weight=Decimal("0.70"),
                            is_required=False,
                            is_pathognomonic=False,
                        ),
                        Translation(
                            entity_type="disease",
                            entity_id=downy.id,
                            locale="en",
                            field="name",
                            value="Downy Mildew",
                        ),
                        Translation(
                            entity_type="disease",
                            entity_id=downy.id,
                            locale="km",
                            field="name",
                            value="ជំងឺផ្សិតទឹកសន្សើម",
                        ),
                        Translation(
                            entity_type="disease",
                            entity_id=downy.id,
                            locale="en",
                            field="description",
                            value="Systemic downy fungal infection on sunflower leaves.",
                        ),
                        Translation(
                            entity_type="symptom",
                            entity_id=s1.id,
                            locale="en",
                            field="label",
                            value="White cottony growth on leaf underside",
                        ),
                        Translation(
                            entity_type="symptom",
                            entity_id=s2.id,
                            locale="en",
                            field="label",
                            value="Chlorotic yellow mosaic on upper leaf",
                        ),
                    ]
                )
                await sess.commit()

                disease_count_before = int(
                    await sess.scalar(select(func.count(Disease.id))) or 0
                )
                symptom_count_before = int(
                    await sess.scalar(select(func.count(Symptom.id))) or 0
                )
                assert disease_count_before >= 1
                assert symptom_count_before >= 2
        finally:
            await pg_async_engine.dispose()

        # 3. Downgrade 0004 -> 0003 and verify domain data is 100% preserved
        down = _run_alembic(sync_url, "downgrade", "0003")
        assert down.returncode == 0
        cur_down = _run_alembic(sync_url, "current")
        assert "0003" in cur_down.stdout

        with sync_engine.connect() as conn:
            tables_after_down = {
                r[0]
                for r in conn.execute(
                    text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
                )
            }
            assert "pending_ai_actions" not in tables_after_down
            assert "refresh_tokens" not in tables_after_down
            assert "rate_limit_events" not in tables_after_down

            indexes_after_down = {
                r[0]
                for r in conn.execute(
                    text("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")
                )
            }
            assert EXPECTED_PHASE3_INDEXES.isdisjoint(indexes_after_down)

            preserved_diseases = conn.execute(text("SELECT COUNT(*) FROM diseases")).scalar_one()
            preserved_symptoms = conn.execute(text("SELECT COUNT(*) FROM symptoms")).scalar_one()
            assert preserved_diseases == disease_count_before
            assert preserved_symptoms == symptom_count_before

        # 4. Re-upgrade 0003 -> head (0004) and verify all Phase 3 tables/indexes match ORM metadata
        up2 = _run_alembic(sync_url, "upgrade", "head")
        assert up2.returncode == 0
        cur_reup = _run_alembic(sync_url, "current")
        assert "0004" in cur_reup.stdout

        from alembic.autogenerate import compare_metadata
        from alembic.migration import MigrationContext

        from app.db.base import Base

        with sync_engine.connect() as conn:
            indexes_reup = {
                r[0]
                for r in conn.execute(
                    text("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")
                )
            }
            assert EXPECTED_PHASE3_INDEXES.issubset(indexes_reup)

            mc = MigrationContext.configure(conn)
            diffs = compare_metadata(mc, Base.metadata)
            phase3_tokens = (
                {"pending_ai_actions", "refresh_tokens", "rate_limit_events"}
                | EXPECTED_PHASE3_INDEXES
            )
            phase3_diffs = [
                d for d in diffs if any(tok in repr(d) for tok in phase3_tokens)
            ]
            assert phase3_diffs == [], f"Phase 3 ORM/Alembic metadata drift: {phase3_diffs}"
    finally:
        sync_engine.dispose()


@pytest.mark.asyncio
async def test_02_postgres_cross_worker_action_confirmation_and_row_locking(
    ephemeral_postgres: tuple[str, str],
) -> None:
    """Proposal created on Worker A confirms on Worker B; 5 concurrent confirms execute once."""
    _, async_url = ephemeral_postgres

    async with (
        _worker_context(async_url) as (client_a, _eng_a, factory_a),
        _worker_context(async_url) as (client_b, _eng_b, _factory_b),
    ):
        # Create an admin user in PostgreSQL
        async with factory_a() as sess:
            admin_role = (
                await sess.execute(select(Role).where(Role.name == "admin"))
            ).scalar_one()
            admin = User(
                email="pg_worker_admin@example.com",
                username="pg_worker_admin",
                password_hash="not-used",
                role_id=admin_role.id,
                is_active=True,
            )
            sess.add(admin)
            await sess.commit()
            await sess.refresh(admin)
            admin_id = admin.id

        admin_token, _ = create_access_token(
            admin_id,
            "admin",
            ["disease:read", "disease:create", "disease:update", "disease:delete"],
        )
        headers = {"Authorization": f"Bearer {admin_token}"}

        with patch.object(ai_config, "AI_ENABLED", True):
            # 1. Propose on Worker A -> Confirm on Worker B
            prop_resp = await client_a.post(
                "/api/v1/ai/admin/chat",
                json={
                    "message": "Create disease Cross Worker Rust with pathogen fungal",
                    "conversation_id": "pg-cross-worker-1",
                },
                headers=headers,
            )
            assert prop_resp.status_code == 200
            prop_dto = prop_resp.json()["proposed_action"]
            assert prop_dto is not None

            confirm_b = await client_b.post(
                "/api/v1/ai/admin/actions/confirm",
                json={
                    "action_id": prop_dto["action_id"],
                    "confirmation_token": prop_dto["confirmation_token"],
                },
                headers=headers,
            )
            assert confirm_b.status_code == 200
            assert confirm_b.json()["success"] is True

            # 2. Propose second disease on Worker A, then fire 5 concurrent confirms across A & B
            prop2_resp = await client_a.post(
                "/api/v1/ai/admin/chat",
                json={
                    "message": "Create disease Concurrent Lock Blight with pathogen bacterial",
                    "conversation_id": "pg-cross-worker-race",
                },
                headers=headers,
            )
            assert prop2_resp.status_code == 200
            prop2 = prop2_resp.json()["proposed_action"]
            assert prop2 is not None

            clients = [client_a, client_b, client_a, client_b, client_a]
            race_responses = await asyncio.gather(
                *[
                    c.post(
                        "/api/v1/ai/admin/actions/confirm",
                        json={
                            "action_id": prop2["action_id"],
                            "confirmation_token": prop2["confirmation_token"],
                        },
                        headers=headers,
                    )
                    for c in clients
                ]
            )

        statuses = [r.status_code for r in race_responses]
        assert statuses.count(200) == 1, f"Expected exactly 1 HTTP 200, got {statuses}"
        assert statuses.count(400) == 4, f"Expected 4 HTTP 400 rejections, got {statuses}"

        # Verify exactly 1 disease row and 1 audit log row for concurrent-lock-blight
        async with factory_a() as sess:
            created = (
                await sess.execute(
                    select(Disease).where(Disease.slug == "concurrent-lock-blight")
                )
            ).scalars().all()
            assert len(created) == 1

            audits = (
                await sess.execute(
                    select(AuditLog).where(
                        AuditLog.action == "ai_create_disease",
                        AuditLog.entity_id == created[0].id,
                    )
                )
            ).scalars().all()
            assert len(audits) == 1


@pytest.mark.asyncio
async def test_03_postgres_action_failure_atomic_rollback(
    ephemeral_postgres: tuple[str, str],
) -> None:
    """Failed confirmation on PostgreSQL rolls back transaction and records 'failed' status."""
    _, async_url = ephemeral_postgres

    async with (
        _worker_context(async_url) as (client_a, _eng_a, factory_a),
        _worker_context(async_url) as (client_b, _eng_b, _factory_b),
    ):
        async with factory_a() as sess:
            admin = (
                await sess.execute(select(User).where(User.username == "pg_worker_admin"))
            ).scalar_one()
            admin_id = admin.id

        admin_token, _ = create_access_token(
            admin_id,
            "admin",
            ["disease:read", "disease:create"],
        )
        headers = {"Authorization": f"Bearer {admin_token}"}

        with patch.object(ai_config, "AI_ENABLED", True):
            prop_resp = await client_a.post(
                "/api/v1/ai/admin/chat",
                json={
                    "message": "Create disease Postgres Rollback Wilt with pathogen fungal",
                    "conversation_id": "pg-rollback-conv",
                },
                headers=headers,
            )
            prop = prop_resp.json()["proposed_action"]
            assert prop is not None

            # Insert conflicting disease slug before Worker B confirms
            async with factory_a() as sess:
                sess.add(
                    Disease(
                        slug="postgres-rollback-wilt",
                        pathogen_type=PathogenType.FUNGAL,
                        is_published=True,
                    )
                )
                await sess.commit()

            fail_resp = await client_b.post(
                "/api/v1/ai/admin/actions/confirm",
                json={
                    "action_id": prop["action_id"],
                    "confirmation_token": prop["confirmation_token"],
                },
                headers=headers,
            )
            assert fail_resp.status_code == 409

        async with factory_a() as sess:
            row = (
                await sess.execute(
                    select(PendingAIAction).where(PendingAIAction.action_id == prop["action_id"])
                )
            ).scalar_one()
            assert row.status == "failed"
            assert row.executed_at is None
            assert row.error_detail is not None


@pytest.mark.asyncio
async def test_04_postgres_cross_worker_refresh_token_rotation_revocation_and_race(
    ephemeral_postgres: tuple[str, str],
) -> None:
    """Refresh rotation, logout revocation, and 5-way concurrent refresh race across workers."""
    _, async_url = ephemeral_postgres

    async with (
        _worker_context(async_url) as (client_a, _eng_a, factory_a),
        _worker_context(async_url) as (client_b, _eng_b, _factory_b),
    ):
        # 1. Register on Worker A
        reg = await client_a.post(
            "/api/v1/auth/register",
            json={
                "email": "pg_refresh_race@example.com",
                "username": "pg_refresh_race",
                "password": "StrongPassword123!",
            },
        )
        assert reg.status_code == 201
        user_id = reg.json()["user"]["id"]
        rt_0 = reg.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

        # 2. Rotate on Worker B; replaying rt_0 on Worker A compromises family & revokes rt_1
        rot_b = await client_b.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_0}"},
        )
        assert rot_b.status_code == 200
        rt_1 = rot_b.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]
        assert rt_1 != rt_0

        replay_a = await client_a.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_0}"},
        )
        assert replay_a.status_code == 401

        compromised_descendant = await client_b.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_1}"},
        )
        assert compromised_descendant.status_code == 401

        # 3. Start a clean session family and fire 5 simultaneous cross-worker refresh attempts
        relogin = await client_a.post(
            "/api/v1/auth/login",
            json={
                "identifier": "pg_refresh_race",
                "password": "StrongPassword123!",
            },
        )
        assert relogin.status_code == 200
        rt_race = relogin.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

        clients = [client_a, client_b, client_a, client_b, client_a]
        race_results = await asyncio.gather(
            *[
                c.post("/api/v1/auth/refresh", headers={"Cookie": f"refresh_token={rt_race}"})
                for c in clients
            ]
        )

        codes = [r.status_code for r in race_results]
        assert codes.count(200) == 1, f"Expected 1 HTTP 200 in refresh race, got {codes}"
        assert codes.count(401) == 4, f"Expected 4 HTTP 401 in refresh race, got {codes}"

        winner = next(r for r in race_results if r.status_code == 200)
        rt_2 = winner.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

        # Verify ONLY ONE active token exists in PostgreSQL (concurrent race preserved winner!)
        async with factory_a() as sess:
            active_tokens = (
                await sess.execute(
                    select(RefreshToken).where(
                        RefreshToken.user_id == user_id,
                        RefreshToken.revoked_at.is_(None),
                    )
                )
            ).scalars().all()
            assert len(active_tokens) == 1

        # Confirm the winning rotated token rt_2 can still be rotated normally
        post_race_rot = await client_a.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_2}"},
        )
        assert post_race_rot.status_code == 200
        rt_3 = post_race_rot.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

        # 4. Logout on Worker B revokes rt_3 across Worker A
        logout_b = await client_b.post(
            "/api/v1/auth/logout",
            headers={"Cookie": f"refresh_token={rt_3}"},
        )
        assert logout_b.status_code == 204

        after_logout_a = await client_a.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_3}"},
        )
        assert after_logout_a.status_code == 401


@pytest.mark.asyncio
async def test_05_postgres_cross_worker_advisory_lock_rate_limiting(
    ephemeral_postgres: tuple[str, str],
) -> None:
    """Concurrent multi-worker burst enforces exact max_attempts via pg_advisory_xact_lock."""
    _, async_url = ephemeral_postgres
    settings = get_settings()

    async with (
        _worker_context(async_url) as (client_a, _eng_a, factory_a),
        _worker_context(async_url) as (client_b, _eng_b, _factory_b),
    ):
        async with factory_a() as sess:
            admin_role = (
                await sess.execute(select(Role).where(Role.name == "admin"))
            ).scalar_one()
            rl_user = User(
                email="pg_burst_admin@example.com",
                username="pg_burst_admin",
                password_hash="not-used",
                role_id=admin_role.id,
                is_active=True,
            )
            sess.add(rl_user)
            await sess.commit()
            await sess.refresh(rl_user)
            rl_user_id = rl_user.id

        token, _ = create_access_token(rl_user_id, "admin", ["disease:read"])
        headers = {"Authorization": f"Bearer {token}"}

        with (
            patch.object(settings, "RATE_LIMIT_AI_ADMIN_USER_MAX", 4),
            patch.object(settings, "RATE_LIMIT_AI_ADMIN_IP_MAX", 100),
            patch.object(ai_config, "AI_ENABLED", False),
        ):
            clients = [client_a, client_b] * 5  # 10 concurrent requests across 2 worker pools
            responses = await asyncio.gather(
                *[
                    c.post(
                        "/api/v1/ai/admin/chat",
                        json={"message": "list diseases"},
                        headers=headers,
                    )
                    for c in clients
                ]
            )

        codes = [r.status_code for r in responses]
        assert codes.count(503) == 4, f"Expected exact 4 allowed requests, got {codes}"
        assert codes.count(429) == 6, f"Expected exact 6 429 responses, got {codes}"
        for resp in responses:
            if resp.status_code == 429:
                assert int(resp.headers["retry-after"]) >= 1


@pytest.mark.asyncio
async def test_06_postgres_tsvector_search_and_diagnosis_workflow_preserved(
    ephemeral_postgres: tuple[str, str],
) -> None:
    """Verify PostgreSQL tsvector GIN search and deterministic diagnosis engine on PG."""
    _, async_url = ephemeral_postgres

    async with _worker_context(async_url) as (client_a, _eng_a, factory_a):
        # 1. PostgreSQL full-text search via Disease.search_vector @@ plainto_tsquery
        search_resp = await client_a.get("/api/v1/diseases?q=downy&locale=en")
        assert search_resp.status_code == 200
        items = search_resp.json()["items"]
        assert any("downy" in item["slug"] for item in items)

        # 2. Stateless preview and persisted diagnosis session + history on PostgreSQL
        async with factory_a() as sess:
            first_symptoms = (
                await sess.execute(select(Symptom.id).order_by(Symptom.id).limit(2))
            ).scalars().all()
            grower_role = (
                await sess.execute(select(Role).where(Role.name == "grower"))
            ).scalar_one()
            grower = User(
                email="pg_grower_diag@example.com",
                username="pg_grower_diag",
                password_hash="not-used",
                role_id=grower_role.id,
                is_active=True,
            )
            sess.add(grower)
            await sess.commit()
            await sess.refresh(grower)
            grower_id = grower.id

        assert len(first_symptoms) >= 2
        grower_token, _ = create_access_token(
            grower_id,
            "grower",
            ["diagnosis:run", "diagnosis:read_own", "disease:read", "symptom:read"],
        )
        grower_headers = {"Authorization": f"Bearer {grower_token}"}

        preview_resp = await client_a.post(
            "/api/v1/diagnosis/preview",
            json={"answers": {str(first_symptoms[0]): "yes"}, "locale": "en"},
            headers=grower_headers,
        )
        assert preview_resp.status_code == 200
        assert isinstance(preview_resp.json()["next_best_questions"], list)

        diag_resp = await client_a.post(
            "/api/v1/diagnosis/sessions",
            json={
                "answers": {
                    str(first_symptoms[0]): "yes",
                    str(first_symptoms[1]): "yes",
                },
                "locale": "km",
            },
            headers=grower_headers,
        )
        assert diag_resp.status_code == 200
        diag_body = diag_resp.json()
        assert diag_body["session_id"] is not None
        assert len(diag_body["results"]) >= 1
        assert diag_body["results"][0]["disease"]["slug"] == "downy-mildew"

        hist_resp = await client_a.get(
            "/api/v1/diagnosis/sessions",
            headers=grower_headers,
        )
        assert hist_resp.status_code == 200
        assert hist_resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_07_postgres_phase4_readiness_csrf_and_maintenance_cleanup(
    ephemeral_postgres: tuple[str, str],
) -> None:
    """Verify /health/ready (0004), browser CSRF protection, and maintenance cleanup on Postgres."""
    from datetime import UTC, datetime, timedelta

    _, async_url = ephemeral_postgres
    async with _worker_context(async_url) as (client_pg, _, factory_pg):
        # 1. /health/ready confirms real PostgreSQL connectivity + Alembic revision 0004
        ready = await client_pg.get("/health/ready")
        assert ready.status_code == 200
        assert ready.json() == {
            "status": "ready",
            "version": "0.1.0",
            "db": "up",
            "migration": "ok",
            "required_revision": "0004",
        }
        assert "content-security-policy" in ready.headers
        assert ready.headers["x-content-type-options"] == "nosniff"

        # 2. Browser-context registration + CSRF enforcement on real Postgres
        reg = await client_pg.post(
            "/api/v1/auth/register",
            json={
                "email": "pg_p4_csrf@example.com",
                "username": "pg_p4_csrf",
                "password": "StrongPassword123!",
            },
            headers={"Origin": "http://localhost:5174", "Sec-Fetch-Site": "same-origin"},
        )
        assert reg.status_code == 201
        csrf_tok = reg.headers[CSRF_HEADER_NAME]

        # Cross-site attempt is blocked with 403 before touching DB token state
        blocked = await client_pg.post(
            "/api/v1/auth/refresh",
            headers={
                "Origin": "https://attacker.example",
                "Sec-Fetch-Site": "cross-site",
                CSRF_HEADER_NAME: csrf_tok,
            },
        )
        assert blocked.status_code == 403

        # Legitimate same-origin refresh with X-CSRF-Token succeeds
        rotated = await client_pg.post(
            "/api/v1/auth/refresh",
            headers={
                "Origin": "http://localhost:5174",
                "Sec-Fetch-Site": "same-origin",
                CSRF_HEADER_NAME: csrf_tok,
            },
        )
        assert rotated.status_code == 200
        new_csrf = rotated.headers[CSRF_HEADER_NAME]
        assert new_csrf != csrf_tok
        assert CSRF_COOKIE_NAME in rotated.headers.get("set-cookie", "")
        assert compute_csrf_token("probe") != new_csrf

        # 3. Maintenance cleanup on real PostgreSQL TIMESTAMPTZ & JSONB columns
        now = datetime.now(UTC)
        user_id = int(reg.json()["user"]["id"])
        async with factory_pg() as sess:
            sess.add_all(
                [
                    PendingAIAction(
                        action_id="pg-p4-expired-old",
                        token_hash=compute_token_hash("pg-p4-tok-old"),
                        user_id=user_id,
                        conversation_id="pg-conv",
                        action_type="create_disease",
                        required_permission="disease:create",
                        summary="Old expired proposal",
                        details={"name": "Old"},
                        affected_records=[],
                        status="pending",
                        created_at=now - timedelta(hours=40),
                        expires_at=now - timedelta(hours=36),
                    ),
                    PendingAIAction(
                        action_id="pg-p4-active",
                        token_hash=compute_token_hash("pg-p4-tok-active"),
                        user_id=user_id,
                        conversation_id="pg-conv",
                        action_type="create_disease",
                        required_permission="disease:create",
                        summary="Active proposal",
                        details={"name": "Active"},
                        affected_records=[],
                        status="pending",
                        created_at=now,
                        expires_at=now + timedelta(minutes=15),
                    ),
                    RateLimitEvent(
                        scope_key=f"test:pg:{compute_token_hash('pg-expired-rl')}",
                        created_at=now - timedelta(hours=2),
                        expires_at=now - timedelta(hours=1),
                    ),
                ]
            )
            await sess.commit()

            cleanup_res = await run_maintenance_cleanup(
                sess,
                dry_run=False,
                ai_action_retention_hours=24,
                refresh_token_retention_hours=24,
                rate_limit_retention_hours=0,
                now_override=now,
            )
            assert cleanup_res.marked_expired_ai_actions >= 1
            assert cleanup_res.deleted_ai_actions >= 1
            assert cleanup_res.deleted_rate_limit_events >= 1

            active_still_exists = (
                await sess.execute(
                    select(PendingAIAction).where(PendingAIAction.action_id == "pg-p4-active")
                )
            ).scalar_one_or_none()
            assert active_still_exists is not None
            assert active_still_exists.status == "pending"

            old_gone = (
                await sess.execute(
                    select(PendingAIAction).where(PendingAIAction.action_id == "pg-p4-expired-old")
                )
            ).scalar_one_or_none()
            assert old_gone is None


@pytest.mark.asyncio
async def test_08_postgres_refresh_token_family_compromise_revocation_and_isolation(
    ephemeral_postgres: tuple[str, str],
) -> None:
    """Multi-hop rotated token replay revokes family on Postgres while isolating other devices."""
    from app.core.security import decode_token

    _, async_url = ephemeral_postgres
    async with (
        _worker_context(async_url) as (client_a, _eng_a, factory_a),
        _worker_context(async_url) as (client_b, _eng_b, _factory_b),
    ):
        # Device A registers -> Family A (rt_a0)
        reg = await client_a.post(
            "/api/v1/auth/register",
            json={
                "email": "pg_family_sec@example.com",
                "username": "pg_family_sec",
                "password": "StrongPassword123!",
            },
        )
        assert reg.status_code == 201
        user_id = int(reg.json()["user"]["id"])
        rt_a0 = reg.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

        # Device B logs in independently -> Family B (rt_b0)
        login_b = await client_b.post(
            "/api/v1/auth/login",
            json={
                "identifier": "pg_family_sec",
                "password": "StrongPassword123!",
            },
        )
        assert login_b.status_code == 200
        rt_b0 = login_b.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

        # Rotate Family A across two hops: rt_a0 -> rt_a1 -> rt_a2
        rot_1 = await client_a.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_a0}"},
        )
        assert rot_1.status_code == 200
        rt_a1 = rot_1.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

        rot_2 = await client_b.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_a1}"},
        )
        assert rot_2.status_code == 200
        rt_a2 = rot_2.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]

        raw_jtis = {
            decode_token(tok)["jti"] for tok in (rt_a0, rt_a1, rt_a2, rt_b0)
        }
        raw_tokens = {rt_a0, rt_a1, rt_a2, rt_b0}

        # Verify hashed storage & family chain integrity in PostgreSQL before compromise
        async with factory_a() as sess:
            rows = (
                await sess.execute(
                    select(RefreshToken).where(RefreshToken.user_id == user_id)
                )
            ).scalars().all()
            assert len(rows) == 4
            for row in rows:
                assert len(row.token_hash) == 64
                int(row.token_hash, 16)
                assert row.token_hash not in raw_jtis
                assert row.token_hash not in raw_tokens
                if row.replaced_by_hash is not None:
                    assert len(row.replaced_by_hash) == 64
                    int(row.replaced_by_hash, 16)
                    assert row.replaced_by_hash not in raw_jtis

        # Attacker replays ancestor rt_a0 -> triggers immediate Family A compromise revocation!
        attacker_replay = await client_a.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_a0}"},
        )
        assert attacker_replay.status_code == 401
        assert "family revoked" in attacker_replay.json()["detail"].lower()

        # Legitimate Family A leaf token rt_a2 MUST now be revoked (401)
        legit_a2_attempt = await client_b.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_a2}"},
        )
        assert legit_a2_attempt.status_code == 401

        # Independent Device B session (Family B: rt_b0) MUST remain active and rotate cleanly!
        device_b_rot = await client_b.post(
            "/api/v1/auth/refresh",
            headers={"Cookie": f"refresh_token={rt_b0}"},
        )
        assert device_b_rot.status_code == 200
        rt_b1 = device_b_rot.headers["set-cookie"].split("refresh_token=")[1].split(";")[0]
        assert rt_b1 != rt_b0

        # Confirm Postgres state: all Family A rows revoked; Family B retains 1 active leaf
        async with factory_a() as sess:
            all_rows = (
                await sess.execute(
                    select(RefreshToken).where(RefreshToken.user_id == user_id)
                )
            ).scalars().all()
            active_rows = [r for r in all_rows if r.revoked_at is None]
            assert len(active_rows) == 1
            assert active_rows[0].token_hash == compute_token_hash(decode_token(rt_b1)["jti"])
