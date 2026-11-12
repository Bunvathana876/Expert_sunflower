# Automated Database Maintenance Guide

`Expert_sunflower` persists operational security records in PostgreSQL (Alembic revision `0004`):
- `pending_ai_actions` — Two-phase confirmation records for AI-proposed admin mutations.
- `refresh_tokens` — Keyed HMAC-SHA256 refresh-token digests for rotation & revocation.
- `rate_limit_events` — Sliding-window rate-limiting event timestamps.

No background daemon or Redis server is required. Instead, run the idempotent, transactional CLI script `scripts.cleanup_expired` on an external schedule (hourly or daily).

---

## Safety Guarantees

1. **Zero deletion of active records:**
   - Active `pending` / `executing` AI proposals (`expires_at > now`) are never modified or deleted.
   - Active unrevoked refresh tokens (`revoked_at IS NULL AND expires_at > now`) are never deleted.
   - Active sliding-window rate-limit events (`expires_at > now`) are never deleted.
2. **Atomic transaction:** Runs inside a single database transaction and rolls back cleanly on any error or when `--dry-run` is passed.
3. **Structured telemetry:** Emits a `maintenance.cleanup_completed` structured log event (and optional `--json` stdout summary) without logging credentials or secrets.

---

## Configuration (Environment Variables)

| Variable | Default | Description |
|---|---|---|
| `MAINTENANCE_AI_ACTION_RETENTION_HOURS` | `24` | Hours past `expires_at` to retain terminal (`expired`, `cancelled`, `failed`, `executed`) AI action proposals before deletion. Overdue `pending` rows are marked `expired` immediately. |
| `MAINTENANCE_REFRESH_TOKEN_RETENTION_HOURS` | `24` | Hours past `revoked_at` to retain revoked refresh tokens before deletion. |
| `MAINTENANCE_EXPIRED_TOKEN_GRACE_HOURS` | `0` | Additional grace hours past `expires_at` before deleting expired refresh tokens. |
| `MAINTENANCE_RATE_LIMIT_RETENTION_HOURS` | `0` | Additional grace hours past `expires_at` before deleting expired rate-limit events. |

---

## Manual & Dry-Run Execution

```bash
# Preview candidate counts without modifying rows (Docker Compose)
make cleanup-expired-dry-run

# Execute live cleanup (Docker Compose)
make cleanup-expired

# Direct Python execution inside backend virtualenv
cd backend && python -m scripts.cleanup_expired --dry-run --json
cd backend && python -m scripts.cleanup_expired --json
```

---

## Production Scheduling Procedures

### Option A — Host `cron` with Docker Compose (Hourly at `:17`)

Add to `/etc/cron.d/sunflower-maintenance` (permissions `0644`, owned by `root`):

```cron
17 * * * * deploy cd /opt/expert_sunflower && /usr/bin/docker compose exec -T api python -m scripts.cleanup_expired --json >> /var/log/sunflower-maintenance.log 2>&1
```

### Option B — `systemd` Service + Timer (Recommended on Linux VMs)

`/etc/systemd/system/sunflower-cleanup.service`:
```ini
[Unit]
Description=Sunflower expired security records cleanup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/expert_sunflower
ExecStart=/usr/bin/docker compose exec -T api python -m scripts.cleanup_expired --json
```

`/etc/systemd/system/sunflower-cleanup.timer`:
```ini
[Unit]
Description=Run Sunflower maintenance cleanup hourly

[Timer]
OnCalendar=hourly
RandomizedDelaySec=120
Persistent=true

[Install]
WantedBy=timers.target
```

Enable with:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sunflower-cleanup.timer
```

---

## Related Documentation

- For PostgreSQL custom-format backups, SHA-256 & isolated restore verification (`scripts/backup_postgres.sh` / `scripts/verify_backup.sh`), disaster recovery, and production health/security log monitoring, see [`docs/OPERATIONS_AND_BACKUP.md`](./OPERATIONS_AND_BACKUP.md).
