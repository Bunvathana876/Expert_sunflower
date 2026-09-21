# Sunflower Diagnosis Expert System

Bilingual (English / Khmer) expert system for diagnosing sunflower diseases from
observed field symptoms, with a knowledge base maintained by agronomists.

- `backend/` — FastAPI + PostgreSQL JSON API
- `frontend/` — React + Vite single-page app
- The two communicate only over `/api/v1/*`

## Run it

```bash
cp .env.example .env        # then edit the secrets
docker compose up --build
```

- API      http://localhost:8000
- API docs http://localhost:8000/docs
- Web      http://localhost:5173

## First-time setup

```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
```

## Local development without Docker

```bash
# backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head && python -m scripts.seed
uvicorn app.main:app --reload

# frontend
cd frontend
npm install
npm run dev
```

## Project documents

| File | What it holds |
|---|---|
| `AGENTS.md` | Rules the AI coding agent must follow on every task |
| `docs/ARCHITECTURE.md` | Data model, diagnosis algorithm, API surface, permissions |
| `docs/PROMPTS.md` | The build order — one prompt per phase, in sequence |
| `docs/DECISIONS.md` | Running log of architectural decisions |
| `docs/MIGRATION.md` | How to import data from the legacy Flask app |

## Status

Scaffolding only. Directories and configuration exist; the implementation is built
phase by phase using `docs/PROMPTS.md`. Dependency versions in `pyproject.toml` and
`package.json` are starting points — verify them on first install.
