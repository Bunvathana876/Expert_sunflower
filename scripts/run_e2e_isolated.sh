#!/usr/bin/env bash
# ==============================================================================
# Sunflower Expert System — Isolated E2E Test Suite Runner
#
# Provisions a temporary, disposable PostgreSQL database and ephemeral API
# container for Playwright E2E browser tests. Guarantees zero pollution of
# development, staging, or production databases.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RAND_ID="$(openssl rand -hex 4)"
TEST_DB="sunflower_e2e_${RAND_ID}"
CONTAINER_NAME="sunflower_e2e_api_${RAND_ID}"
TEST_PORT="${E2E_ISOLATED_PORT:-8009}"

# Strict verification of disposable database identity
if [[ ! "${TEST_DB}" =~ ^sunflower_e2e_[0-9a-f]{8}$ ]] || [[ "${TEST_DB}" == "sunflower_db" ]] || [[ "${TEST_DB}" == "postgres" ]]; then
  echo "❌ FATAL: Generated invalid or unsafe disposable database name: '${TEST_DB}'" >&2
  exit 1
fi

cleanup() {
  local exit_code=$?
  set +e
  echo ""
  echo "🧹 [Cleanup] Tearing down isolated E2E test environment..."
  if [ -n "${CONTAINER_NAME:-}" ] && [[ "${CONTAINER_NAME}" =~ ^sunflower_e2e_api_[0-9a-f]{8}$ ]]; then
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi
  # Safe DROP DATABASE targeting: strictly match disposable pattern and forbid primary DBs
  if [ -n "${TEST_DB:-}" ] && [[ "${TEST_DB}" =~ ^sunflower_e2e_[0-9a-f]{8}$ ]] && [[ "${TEST_DB}" != "sunflower_db" ]] && [[ "${TEST_DB}" != "postgres" ]]; then
    docker compose -f "${PROJECT_ROOT}/docker-compose.yml" exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d postgres -c \"DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE);\"" >/dev/null 2>&1 || true
    echo "✨ [Cleanup] Isolated database ${TEST_DB} dropped. Ephemeral container removed."
  else
    echo "⚠️ [Cleanup] Skipped database drop: '${TEST_DB:-}' did not match disposable safety pattern."
  fi
  exit "${exit_code}"
}

trap cleanup EXIT INT TERM HUP

echo "======================================================================"
echo "🌻 Starting Isolated Playwright E2E Test Suite"
echo "   Disposable DB: ${TEST_DB}"
echo "   Ephemeral Port: ${TEST_PORT}"
echo "======================================================================"

cd "${PROJECT_ROOT}"

# 1. Verify Docker Compose database service is responsive
if ! docker compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER"' >/dev/null 2>&1; then
  echo "❌ Error: Docker Compose PostgreSQL 'db' service is not running or not ready." >&2
  echo "   Please start the stack with 'make up' or 'docker compose up -d db' first." >&2
  exit 1
fi

# 2. Strict Production Guard & Database Safety
for env_var in "${ENVIRONMENT:-}" "${ENV:-}" "${APP_ENV:-}" "${NODE_ENV:-}"; do
  if [ "${env_var}" = "production" ]; then
    echo "❌ FATAL: Refusing to run E2E test suite with production environment setting!" >&2
    exit 1
  fi
done

DB_USER="$(docker compose exec -T db sh -c 'printf "%s" "$POSTGRES_USER"')"
DB_PASS="$(docker compose exec -T db sh -c 'printf "%s" "$POSTGRES_PASSWORD"')"
PRIMARY_DB="$(docker compose exec -T db sh -c 'printf "%s" "$POSTGRES_DB"')"

if [ "${TEST_DB}" = "${PRIMARY_DB}" ]; then
  echo "❌ FATAL: Collision between disposable DB name and primary DB '${PRIMARY_DB}'!" >&2
  exit 1
fi

# 3. Create isolated database with explicit ownership
echo "📦 Creating disposable database ${TEST_DB} (owner: ${DB_USER})..."
docker compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d postgres -c \"CREATE DATABASE ${TEST_DB} OWNER \\\"\$POSTGRES_USER\\\";\"" >/dev/null

TEST_ASYNC_URL="postgresql+asyncpg://${DB_USER}:${DB_PASS}@db:5432/${TEST_DB}"
TEST_SYNC_URL="postgresql+psycopg://${DB_USER}:${DB_PASS}@db:5432/${TEST_DB}"

# 4. Migrate schema to latest revision (0004)
echo "⚡ Applying Alembic migrations..."
docker compose run --rm --no-deps -e DATABASE_URL="${TEST_ASYNC_URL}" -e ALEMBIC_DATABASE_URL="${TEST_SYNC_URL}" -e ENVIRONMENT="testing" api alembic upgrade head >/dev/null

# 5. Seed sunflower domain records (diseases, symptoms, translations, default admin/grower)
echo "🌱 Seeding domain knowledge base and baseline roles..."
docker compose run --rm --no-deps -e DATABASE_URL="${TEST_ASYNC_URL}" -e ALEMBIC_DATABASE_URL="${TEST_SYNC_URL}" -e ENVIRONMENT="testing" api python -m scripts.seed >/dev/null
docker compose run --rm --no-deps -e DATABASE_URL="${TEST_ASYNC_URL}" -e ALEMBIC_DATABASE_URL="${TEST_SYNC_URL}" -e ENVIRONMENT="testing" api python -m scripts.import_master_20_diseases >/dev/null

# 6. Launch isolated backend API container
echo "📡 Launching ephemeral FastAPI backend on port ${TEST_PORT}..."
docker compose run -d --name "${CONTAINER_NAME}" -p "${TEST_PORT}:8000" \
  -e DATABASE_URL="${TEST_ASYNC_URL}" \
  -e ALEMBIC_DATABASE_URL="${TEST_SYNC_URL}" \
  -e ENVIRONMENT="testing" \
  -e RATE_LIMIT_FAIL_CLOSED="true" \
  api uvicorn app.main:app --host 0.0.0.0 --port 8000 >/dev/null

# 7. Wait for backend readiness probe
echo "⏳ Waiting for isolated backend to pass health check..."
READY=0
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${TEST_PORT}/health/ready" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "${READY}" -ne 1 ]; then
  echo "❌ Error: Ephemeral API container failed readiness check." >&2
  docker logs "${CONTAINER_NAME}" || true
  exit 1
fi

echo "✅ Isolated backend is healthy and ready."

# 8. Build frontend and execute Playwright against isolated backend
cd "${PROJECT_ROOT}/frontend"
echo "🏗️ Building frontend bundle..."
npm run build >/dev/null

echo "🎭 Running Playwright E2E browser tests..."
E2E_API_TARGET="http://127.0.0.1:${TEST_PORT}" npm run test:e2e -- "$@"

echo "🎉 All isolated E2E tests completed successfully!"
