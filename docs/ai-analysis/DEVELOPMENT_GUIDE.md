# Developer Setup & Operations Guide

## 1. Prerequisites

| Tool | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Docker & Compose** | 24.0+ | Docker Desktop Latest | `docker compose version` |
| **Node.js & npm** | 20.x+ LTS | Node 20.x or 22.x LTS | `node -v && npm -v` |
| **Python** | 3.12+ | Python 3.12.x | `python3 --version` |
| **PostgreSQL** (if non-Docker)| 14+ | PostgreSQL 16.x | `psql --version` |
| **Ollama** (optional AI) | 0.3+ | Latest | `ollama --version` |

---

## 2. Docker Quick Start (Recommended)

Docker starts the synchronized PostgreSQL database, pgAdmin 4 console, FastAPI backend API, and React frontend Vite server.

### Step 1: Environment Variables Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains valid secrets (e.g., `SECRET_KEY`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`).

### Step 2: Build & Start Containers
```bash
# Using Makefile shortcut
make up

# Or directly with Docker Compose
docker compose up -d --build
```

### Step 3: Run Database Migrations
```bash
make migrate
# (Executes: docker compose exec api alembic upgrade head)
```

### Step 4: Seed Data (Roles, Permissions, Master Diseases)
```bash
# Seed permissions, roles, categories, ruleset, and initial admin
make seed

# Seed master botanical dataset (20 diseases + 62 symptoms + translations)
make seed-20

# Or execute both sequentially:
make seed-all
```

### Step 5: Verify Application Services
| Service | URL | Credentials |
| :--- | :--- | :--- |
| **Grower / Admin Web App** | `http://localhost:5174` | Register new account or use seed |
| **Admin Portal** | `http://localhost:5174/admin` | `admin@example.com` / `leetaka!1234568` |
| **FastAPI Swagger Docs** | `http://localhost:8000/docs` | Public API Explorer |
| **pgAdmin 4 Console** | `http://localhost:5050` | `admin@sunflower.local` / `AdminPassword123!` |

---

## 3. Local Host Setup (Without Docker)

### 3.1 Backend Setup (macOS / Linux)
```bash
cd backend

# 1. Create and activate virtual environment
python3.12 -m venv .venv
source .venv/bin/activate

# 2. Install editable package with dev dependencies
pip install -e ".[dev]"

# 3. Configure local environment variables (.env)
# DATABASE_URL=postgresql+asyncpg://sunflower_admin:SuperSecurePassword123!@localhost:5432/sunflower_db
# ALEMBIC_DATABASE_URL=postgresql+psycopg://sunflower_admin:SuperSecurePassword123!@localhost:5432/sunflower_db

# 4. Run database migrations and seeds
alembic upgrade head
python -m scripts.seed
python -m scripts.import_master_20_diseases

# 5. Start development server
uvicorn app.main:app --reload --port 8000
```

### 3.2 Frontend Setup
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
# Running on http://localhost:5174 (proxies /api to http://localhost:8000)
```

---

## 4. Local AI Setup (Ollama)

To enable the local AI conversational crop advisor and vision photo analysis:

```bash
# 1. Install Ollama
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh

# 2. Start Ollama server
ollama serve

# 3. Pull models
ollama pull qwen2.5:7b       # Default text model
ollama pull qwen2-vl:7b      # Default vision model

# 4. Verify in backend/.env:
# AI_ENABLED=true
# AI_VISION_ENABLED=true
# OLLAMA_HOST=http://localhost:11434
# AI_MODEL=qwen2.5:7b
# AI_VISION_MODEL=qwen2-vl:7b
```

---

## 5. Testing & Code Quality Workflows

### 5.1 Running Backend Tests
```bash
cd backend
pytest -v
# Runs all 55 unit, API, and integration test cases
```

### 5.2 Running Frontend Tests
```bash
cd frontend
npm run test -- --run
# Runs all 37 Vitest tests across 9 test suites
```

### 5.3 Static Analysis & Type Checking
```bash
# Frontend TypeScript check
cd frontend
npm run typecheck

# Frontend ESLint
npm run lint

# Backend Ruff check & formatting
cd backend
ruff check .
ruff format .

# Backend Mypy strict typing check
mypy app
```

### 5.4 Regenerating TypeScript API Types
When backend routes or Pydantic schemas change, regenerate TypeScript types from the live OpenAPI schema:
```bash
make gen-api
# (Executes: cd frontend && npm run gen:api)
```
