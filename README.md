# Sunflower Expert System 🌻

[![CI](https://github.com/Bunvathana876/Expert_sunflower/actions/workflows/ci.yml/badge.svg)](https://github.com/Bunvathana876/Expert_sunflower/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%7C%2017-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Supabase](https://img.shields.io/badge/Supabase-Supported-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_First-5A0FC8.svg?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent, bilingual (**English & Khmer ភាសាខ្មែរ**) agricultural expert system designed for diagnosing sunflower crop diseases. Features multi-step anatomical symptom analysis, multimodal AI photo inspection, offline-first PWA field capabilities, side-by-side disease comparison, downloadable branded PDF reports, real-time Recharts visual analytics, and comprehensive agronomist disease catalog management.

---

## 📑 Table of Contents

- [✨ Features](#-features)
  - [👨‍🌾 For Growers & Field Officers](#-for-growers--field-officers)
  - [🔬 For Agronomists & Researchers](#-for-agronomists--researchers)
  - [🛡️ For Administrators & DevOps](#️-for-administrators--devops)
- [🏗️ Architecture & Technology Stack](#️-architecture--technology-stack)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Quick Start](#-quick-start)
  - [Option A: Docker Compose (All-in-One Local Stack)](#option-a-docker-compose-all-in-one-local-stack)
  - [Option B: Supabase Cloud Database (Zero Local DB)](#option-b-supabase-cloud-database-zero-local-db)
  - [Option C: Local Host Development (Native)](#option-c-local-host-development-native)
- [🗄️ Database Migrations & Data Seeding](#️-database-migrations--data-seeding)
- [🔑 Default Seed Accounts](#-default-seed-accounts)
- [☁️ Cloud Deployment Guide](#️-cloud-deployment-guide)
- [⚙️ Environment Variables Reference](#️-environment-variables-reference)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [📁 Repository Structure](#-repository-structure)
- [🌿 Git Workflow & Push Instructions](#-git-workflow--push-instructions)
- [📚 System Documentation](#-system-documentation)
- [📄 License](#-license)

---

## ✨ Features

### 👨‍🌾 For Growers & Field Officers
- 🌿 **Sunflower Studio UI Theme**: Clean, responsive aesthetic featuring forest-green and sunflower-gold palettes, mobile-optimized navigation, and direct plant-part diagnosis shortcuts.
- 🔍 **Interactive Diagnostic Wizard (`/checker`)**: Multi-step symptom selector organized by plant anatomy (leaves, stems, flower heads, roots, and whole plant) with instant candidate disease scoring.
- 📓 **Field Journal (`/journal`)**: Log field observations with severity ratings, follow-up scheduling, search/filter controls, and CSV data export.
- 📶 **Offline-First Progressive Web App (PWA)**: Complete offline support powered by Service Workers and an IndexedDB queue with automated sync when network connectivity is restored.
- 📄 **Downloadable & Shareable PDF Diagnostic Report (`/result`)**: Export clean branded diagnostic scorecards as high-resolution PDFs (`jspdf` + `html2canvas`) or share directly via the native Web Share API.
- 🔬 **Side-by-Side Disease Comparison Tool (`/diseases/compare`)**: Compare 2–3 diseases simultaneously to distinguish lookalike symptoms (e.g. Downy Mildew vs Powdery Mildew) and verify chemical/fungicide compatibility.
- 💬 **Botanical AI Crop Advisor**: Multimodal conversational assistant supporting crop photo uploads, contextual diagnosis questions, and agricultural recommendations.
- 🌐 **Full Bilingual Support (English & Khmer ភាសាខ្មែរ)**: Localized agronomic terminology, symptom definitions, disease descriptions, and management protocols.
- 👤 **Grower Account & Diagnosis History**: Track historical crop evaluations, confidence scores, and field diagnoses over time.

### 🔬 For Agronomists & Researchers
- 🦠 **Master Catalog (20 Diseases & 62 Clinical Symptoms)**: Comprehensive coverage across fungal, bacterial, oomycete, viral, and parasitic sunflower pathogens.
- 🧬 **Calibrated Rule Engine (`2026.09.1`)**: Bayesian weighted evidence scoring with pathognomonic symptom triggers, required indicators, and Bayesian penalty weights.
- ✍️ **Disease & Symptom Knowledge Editor**: Full CRUD interface for editing diseases, symptoms, anatomical categories, and bilingual translations.
- 📊 **Visual Analytics Dashboard (`/admin`)**: Interactive charts powered by **Recharts**:
  - **Disease Outbreak Trend**: 30-day activity Area Chart with 7d / 14d / 30d time horizons.
  - **Symptom Distribution**: Donut and ranked Horizontal Bar observation frequency charts.
  - **Diagnostic Confidence Distribution**: Statistical distribution across certainty tiers (High, Moderate, Low, Inconclusive).
  - **Quality & Accuracy Scorecards**: Match rate, feedback resolution, and active symptom coverage gauges.
- 📬 **Grower Feedback Queue**: Review unclassified field symptom reports and farmer submissions.

### 🛡️ For Administrators & DevOps
- 👥 **Role-Based Access Control (RBAC)**: 3 core roles (`grower`, `agronomist`, `admin`), 19 atomic permissions, and 40 role-permission mappings.
- ☁️ **Cloud Database & Managed Pooler Support**: Native support for **Supabase PostgreSQL 17** (and transaction poolers like PgBouncer) with automatic URL normalization, SSLContext configuration, and prepared statement handling.
- 🗄️ **pgAdmin 4 Web Console**: Embedded database management tool at `http://localhost:5050` when using Docker Compose.
- 🔒 **Enterprise-Grade Security**: Argon2id password hashing, JWT access tokens, HttpOnly refresh token rotation family, PostgreSQL advisory-lock rate limiting, CSRF tokens, and structured audit logs.
- 🚦 **Automated CI/CD Pipeline**: Multi-job GitHub Actions workflow executing backend linting (Ruff), database migration round-trips, pytest test suites, frontend type checks, Vitest unit tests, Playwright E2E browser tests, vulnerability audits, and Docker production builds.

---

## 🏗️ Architecture & Technology Stack

```mermaid
graph TD
    subgraph Client["Frontend Client (Port 5174)"]
        UI["React 19 + TypeScript + Vite 6"]
        PWA["PWA Service Worker + IndexedDB Offline Storage"]
        Charts["Recharts Visual Analytics"]
        PDF["PDF Exporter (jsPDF + html2canvas)"]
    end

    subgraph Server["Backend API (Port 8000)"]
        API["FastAPI (Python 3.12)"]
        Engine["Agronomic Diagnosis Engine (Ruleset 2026.09.1)"]
        Auth["Argon2id + JWT + Token Families"]
        ORM["SQLAlchemy 2.0 Async (Asyncpg / Psycopg 3)"]
        Migrate["Alembic Migrations (0001 -> 0004)"]
    end

    subgraph Storage["Database & Cloud"]
        LocalDB[("Local PostgreSQL 16 (Port 5434)")]
        CloudDB[("Supabase PostgreSQL 17 (Transaction Pooler)")]
        pgAdmin["pgAdmin 4 Web Interface (Port 5050)"]
    end

    subgraph AI["Optional AI Layer"]
        Ollama["Local Ollama / Botanical Vision & Text LLM"]
    end

    UI -->|REST API + HttpOnly Cookies| API
    PWA -.->|Background Sync| API
    API --> ORM
    ORM -->|Dev / Local| LocalDB
    ORM -->|Staging / Production| CloudDB
    pgAdmin -->|Port 5432| LocalDB
    API -.->|Multimodal Analysis| Ollama
```

### Technology Breakdown

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript (Strict), Vite 6, Tailwind CSS 4, TanStack Query v5, Recharts, `vite-plugin-pwa`, `jspdf`, `html2canvas`, `react-router` v7, `react-i18next` |
| **Backend** | FastAPI, Python 3.12+, SQLAlchemy 2.0 (Asyncpg & Psycopg 3), Alembic, Pydantic v2, Argon2id, PyJWT, Structlog |
| **Database** | PostgreSQL 16 (Local Docker) / PostgreSQL 17 (Supabase Cloud with PgBouncer Pooler) |
| **Infrastructure** | Docker, Docker Compose, Nginx, Caddy (TLS), Render Blueprint (`render.yaml`), Vercel SPA (`vercel.json`), GitHub Actions |

---

## 📋 Prerequisites

| Tool | Minimum Version | Recommended | Purpose |
|---|---|---|---|
| **Git** | `2.x+` | Latest | Version control |
| **Docker & Compose** | `24+` | Docker Desktop | Containerized local development & database |
| **Node.js** | `20.x+` | `20.x` or `22.x LTS` | Frontend development & build |
| **Python** | `3.12+` | `3.12.x` | Backend runtime & scripting |
| **PostgreSQL** | `14+` | `16.x` / Supabase 17 | Database engine |

---

## 🚀 Quick Start

### Option A: Docker Compose (All-in-One Local Stack)

Runs PostgreSQL 16, pgAdmin 4, FastAPI backend, and React frontend in synchronized containers:

```bash
# 1. Clone repository
git clone https://github.com/Bunvathana876/Expert_sunflower.git
cd Expert_sunflower-deploy

# 2. Setup environment file
cp .env.example .env

# 3. Start all services
docker compose up -d --build

# 4. Run migrations and seed data
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
docker compose exec api python -m scripts.import_master_20_diseases
docker compose exec api python -m scripts.create_users
```

> [!TIP]
> **Makefile Shortcuts**: You can also run `make up`, `make migrate`, and `make seed-all` if `make` is installed.

#### Access URLs (Docker)
- 🌐 **Grower Web App**: [http://localhost:5174](http://localhost:5174)
- 🛡️ **Admin Dashboard**: [http://localhost:5174/admin](http://localhost:5174/admin)
- 📄 **API Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🗄️ **pgAdmin 4 Console**: [http://localhost:5050](http://localhost:5050) (`admin@sunflower.local` / `AdminPassword123!`)

---

### Option B: Supabase Cloud Database (Zero Local DB)

You can connect directly to a managed Supabase PostgreSQL 17 instance without running a local database container:

1. **Configure `.env`**:
   Set `DATABASE_URL` and `ALEMBIC_DATABASE_URL` to your Supabase connection strings:
   ```dotenv
   DATABASE_URL=postgresql+asyncpg://postgres.your-project:your-password@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
   ALEMBIC_DATABASE_URL=postgresql+psycopg://postgres.your-project:your-password@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require
   ```
2. **Apply Migrations & Seed Supabase**:
   ```bash
   cd backend
   alembic upgrade head
   python -m scripts.seed
   python -m scripts.import_master_20_diseases
   python -m scripts.create_users
   ```
3. **Start Frontend & Backend**:
   Run FastAPI on port 8000 and Vite on port 5174 (see Option C below).

---

### Option C: Local Host Development (Native)

#### 1. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\Activate.ps1

# Install package in editable mode with development dependencies
pip install --upgrade pip
pip install -e ".[dev]"

# Run migrations and seed database
alembic upgrade head
python -m scripts.seed
python -m scripts.import_master_20_diseases
python -m scripts.create_users

# Start development API server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### 2. Frontend Setup (React 19 + Vite 6)

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The application will be accessible at [http://localhost:5174](http://localhost:5174).

---

## 🗄️ Database Migrations & Data Seeding

The application uses **Alembic** for schema migrations and specialized Python scripts for idempotent seeding:

```bash
# 1. Apply all schema revisions (0001 -> 0004)
alembic upgrade head

# 2. Seed RBAC roles, permissions, symptom categories, ruleset, and admin user
python -m scripts.seed

# 3. Seed Master Catalog (20 sunflower diseases, 62 symptoms, 80 rules, 300 translations)
python -m scripts.import_master_20_diseases

# 4. Create sample agronomist and grower accounts
python -m scripts.create_users
```

### Script Inventory
- `scripts.seed`: Idempotently seeds 3 roles, 19 permissions, 40 role_permissions, 8 anatomical categories, ruleset `2026.09.1`, and admin account.
- `scripts.import_master_20_diseases`: Executes `backend/scripts/seed_20_diseases_and_symptoms.sql` to populate 20 diseases, 62 symptoms, and English/Khmer translations.
- `scripts.create_users`: Creates standard `expert` and `grower` test accounts.
- `scripts.cleanup_expired`: Periodic job to clean up expired refresh tokens and rate-limit audit records.
- `scripts.reset_admin_password`: CLI tool to reset admin password securely.

---

## 🔑 Default Seed Accounts

After running the seed scripts, the following default accounts are available:

| Role | Username / Identifier | Email | Password | Access Capabilities |
|---|---|---|---|---|
| **Administrator** | `admin` | `admin@example.com` | `leetaka!1234568` *(or `.env` value)* | Full system access, RBAC management, analytics, audit log |
| **Agronomist** | `expert` | `expert@example.com` | `expert123` | Knowledge base editing, symptom weight calibration, feedback queue |
| **Grower** | `grower` | `grower@example.com` | `grower123` | Plant health diagnosis, field journal, PDF reports, personal history |

> [!NOTE]
> Growers can also freely register new accounts through the registration page at `/register`.

---

## ☁️ Cloud Deployment Guide

The repository is pre-configured for modern cloud hosting platforms:

```
          ┌──────────────────────────────────────────┐
          │               Vercel                     │
          │  React 19 PWA Frontend (SPA + SW)        │
          │  Proxy /api/v1 -> Render                 │
          └─────────────────────┬────────────────────┘
                                │ HTTPS REST
                                ▼
          ┌──────────────────────────────────────────┐
          │               Render                     │
          │  FastAPI Backend (Docker Container)      │
          │  Auto-scaling, Dynamic $PORT Binding     │
          └─────────────────────┬────────────────────┘
                                │ SSL / TLS (Pooler)
                                ▼
          ┌──────────────────────────────────────────┐
          │              Supabase                    │
          │  Managed PostgreSQL 17 Cloud             │
          │  Transaction Pooler (PgBouncer)          │
          └──────────────────────────────────────────┘
```

- **Backend (Render)**:
  - 1-Click deployment via [`render.yaml`](render.yaml).
  - Health checks: `/health/live` (process alive) and `/health/ready` (database up & Alembic revision `0004` confirmed).
  - Auto-handling of dynamic `$PORT` environment variable.
- **Frontend (Vercel)**:
  - Configured via [`frontend/vercel.json`](frontend/vercel.json) with SPA fallback routes and `/api/v1` reverse-proxy to Render.
- **Database (Supabase)**:
  - Automatic `statement_cache_size=0` and custom TLS SSLContext handling in [`backend/app/db/session.py`](backend/app/db/session.py).

📖 For complete deployment instructions, see the **[Backend Deployment Guide](docs/BACKEND_DEPLOYMENT_GUIDE.md)**.

---

## ⚙️ Environment Variables Reference

Create a `.env` file in the project root:

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://sunflower:sunflower_dev_password@db:5432/sunflower` |
| `ALEMBIC_DATABASE_URL` | Sync PostgreSQL connection string for Alembic | `postgresql+psycopg://sunflower:sunflower_dev_password@db:5432/sunflower` |
| `JWT_SECRET` | 32+ character cryptographic key | `openssl rand -hex 32` |
| `JWT_ALG` | JWT signing algorithm | `HS256` |
| `ACCESS_TTL_MIN` | Access token lifespan (minutes) | `15` |
| `REFRESH_TTL_DAYS` | Refresh token lifespan (days) | `30` |
| `ENV` | Environment name (`development` / `production`) | `development` |
| `LOG_LEVEL` | Log verbosity (`DEBUG`, `INFO`, `WARNING`) | `INFO` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5174,http://localhost:5173` |
| `ADMIN_EMAIL` | Initial admin account email | `admin@example.com` |
| `ADMIN_USERNAME` | Initial admin account username | `admin` |
| `ADMIN_PASSWORD` | Initial admin account password | `leetaka!1234568` |
| `MEDIA_BACKEND` | Storage backend for crop photos (`local` / `s3`) | `local` |
| `VITE_API_BASE_URL` | Frontend API client base URL | `http://localhost:8000/api/v1` |

---

## 🧪 Testing & Quality Assurance

### Backend Quality Suite (Ruff, Mypy & Pytest)

```bash
cd backend

# Code formatting & static lint checks
ruff check .

# Type checking
mypy app

# Run unit tests
pytest tests/unit

# Run full test suite with verbose output
pytest -v
```

### Frontend Quality Suite (ESLint, TypeScript & Vitest)

```bash
cd frontend

# ESLint code style check
npm run lint

# TypeScript strict type checking
npm run typecheck

# Vitest unit and component tests
npm test -- --run

# Production build and PWA service worker generation
npm run build
```

### Browser E2E Lifecycle Testing (Playwright)

```bash
cd frontend
npm run test:e2e
```

---

## 📁 Repository Structure

```
Expert_sunflower-deploy/
├── .github/                       # GitHub Actions CI/CD workflows
│   └── workflows/ci.yml           # Automated multi-job test & build pipeline
├── backend/                       # FastAPI REST API & Agronomic Engine
│   ├── ai/                        # Botanical LLM & Vision diagnostics services
│   ├── alembic/                   # Database migrations (revisions 0001 -> 0004)
│   ├── app/                       # Core FastAPI application
│   │   ├── api/v1/routes/         # API endpoint routers (auth, diagnosis, diseases, etc.)
│   │   ├── core/                  # Security, JWT, config, rate limiting & dependencies
│   │   ├── db/                    # SQLAlchemy async session & pooler normalizer
│   │   ├── models/                # SQLAlchemy ORM relational models
│   │   ├── repositories/          # Data access layer repositories
│   │   ├── schemas/               # Pydantic v2 validation schemas
│   │   └── services/              # Agronomic diagnosis engine & business logic
│   ├── scripts/                   # Database seeding, user creation & maintenance scripts
│   ├── tests/                     # Unit, integration, security & deployment test suites
│   ├── Dockerfile                 # Multi-stage production container
│   ├── pyproject.toml             # Python build metadata & tool configurations
│   └── requirements.txt           # Python dependency specification
│
├── frontend/                      # React 19 + TypeScript + Vite 6 PWA
│   ├── src/
│   │   ├── api/                   # Typed API clients & Axios/Fetch integrations
│   │   ├── components/            # Reusable UI widgets & layout navigation
│   │   ├── features/              # Feature modules (diagnosis, journal, admin, diseases)
│   │   ├── locales/               # Bilingual i18n dictionaries (en.json, km.json)
│   │   └── styles/                # Tailwind CSS 4 & Studio theme tokens
│   ├── public/                    # PWA icons, manifest, and static assets
│   ├── Dockerfile                 # Multi-stage Nginx production container
│   ├── package.json               # Frontend dependencies & scripts
│   ├── tsconfig.json              # TypeScript strict configuration
│   ├── vite.config.ts             # Vite 6 + PWA configuration
│   └── vercel.json                # Vercel deployment & proxy configuration
│
├── caddy/                         # Caddy reverse proxy configuration
│   └── Caddyfile                  # TLS reverse proxy & security headers
├── docs/                          # Comprehensive System Documentation
│   ├── ai/                        # AI admin, permissions & integration guides
│   ├── guides/                    # Setup, onboarding, checklists & quick references
│   ├── BACKEND_DEPLOYMENT_GUIDE.md# Production deployment guide (Render, Supabase)
│   ├── ARCHITECTURE.md            # Technical system architecture
│   ├── DECISIONS.md               # Architecture decision records (ADRs)
│   └── SUPABASE_MIGRATION_EXECUTION_REPORT.md # Supabase migration validation report
│
├── scripts/                       # Database backup, verification & CI utilities
├── docker-compose.yml             # Local multi-service development topology
├── docker-compose.prod.yml        # Hardened non-root production topology
├── docker-compose.caddy.yml       # Caddy TLS production reverse proxy
├── render.yaml                    # 1-Click Render Blueprint specification
├── Makefile                       # Developer shortcuts (make up, make seed-all)
├── .env.example                   # Local development environment template
├── .env.prod.example              # Production environment template
└── .gitignore                     # Git ignore rules for Python, Node, DB & secrets
```

---

## 🌿 Git Workflow & Push Instructions

Follow these steps before pushing your code to GitHub:

### 1. Verify Git Status & Ignored Files
```bash
# Verify no untracked secrets (.env) or build artifacts are present
git status

# Review ignored files to ensure secrets are shielded
git status --ignored
```

### 2. Run Local Quality Verification
```bash
# Backend checks
cd backend
ruff check .
pytest tests/unit
cd ..

# Frontend checks
cd frontend
npm run lint
npm run typecheck
npm test -- --run
npm run build
cd ..
```

### 3. Stage, Commit & Push
```bash
# Stage your modified files
git add .gitignore backend/.gitignore frontend/.gitignore .env.example README.md

# Commit with a clear, conventional commit message
git commit -m "docs: update README and harden gitignore for GitHub push"

# Push to your remote repository
git push origin <your-branch-name>
```

> [!TIP]
> For a full pre-flight checklist, refer to the **[Pre-Push Checklist](docs/guides/PRE_PUSH_CHECKLIST.md)** and **[Ready to Push Guide](docs/guides/READY_TO_PUSH.md)**.

---

## 📚 System Documentation

Explore the following documents in [`docs/`](docs/) for in-depth technical references:

- **[Backend Deployment Guide](docs/BACKEND_DEPLOYMENT_GUIDE.md)**: Production deployment instructions for Render, Supabase, and Vercel.
- **[System Architecture](docs/ARCHITECTURE.md)**: Core architectural concepts, RBAC matrix, and security model.
- **[Pre-Push Checklist](docs/guides/PRE_PUSH_CHECKLIST.md)**: Pre-flight checks before pushing to GitHub.
- **[Ready to Push Guide](docs/guides/READY_TO_PUSH.md)**: Step-by-step push and repository setup instructions.
- **[Supabase Migration Report](docs/SUPABASE_MIGRATION_EXECUTION_REPORT.md)**: Detailed report of Supabase migration and data validation.
- **[Developer Setup Instructions](docs/guides/SETUP_INSTRUCTIONS.md)**: Step-by-step developer onboarding guide.
- **[Quick Reference Guide](docs/guides/QUICK_REFERENCE.md)**: Common CLI commands, endpoints, and developer workflows.
- **[AI Integration & Advisor Guide](docs/ai/AI_INTEGRATION.md)**: Botanical crop advisor and Ollama integration details.
- **[Operations & Backup Guide](docs/OPERATIONS_AND_BACKUP.md)**: Automated backup, verification, and disaster recovery.

---

## 📄 License

Distributed under the [MIT License](https://opensource.org/licenses/MIT). Built for agricultural health research and sunflower farming communities.
