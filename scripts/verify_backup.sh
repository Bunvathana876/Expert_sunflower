#!/usr/bin/env bash
# Non-destructive PostgreSQL backup integrity & isolated restore verifier.
#
# Verification steps:
#   1. File existence, non-zero byte size, and restrictive file mode check.
#   2. SHA-256 checksum verification (when `<archive>.sha256` sidecar exists).
#   3. `pg_restore --list` Table-of-Contents structural verification.
#   4. Isolated restore into a temporary disposable database (`sunflower_restore_verify_*`),
#      verifying Alembic revision and core domain tables, followed by guaranteed cleanup
#      of ONLY the temporary verification database (never touches `sunflower_db`).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-${HOME}/Backups/expert_sunflower}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/docker-compose.yml}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-}"
MODE="auto"
TOC_ONLY="false"
ARCHIVE_PATH=""
EXPECTED_REVISION="${EXPECTED_ALEMBIC_REVISION:-0004}"
KEY_FILE="${BACKUP_ENCRYPTION_KEY_FILE:-}"

usage() {
  cat <<'EOF'
Usage: scripts/verify_backup.sh [--latest | /path/to/backup.dump] [OPTIONS]

Options:
  --latest                      Verify the newest sunflower_db_*.dump in $BACKUP_DIR
  --toc-only                    Verify checksum and pg_restore TOC without temporary DB restore
  --expected-revision REV       Expected Alembic revision in restored DB (default: 0004; 'any' to skip)
  --encryption-key-file FILE    Path to secret passphrase/key file to decrypt .enc archive
  --mode auto|docker|host       Execution mode (default: auto)
  --container NAME              Explicit Docker PostgreSQL container name
  -h, --help                    Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --latest)
      ARCHIVE_PATH="$(ls -1t "${BACKUP_DIR%/}"/sunflower_db_*.dump* 2>/dev/null | grep -v -E '\.(sha256|hmac)$' | head -n 1 || true)"
      shift
      ;;
    --toc-only)
      TOC_ONLY="true"
      shift
      ;;
    --expected-revision)
      EXPECTED_REVISION="$2"
      shift 2
      ;;
    --encryption-key-file)
      KEY_FILE="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --container)
      POSTGRES_CONTAINER="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "ERROR: Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      ARCHIVE_PATH="$1"
      shift
      ;;
  esac
done

if [[ -z "${ARCHIVE_PATH}" || ! -f "${ARCHIVE_PATH}" ]]; then
  echo "ERROR: Backup archive not found. Pass a valid .dump path or --latest." >&2
  exit 1
fi

if [[ ! -s "${ARCHIVE_PATH}" ]]; then
  echo "ERROR: Backup archive is empty: ${ARCHIVE_PATH}" >&2
  exit 1
fi

sha256_file() {
  local target="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${target}" | awk '{print $1}'
  else
    shasum -a 256 "${target}" | awk '{print $1}'
  fi
}

resolve_docker_container() {
  if [[ -n "${POSTGRES_CONTAINER}" ]]; then
    echo "${POSTGRES_CONTAINER}"
    return 0
  fi
  if command -v docker >/dev/null 2>&1; then
    local cid=""
    cid="$(docker compose -f "${COMPOSE_FILE}" ps -q db 2>/dev/null || true)"
    if [[ -n "${cid}" ]]; then
      echo "${cid}"
      return 0
    fi
  fi
  return 1
}

# 1. File permissions & size check
SIZE_BYTES="$(wc -c < "${ARCHIVE_PATH}" | tr -d ' ')"
if stat -f '%Lp' "${ARCHIVE_PATH}" >/dev/null 2>&1; then
  FILE_MODE="$(stat -f '%Lp' "${ARCHIVE_PATH}")"
else
  FILE_MODE="$(stat -c '%a' "${ARCHIVE_PATH}")"
fi
if [[ "${FILE_MODE}" != "600" && "${FILE_MODE}" != "400" ]]; then
  echo "WARN: Backup permissions are ${FILE_MODE} (recommended 600): ${ARCHIVE_PATH}" >&2
fi

# 2. Optional SHA-256 sidecar check
CHECKSUM_PATH="${ARCHIVE_PATH}.sha256"
ACTUAL_SHA256="$(sha256_file "${ARCHIVE_PATH}")"
if [[ -f "${CHECKSUM_PATH}" ]]; then
  EXPECTED_SHA256="$(awk '{print $1}' "${CHECKSUM_PATH}")"
  if [[ "${ACTUAL_SHA256}" != "${EXPECTED_SHA256}" ]]; then
    echo "ERROR: SHA-256 mismatch for ${ARCHIVE_PATH}!" >&2
    exit 1
  fi
  echo "VERIFY_SHA256=MATCH (${ACTUAL_SHA256})"
else
  echo "VERIFY_SHA256=NO_SIDECAR (${ACTUAL_SHA256})"
fi

# 2.5 Decrypt if encrypted archive
RESTORE_TARGET="${ARCHIVE_PATH}"
TEMP_VERIFY_DIR=""
cleanup_all() {
  if [[ -n "${TEMP_DB:-}" && "${TEMP_DB}" == sunflower_restore_verify_* ]]; then
    if [[ "${EXEC_MODE:-}" == "docker" && -n "${CONTAINER_ID:-}" ]]; then
      docker exec "${CONTAINER_ID}" sh -c \
        "psql -U \"\$POSTGRES_USER\" -d postgres -v ON_ERROR_STOP=1 -c 'DROP DATABASE IF EXISTS \"${TEMP_DB}\" WITH (FORCE);'" >/dev/null 2>&1 || true
    else
      psql -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${TEMP_DB}\" WITH (FORCE);" >/dev/null 2>&1 || true
    fi
  fi
  if [[ -n "${TEMP_VERIFY_DIR}" && -d "${TEMP_VERIFY_DIR}" ]]; then
    rm -rf "${TEMP_VERIFY_DIR}"
  fi
}
trap cleanup_all EXIT

if [[ "${ARCHIVE_PATH}" == *.enc ]]; then
  if [[ -z "${KEY_FILE}" ]] || [[ ! -f "${KEY_FILE}" ]]; then
    echo "ERROR: Encrypted archive '${ARCHIVE_PATH}' requires a valid --encryption-key-file." >&2
    exit 2
  fi
  # Authenticated Integrity Verification (Encrypt-then-MAC)
  HMAC_PATH="${ARCHIVE_PATH}.hmac"
  if [[ -f "${HMAC_PATH}" ]]; then
    EXPECTED_HMAC="$(awk '{print $1}' "${HMAC_PATH}")"
    ACTUAL_HMAC="$(openssl dgst -sha256 -hmac "$(cat "${KEY_FILE}")" "${ARCHIVE_PATH}" | awk '{print $NF}')"
    if [[ "${ACTUAL_HMAC}" != "${EXPECTED_HMAC}" ]]; then
      echo "ERROR: HMAC-SHA256 authenticated integrity verification failed for ${ARCHIVE_PATH}!" >&2
      exit 1
    fi
    echo "VERIFY_AUTH_INTEGRITY=MATCH (${ACTUAL_HMAC})"
  fi
  TEMP_VERIFY_DIR="$(mktemp -d /tmp/sf_verify_XXXXXX)"
  chmod 700 "${TEMP_VERIFY_DIR}"
  RESTORE_TARGET="${TEMP_VERIFY_DIR}/decrypted.dump"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
    -in "${ARCHIVE_PATH}" -out "${RESTORE_TARGET}" -pass "file:${KEY_FILE}"
  chmod 600 "${RESTORE_TARGET}"
  echo "VERIFY_DECRYPTED=SUCCESS"
fi

EXEC_MODE="${MODE}"
CONTAINER_ID=""
if [[ "${EXEC_MODE}" == "auto" ]]; then
  if CONTAINER_ID="$(resolve_docker_container)"; then
    EXEC_MODE="docker"
  else
    EXEC_MODE="host"
  fi
elif [[ "${EXEC_MODE}" == "docker" ]]; then
  CONTAINER_ID="$(resolve_docker_container)"
fi

# 3. TOC verification
if [[ "${EXEC_MODE}" == "docker" ]]; then
  TOC_OBJECTS="$(docker exec -i "${CONTAINER_ID}" pg_restore --list < "${RESTORE_TARGET}" | grep -cv '^;' || true)"
else
  TOC_OBJECTS="$(pg_restore --list "${RESTORE_TARGET}" | grep -cv '^;' || true)"
fi

if [[ "${TOC_OBJECTS}" -lt 5 ]]; then
  echo "ERROR: Invalid pg_restore TOC (${TOC_OBJECTS} objects)." >&2
  exit 1
fi
echo "VERIFY_TOC_OBJECTS=${TOC_OBJECTS}"

if [[ "${TOC_ONLY}" == "true" ]]; then
  echo "BACKUP_VERIFICATION_STATUS=PASSED_TOC_ONLY"
  exit 0
fi

# 4. Isolated restore into temporary disposable verification database
RAND_SUFFIX="$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 6 || echo "$$")"
TEMP_DB="sunflower_restore_verify_$(date -u +%Y%m%d_%H%M%S)_${RAND_SUFFIX}"

if [[ "${TEMP_DB}" == "sunflower_db" || "${TEMP_DB}" != sunflower_restore_verify_* ]]; then
  echo "ERROR: Safety assertion failed on temporary database name '${TEMP_DB}'." >&2
  exit 1
fi

if [[ "${EXEC_MODE}" == "docker" ]]; then
  docker exec "${CONTAINER_ID}" sh -c \
    "psql -U \"\$POSTGRES_USER\" -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE \"${TEMP_DB}\" ENCODING '\''UTF8'\'';'" >/dev/null
  docker exec -i "${CONTAINER_ID}" sh -c \
    "pg_restore -U \"\$POSTGRES_USER\" -d \"${TEMP_DB}\" --no-owner --no-acl --exit-on-error" < "${RESTORE_TARGET}"

  RESTORED_SUMMARY="$(docker exec "${CONTAINER_ID}" sh -c \
    "psql -U \"\$POSTGRES_USER\" -d \"${TEMP_DB}\" -At -F '|' -c \"
      SELECT
        (SELECT version_num FROM alembic_version LIMIT 1),
        (SELECT COUNT(*) FROM diseases),
        (SELECT COUNT(*) FROM symptoms),
        (SELECT COUNT(*) FROM roles),
        (SELECT COUNT(*) FROM permissions),
        (SELECT COUNT(*) FROM translations);
    \"")"
else
  psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${TEMP_DB}\" ENCODING 'UTF8';" >/dev/null
  pg_restore -d "${TEMP_DB}" --no-owner --no-acl --exit-on-error "${RESTORE_TARGET}"
  RESTORED_SUMMARY="$(psql -d "${TEMP_DB}" -At -F '|' -c "
    SELECT
      (SELECT version_num FROM alembic_version LIMIT 1),
      (SELECT COUNT(*) FROM diseases),
      (SELECT COUNT(*) FROM symptoms),
      (SELECT COUNT(*) FROM roles),
      (SELECT COUNT(*) FROM permissions),
      (SELECT COUNT(*) FROM translations);
  ")"
fi

IFS='|' read -r RESTORED_REV DISEASES_CNT SYMPTOMS_CNT ROLES_CNT PERMS_CNT TRANS_CNT <<< "${RESTORED_SUMMARY}"

if [[ "${EXPECTED_REVISION}" != "any" && "${RESTORED_REV}" != "${EXPECTED_REVISION}" ]]; then
  echo "ERROR: Expected Alembic revision '${EXPECTED_REVISION}', got '${RESTORED_REV}'." >&2
  exit 1
fi

echo "RESTORED_TEMP_DB=${TEMP_DB} (auto-dropped on exit)"
echo "RESTORED_ALEMBIC_REVISION=${RESTORED_REV}"
echo "RESTORED_COUNTS=diseases:${DISEASES_CNT},symptoms:${SYMPTOMS_CNT},roles:${ROLES_CNT},permissions:${PERMS_CNT},translations:${TRANS_CNT}"
echo "BACKUP_VERIFICATION_STATUS=PASSED"
