# Production Operations, Backup & Disaster Recovery Runbook

This guide covers PostgreSQL backup creation, automated integrity & isolated restore verification, disaster-recovery restoration, retention policies, maintenance scheduling, and operational health monitoring for **Expert_sunflower**.

> **Safety Rule:** None of the cron or `systemd` schedules in this document are enabled automatically. Review and approve retention parameters before enabling scheduled tasks in production.

---

## 1. Safe PostgreSQL Backups (`scripts/backup_postgres.sh`)

`scripts/backup_postgres.sh` creates compressed custom-format PostgreSQL archives (`pg_dump -Fc --no-owner --no-acl`) with strict file permissions (`umask 077`, directory `0700`, archive `0600`), generates a `.sha256` checksum manifest, and immediately validates the archive Table of Contents via `pg_restore --list`.

### Key Security Properties
- **Zero CLI credential exposure:** Never passes database passwords on command-line arguments (`ps`-safe) and never prints DSNs or secrets to stdout/logs.
- **Database identity guard:** Refuses to run in Docker mode if the container's `POSTGRES_DB` is not `sunflower_db`.
- **Atomic archive write:** Writes to a temporary file (`*.tmp.<pid>`) and atomically renames only after `pg_restore --list` succeeds.

### Common Commands

```bash
# Create an on-demand verified backup in ~/Backups/expert_sunflower (or $BACKUP_DIR)
make backup-db

# Create an encrypted backup using OpenSSL AES-256-CBC (PBKDF2)
./scripts/backup_postgres.sh --label daily --encrypt --encryption-key-file /path/to/backup.key

# Create a labeled pre-release / pre-migration milestone backup
./scripts/backup_postgres.sh --label pre_release

# Preview backup path & retention candidates without writing or deleting files
./scripts/backup_postgres.sh --label daily --prune-older-than-days 30 --dry-run
```

### Encrypted Off-Host Storage Transfer (Examples)

After an encrypted backup (`.dump.enc`) is verified, sync it to secure off-host object storage with object lock / retention policies:

```bash
# Example 1: AWS S3 with KMS or customer-managed key
aws s3 cp "${ARCHIVE_PATH}.enc" s3://sunflower-backups-immutable/pg/ \
  --metadata "sha256=$(cat ${ARCHIVE_PATH}.enc.sha256 | awk '{print $1}')"

# Example 2: rclone to remote cloud storage
rclone copyto "${ARCHIVE_PATH}.enc" remote:sunflower-backups/pg/"$(basename ${ARCHIVE_PATH}.enc)"

# Example 3: Encrypted SCP to off-site backup appliance
scp -i /path/to/deploy_key "${ARCHIVE_PATH}.enc" "${ARCHIVE_PATH}.enc.sha256" backupuser@offsite-storage:/backups/
```

---

## 2. Backup Integrity & Isolated Restore Verification (`scripts/verify_backup.sh`)

Never assume a backup file is restorable until `pg_restore` has reconstructed it inside PostgreSQL. `scripts/verify_backup.sh` performs four checks without touching `sunflower_db`:

1. Verifies file existence, non-zero byte size, and `0600` file permissions.
2. Validates the `.sha256` cryptographic digest sidecar (when present).
3. Verifies `pg_restore --list` Table-of-Contents object count.
4. Creates an isolated disposable database (`sunflower_restore_verify_<UTC_TS>_<RAND>`), runs `pg_restore --no-owner --no-acl --exit-on-error`, asserts `alembic_version = 0004` and core domain table counts (`diseases`, `symptoms`, `roles`, `permissions`, `translations`), and drops **only** the temporary verification database via an `EXIT` trap.

```bash
# Verify the newest backup in ~/Backups/expert_sunflower using an isolated temporary DB
make verify-backup

# Verify a specific archive path
./scripts/verify_backup.sh /path/to/sunflower_db_20261107_170000.dump

# Fast TOC + SHA-256 check only (no temporary database restore)
./scripts/verify_backup.sh --latest --toc-only
```

---

## 3. Safe Rollback Strategy vs. Disaster Recovery

A critical distinction must be maintained between routine application rollbacks and catastrophic disaster recovery:

### 3.1. Routine Deployment Rollback: Application Image Rollback
- **Never execute `alembic downgrade` as a routine rollback:** In staging and production, schema downgrades can drop columns, tables, or constraints, resulting in irreversible data loss (e.g. discarding user accounts, audit trails, active sessions, or AI proposals).
- **Application Image Rollback:** Routine release issues (such as UI regressions, API contract errors, or frontend crashes) are resolved by rolling back the application container images (`web` and `api`) to the previous stable release tag:
  ```bash
  # Example: Roll back web and api images to previous stable SHA or tag
  docker compose -f docker-compose.prod.yml up -d --no-deps api web
  ```
- **Schema Compatibility Requirements (Expand/Contract):** All database migrations must be forward-compatible with the new release and backward-compatible with the immediately preceding release (N-1). Additive schema migrations (adding nullable columns, new tables, or non-breaking indexes) allow prior application images to run without schema modification.

### 3.2. Pre-Deployment Milestone Backup
Before any staging or production deployment or migration is applied, an immutable, verified milestone backup must be generated:
```bash
# 1. Create encrypted pre-deployment milestone backup
./scripts/backup_postgres.sh --label pre_deploy_$(date +%Y%m%d) \
  --encrypt --encryption-key-file /etc/sunflower/backup.key --remove-plaintext

# 2. Immediately verify archive TOC, HMAC authentication, and isolated temporary restore
./scripts/verify_backup.sh --latest --encryption-key-file /etc/sunflower/backup.key
```

### 3.3. Catastrophic Disaster Recovery (Explicit Operator Approval Required)
Database restoration from a backup archive is reserved **strictly for catastrophic disaster recovery** (e.g. unrecoverable disk corruption or accidental data destruction). It is **never automated** and requires explicit human operator confirmation.

**Never automatically drop or recreate existing databases.** Follow these controlled manual steps:

1. **Verify target archive in an isolated temporary database first:**
   ```bash
   ./scripts/verify_backup.sh /var/backups/sunflower/sunflower_db_<timestamp>.dump.enc \
     --encryption-key-file /etc/sunflower/backup.key
   ```
2. **Stop write traffic (`api` and `web` containers) while keeping `db` running:**
   ```bash
   docker compose -f docker-compose.prod.yml stop web api
   ```
3. **Capture a safety snapshot of the active database before any modification (if reachable):**
   ```bash
   ./scripts/backup_postgres.sh --label pre_recovery_safety_snapshot \
     --encrypt --encryption-key-file /etc/sunflower/backup.key --remove-plaintext
   ```
4. **Explicit Operator Approval Gate:**
   The lead operator / DBA must inspect the active database state, confirm the decision in writing, and manually execute the recreate step:
   ```bash
   # MANUAL ONLY — Requires explicit human operator authorization:
   docker compose -f docker-compose.prod.yml exec -T db sh -c '
     psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
       -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '\''sunflower_db'\'' AND pid <> pg_backend_pid();" \
       -c "DROP DATABASE \"sunflower_db\";" \
       -c "CREATE DATABASE \"sunflower_db\" ENCODING '\''UTF8'\'';"
   '
   ```
5. **Restore verified archive using `--exit-on-error`:**
   ```bash
   # Decrypt archive to secure RAM/temporary file or pipe:
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
     -in /var/backups/sunflower/sunflower_db_<timestamp>.dump.enc \
     -pass file:/etc/sunflower/backup.key | \
     docker compose -f docker-compose.prod.yml exec -T db sh -c \
       'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --exit-on-error'
   ```
6. **Verify schema head and restart services:**
   ```bash
   docker compose -f docker-compose.prod.yml run --rm migrate
   docker compose -f docker-compose.prod.yml up -d api web
   curl -fsS http://127.0.0.1:8080/health/ready
   ```

---

## 4. Backup Retention Policy

| Backup Tier | Naming Pattern | Recommended Cadence | Recommended Retention | Pruning Behavior |
|---|---|---|---|---|
| **Daily Automated** | `sunflower_db_daily_<UTC>.dump.enc` | Daily at `02:15 UTC` | **30 days** on local encrypted volume + off-host object storage | Eligible for `--prune-older-than-days 30` only after verification passes |
| **Weekly Verification** | Tested via `verify_backup.sh` | Weekly (Sunday `03:00 UTC`) | **90 days** in off-host encrypted storage | Isolated restore validation; off-host object lock / lifecycle |
| **Milestone / Pre-Deployment** | `sunflower_db_pre_*_<UTC>.dump.enc` | Prior to every deployment or migration | **Indefinite / Manual review** | Protected from automatic pruning (`*_pre_*` excluded) |

---

## 5. Scheduling Examples (Disabled by Default — Reference Only)

> [!CAUTION]
> **DO NOT ACTIVATE CRON JOBS YET.** The following examples are provided for staging/production review. No automated scheduling should be enabled until operator authorization is granted.

### Secure Backup Encryption Key Provisioning
Create a dedicated 256-bit secret key file with restrictive permissions (`0400`):
```bash
sudo mkdir -p /etc/sunflower
sudo chmod 700 /etc/sunflower
openssl rand -hex 32 | sudo tee /etc/sunflower/backup.key >/dev/null
sudo chmod 400 /etc/sunflower/backup.key
```

### Verified Chained Execution (`cron` Example)
To guarantee that **pruning never occurs unless the new backup passes isolated restore verification**, tasks must be chained sequentially with `&&`. If backup creation or verification fails at any stage, the chain terminates immediately and older backups remain intact.

`/etc/cron.d/sunflower-backups` (`0644`, `root` — **Reference only; do not activate yet**):

```cron
# 1. Daily Encrypted Backup -> Full Isolated Verification -> Pruning of older verified backups
15 2 * * * deploy BACKUP_DIR=/var/backups/sunflower COMPOSE_FILE=/opt/expert_sunflower/docker-compose.prod.yml /opt/expert_sunflower/scripts/backup_postgres.sh --label daily --encrypt --encryption-key-file /etc/sunflower/backup.key --remove-plaintext && /opt/expert_sunflower/scripts/verify_backup.sh --latest --encryption-key-file /etc/sunflower/backup.key && /opt/expert_sunflower/scripts/backup_postgres.sh --prune-only --prune-older-than-days 30 >> /var/log/sunflower-backup.log 2>&1

# 2. Off-Host Replication (Executed only after local archive is verified)
45 2 * * * deploy test -f /var/backups/sunflower/*.dump.enc && aws s3 sync /var/backups/sunflower/ s3://sunflower-backups-immutable/pg/ --exclude "*" --include "*.enc" --include "*.sha256" --include "*.hmac" >> /var/log/sunflower-replication.log 2>&1
```

For hourly cleanup of expired `pending_ai_actions`, `refresh_tokens`, and `rate_limit_events` rows, see [`docs/MAINTENANCE.md`](./MAINTENANCE.md).

---

## 6. Operational Monitoring & Alerting Guide

### Health, Readiness & Metrics Endpoints
- **`GET /health/live`** -> Lightweight process liveness check (`200 {"status": "ok"}`). Suitable for container restart policies.
- **`GET /health/ready`** -> Deep readiness gate (`200` only when PostgreSQL responds to `SELECT 1` **and** `alembic_version` equals `REQUIRED_ALEMBIC_REVISION` `0004`; returns `503` otherwise without leaking internal hostnames or SQL errors). Inspects real-time connection pool status (`size`, `checked_in`, `checked_out`, `overflow`).
- **`GET /health/metrics`** -> Telemetry endpoint reporting database connection pool utilization, environment info, and rate-limiting status.
- **`X-Response-Time`** -> Header returned on every request tracking exact server-side processing latency in milliseconds.

### Structured Log Events to Monitor (`structlog` JSON in `ENV=production`)
| Event Key | Level | Meaning & Recommended Action |
|---|---|---|
| `security.auth.token_family_compromised` | `WARNING` | Reused rotated refresh token detected; entire `family_id` was automatically revoked. Alert security monitoring if rate spikes across multiple `user_id`s. |
| `security.event.unauthorized` | `WARNING` | HTTP 401 unauthorized attempt (invalid token, expired session, wrong algorithm, or bad credentials). |
| `security.event.forbidden` | `WARNING` | HTTP 403 authorization denial (inactive account or insufficient permissions). |
| `security.event.rate_limited` | `WARNING` | HTTP 429 rate limit exceeded. |
| `security.csrf.rejected` | `WARNING` | Blocked cross-site / missing-token / untrusted-origin cookie request (`403`). Check `reason` (`cross_site_fetch_metadata`, `untrusted_origin`, `missing_csrf_token`). |
| `security.rate_limit.exceeded` | `WARNING` | Client exceeded sliding-window threshold (`429`). Monitor `scope` (`auth:login:ip`, `auth:refresh:ip`, `ai:admin_chat:user`). |
| `health.db_ping_failed` / `health.migration_mismatch` | `WARNING` | Readiness probe degraded (`503`). Page on-call DBA / check `migrate` job status. |
| `maintenance.cleanup_completed` | `INFO` | Confirm periodic maintenance job completed (`dry_run=false`) and row counts stay bounded. |
| `http.unhandled_exception` | `ERROR` | Unexpected HTTP `500` correlated via `request_id` (`X-Request-Id`). |

---

## 7. Optional Production HTTPS Architecture (Caddy Reverse Proxy)

For automated production TLS with automated certificate issuance, HTTP->HTTPS redirection, and HSTS:

```bash
# Validate Caddy + Production Compose topology:
make caddy-config

# Launch full HTTPS topology (ACME TLS + web + api + isolated db):
docker compose -f docker-compose.prod.yml -f docker-compose.caddy.yml up -d
```

Key features:
- Automatically issues certificates via Let's Encrypt / ZeroSSL (or internal CA for staging).
- Automatically redirects HTTP (port 80) to HTTPS (port 443).
- Applies HSTS (`max-age=63072000; includeSubDomains; preload`).
- Proxies same-origin API routes (`/api/*`), media files (`/media/*`), and health probes (`/health*`) to backend.
- Supports WebSockets natively.
- Ensures PostgreSQL is never exposed to the public Internet (internal Docker network only).
