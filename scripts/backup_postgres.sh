#!/usr/bin/env bash
# Safe, credential-clean PostgreSQL custom-format backup script for Expert_sunflower.
#
# Features:
# - Enforces `umask 077` and `0700` backup directory permissions (zero world-readable window).
# - Never passes passwords on CLI arguments (`ps`-safe) and never prints connection secrets.
# - Immediately verifies archive Table of Contents (`pg_restore --list`) and writes `.sha256`.
# - Optional retention pruning (`--prune-older-than-days N`) is strictly opt-in and never
#   deletes `*_pre_*` milestone/migration backups unless `--include-milestone` is passed.

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-${HOME}/Backups/expert_sunflower}"
COMPOSE_FILE="${COMPOSE_FILE:-${REPO_ROOT}/docker-compose.yml}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-}"
MODE="auto"
LABEL=""
PRUNE_DAYS=""
PRUNE_ONLY="false"
INCLUDE_MILESTONE="false"
DRY_RUN="false"
ENCRYPT="false"
KEY_FILE="${BACKUP_ENCRYPTION_KEY_FILE:-}"
REMOVE_PLAINTEXT="false"

usage() {
  cat <<'EOF'
Usage: scripts/backup_postgres.sh [OPTIONS]

Options:
  --output-dir DIR              Destination directory (default: $BACKUP_DIR or ~/Backups/expert_sunflower)
  --label TAG                   Optional safe tag (alphanumeric/_/-), e.g. daily or pre_release
  --mode auto|docker|host       Execution mode (default: auto)
  --container NAME              Explicit Docker PostgreSQL container name
  --encrypt                     Encrypt backup archive with OpenSSL AES-256-CBC (PBKDF2)
  --encryption-key-file FILE    Path to secret passphrase/key file for AES-256-CBC encryption
  --remove-plaintext            Remove plaintext .dump after successful encryption (requires --encrypt)
  --prune-older-than-days DAYS  Opt-in retention cleanup for automatic backups older than DAYS (>= 1)
  --prune-only                  Perform retention pruning only without creating a new backup (requires --prune-older-than-days)
  --include-milestone           Allow retention pruning to include *_pre_* milestone backups
  --dry-run                     Preview backup target and retention candidates without writing/deleting
  -h, --help                    Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --label)
      LABEL="$2"
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
    --encrypt)
      ENCRYPT="true"
      shift
      ;;
    --encryption-key-file)
      ENCRYPT="true"
      KEY_FILE="$2"
      shift 2
      ;;
    --remove-plaintext)
      REMOVE_PLAINTEXT="true"
      shift
      ;;
    --prune-older-than-days)
      PRUNE_DAYS="$2"
      shift 2
      ;;
    --prune-only)
      PRUNE_ONLY="true"
      shift
      ;;
    --include-milestone)
      INCLUDE_MILESTONE="true"
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -n "${LABEL}" && ! "${LABEL}" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "ERROR: --label must contain only ASCII letters, digits, underscores, or hyphens." >&2
  exit 2
fi

if [[ -n "${PRUNE_DAYS}" ]]; then
  if [[ ! "${PRUNE_DAYS}" =~ ^[0-9]+$ ]] || [[ "${PRUNE_DAYS}" -lt 1 ]]; then
    echo "ERROR: --prune-older-than-days must be a positive integer (>= 1)." >&2
    exit 2
  fi
fi

if [[ "${PRUNE_ONLY}" == "true" && -z "${PRUNE_DAYS}" ]]; then
  echo "ERROR: --prune-only requires --prune-older-than-days." >&2
  exit 2
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

if [[ "${PRUNE_ONLY}" == "true" ]]; then
  echo "INFO: Running in --prune-only mode (retention cleanup only, skipping archive creation)."
else
  EXEC_MODE="${MODE}"
  CONTAINER_ID=""
  if [[ "${EXEC_MODE}" == "auto" ]]; then
    if CONTAINER_ID="$(resolve_docker_container)"; then
      EXEC_MODE="docker"
    else
      EXEC_MODE="host"
    fi
  elif [[ "${EXEC_MODE}" == "docker" ]]; then
    if ! CONTAINER_ID="$(resolve_docker_container)"; then
      echo "ERROR: Could not locate running PostgreSQL Docker container." >&2
      exit 1
    fi
  elif [[ "${EXEC_MODE}" != "host" ]]; then
    echo "ERROR: Invalid --mode '${EXEC_MODE}' (expected auto, docker, or host)." >&2
    exit 2
  fi

  UTC_TS="$(date -u +%Y%m%d_%H%M%S)"
  if [[ -n "${LABEL}" ]]; then
    ARCHIVE_NAME="sunflower_db_${LABEL}_${UTC_TS}.dump"
  else
    ARCHIVE_NAME="sunflower_db_${UTC_TS}.dump"
  fi
  ARCHIVE_PATH="${BACKUP_DIR%/}/${ARCHIVE_NAME}"
  CHECKSUM_PATH="${ARCHIVE_PATH}.sha256"

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[DRY-RUN] Mode:        ${EXEC_MODE}"
    echo "[DRY-RUN] Destination: ${ARCHIVE_PATH}"
  else
    mkdir -p "${BACKUP_DIR}"
    chmod 700 "${BACKUP_DIR}"

    TMP_ARCHIVE="${ARCHIVE_PATH}.tmp.$$"
    cleanup_partial() {
      rm -f "${TMP_ARCHIVE}"
    }
    trap cleanup_partial EXIT

    if [[ "${EXEC_MODE}" == "docker" ]]; then
      DB_Check="$(docker exec "${CONTAINER_ID}" sh -c 'printf "%s" "${POSTGRES_DB:-sunflower_db}"')"
      if [[ "${DB_Check}" != "sunflower_db" ]]; then
        echo "ERROR: Refusing backup: unexpected container POSTGRES_DB='${DB_Check}'." >&2
        exit 1
      fi
      docker exec "${CONTAINER_ID}" sh -c \
        'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "${TMP_ARCHIVE}"
      TOC_LINES="$(docker exec -i "${CONTAINER_ID}" pg_restore --list < "${TMP_ARCHIVE}" | grep -cv '^;' || true)"
    else
      TARGET_DB="${PGDATABASE:-sunflower_db}"
      pg_dump -d "${TARGET_DB}" -Fc --no-owner --no-acl -f "${TMP_ARCHIVE}"
      TOC_LINES="$(pg_restore --list "${TMP_ARCHIVE}" | grep -cv '^;' || true)"
    fi

    if [[ ! -s "${TMP_ARCHIVE}" ]] || [[ "${TOC_LINES}" -lt 5 ]]; then
      echo "ERROR: Backup validation failed (empty archive or invalid pg_restore TOC)." >&2
      exit 1
    fi

    chmod 600 "${TMP_ARCHIVE}"
    mv "${TMP_ARCHIVE}" "${ARCHIVE_PATH}"
    trap - EXIT

    DIGEST="$(sha256_file "${ARCHIVE_PATH}")"
    printf "%s  %s\n" "${DIGEST}" "${ARCHIVE_NAME}" > "${CHECKSUM_PATH}"
    chmod 600 "${CHECKSUM_PATH}"

    SIZE_BYTES="$(wc -c < "${ARCHIVE_PATH}" | tr -d ' ')"
    echo "BACKUP_CREATED=${ARCHIVE_PATH}"
    echo "BACKUP_BYTES=${SIZE_BYTES}"
    echo "BACKUP_TOC_OBJECTS=${TOC_LINES}"
    echo "BACKUP_SHA256=${DIGEST}"

    if [[ "${ENCRYPT}" == "true" ]]; then
      if [[ -z "${KEY_FILE}" ]] || [[ ! -f "${KEY_FILE}" ]]; then
        echo "ERROR: --encrypt requires a valid --encryption-key-file." >&2
        exit 2
      fi
      ENC_PATH="${ARCHIVE_PATH}.enc"
      ENC_CHECKSUM="${ENC_PATH}.sha256"
      ENC_HMAC_PATH="${ENC_PATH}.hmac"
      openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "${ARCHIVE_PATH}" -out "${ENC_PATH}" -pass "file:${KEY_FILE}"
      chmod 600 "${ENC_PATH}"

      # SHA-256 integrity checksum
      ENC_DIGEST="$(sha256_file "${ENC_PATH}")"
      printf "%s  %s\n" "${ENC_DIGEST}" "$(basename "${ENC_PATH}")" > "${ENC_CHECKSUM}"
      chmod 600 "${ENC_CHECKSUM}"

      # HMAC-SHA256 authenticated integrity (Encrypt-then-MAC paradigm)
      ENC_HMAC="$(openssl dgst -sha256 -hmac "$(cat "${KEY_FILE}")" "${ENC_PATH}" | awk '{print $NF}')"
      printf "%s  %s\n" "${ENC_HMAC}" "$(basename "${ENC_PATH}")" > "${ENC_HMAC_PATH}"
      chmod 600 "${ENC_HMAC_PATH}"

      ENC_BYTES="$(wc -c < "${ENC_PATH}" | tr -d ' ')"
      echo "ENCRYPTED_BACKUP_CREATED=${ENC_PATH}"
      echo "ENCRYPTED_BACKUP_BYTES=${ENC_BYTES}"
      echo "ENCRYPTED_BACKUP_SHA256=${ENC_DIGEST}"
      echo "ENCRYPTED_BACKUP_HMAC_SHA256=${ENC_HMAC}"

      if [[ "${REMOVE_PLAINTEXT}" == "true" ]]; then
        rm -f "${ARCHIVE_PATH}" "${CHECKSUM_PATH}"
        echo "PLAINTEXT_REMOVED=true"
      fi
    fi
  fi
fi

# Opt-in retention pruning (never runs unless --prune-older-than-days is explicitly supplied)
if [[ -n "${PRUNE_DAYS}" ]] && [[ -d "${BACKUP_DIR}" ]]; then
  PRUNED_COUNT=0
  while IFS= read -r -d '' candidate; do
    base="$(basename "${candidate}")"
    if [[ "${INCLUDE_MILESTONE}" != "true" && "${base}" == *_pre_* ]]; then
      continue
    fi
    if [[ "${DRY_RUN}" == "true" ]]; then
      echo "[DRY-RUN] Would prune expired backup: ${candidate}"
    else
      rm -f "${candidate}" "${candidate}.sha256" "${candidate}.hmac"
      echo "PRUNED_BACKUP=${candidate}"
    fi
    PRUNED_COUNT=$((PRUNED_COUNT + 1))
  done < <(find "${BACKUP_DIR}" -maxdepth 1 -type f \( -name 'sunflower_db_*.dump' -o -name 'sunflower_db_*.dump.enc' \) -mtime +"${PRUNE_DAYS}" -print0)
  echo "RETENTION_CANDIDATES=${PRUNED_COUNT}"
fi
