# Sunflower Backend Deployment Guide

This document provides a concise, step-by-step guide to deploying the Sunflower Expert System FastAPI backend to production and staging environments (Render, Supabase, Docker, or Railway).

---

## 1. Architectural Highlights & Improvements

The backend is hardened for cloud deployments:
- **Resilient Database URL Normalization**: Automatically accepts standard cloud URLs starting with `postgres://`, `postgresql://`, or `postgresql+asyncpg://`.
- **Managed SSL & Pooler Support**: Strips raw libpq parameters like `sslmode` from `asyncpg` connection strings (which previously caused runtime crashes) and configures an `SSLContext` with custom CA certificates or system CAs automatically. Also automatically disables prepared statements (`statement_cache_size=0`) when connecting through Supabase or PgBouncer transaction poolers.
- **Dynamic Port Binding**: Supports dynamic port assignment via the `$PORT` environment variable (required by Render, Heroku, Cloud Run, and Railway).
- **Single-Variable Alembic Migrations**: Alembic automatically derives its sync connection string from `DATABASE_URL` if `ALEMBIC_DATABASE_URL` is omitted.
- **Resilient Web Service Startup**: `ADMIN_PASSWORD` is optional at web service startup, preventing crashes if not configured on the API service (required only when executing `python -m scripts.seed`).
- **Health Probes**: Exposes `/health/live`, `/health/ready`, and `/api/v1/health`.

---

## 2. Deploying to Render (Recommended)

The frontend is already configured in `frontend/vercel.json` to proxy API requests to `https://expert-sunflower.onrender.com`.

### Option A: 1-Click Render Blueprint
1. In Render Dashboard, click **New +** -> **Blueprint**.
2. Select the repository `Expert_sunflower-deploy`.
3. Render reads `render.yaml` automatically and configures:
   - **Runtime**: Docker (`backend/Dockerfile`)
   - **Health Check Path**: `/health/live`
   - **Plan**: Starter

### Option B: Manual Web Service Setup
1. In Render Dashboard, select **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service:
   - **Name**: `expert-sunflower-api`
   - **Region**: Singapore (`ap-southeast-1`) or Oregon (`us-west`)
   - **Environment**: `Docker`
   - **Docker Context Directory**: `backend`
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Health Check Path**: `/health/live`
4. Add the following **Environment Variables**:
   | Variable | Value / Description | Example |
   | --- | --- | --- |
   | `ENV` | `production` | `production` |
   | `DATABASE_URL` | Your Supabase or PostgreSQL connection string | `postgresql://postgres.xxx:pass@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require` |
   | `JWT_SECRET` | 32+ character cryptographic secret | Generate: `openssl rand -hex 32` |
   | `CORS_ORIGINS` | Frontend domain(s) separated by comma | `https://expert-sunflower.vercel.app` |
   | `COOKIE_SECURE` | `true` | `true` |
   | `CSRF_REQUIRE_TOKEN` | `true` | `true` |
   | `RATE_LIMIT_ENABLED` | `true` | `true` |
   | `AI_ENABLED` | `false` (or `true` if Ollama is connected) | `false` |

---

## 3. Database Migration & Seeding

After deploying the backend service, run database migrations and initial seed data:

### Running Migrations via Render Shell or Local CLI
```bash
# Point to your production/staging database
export DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"

# Run migrations (Alembic auto-derives sync connection string)
cd backend
alembic upgrade head
```

### Initial Data Seeding (if starting fresh)
```bash
export ADMIN_EMAIL="admin@example.com"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="<STRONG_PASSWORD_HERE>"

python -m scripts.seed
```

---

## 4. Verification & Health Probes

Once deployed, verify the service is operational:

```bash
# Process Liveness
curl -fsS https://expert-sunflower.onrender.com/health/live

# Readiness (verifies database ping & Alembic revision 0004)
curl -fsS https://expert-sunflower.onrender.com/health/ready

# API v1 Health
curl -fsS https://expert-sunflower.onrender.com/api/v1/health

# Public Stats
curl -fsS https://expert-sunflower.onrender.com/api/v1/public/stats
```
