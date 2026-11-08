# Technology Stack & Environment Specification

## 1. Stack Matrix

```mermaid
graph TD
    subgraph Frontend ["Client Tier (Browser / PWA)"]
        F1[React 19.0 + TypeScript 5.6]
        F2[Vite 6.0 + @tailwindcss/vite 4.0]
        F3[TanStack React Query v5.59]
        F4[React Router v7.0]
        F5[i18next v24 + react-i18next v15]
        F6[Recharts v3.10.1 + Lucide Icons]
        F7[idb v8.0 IndexedDB + Workbox PWA]
        F8[jsPDF v4.2 + html2canvas v1.4]
    end

    subgraph Backend ["Application Tier (REST API)"]
        B1[Python 3.12 Runtime]
        B2[FastAPI 0.115 + Uvicorn 0.32]
        B3[Pydantic v2.9 + Pydantic Settings v2.6]
        B4[SQLAlchemy 2.0.36 Asyncio]
        B5[Alembic 1.14 Migrations]
        B6[Argon2id + python-jose Cryptography]
        B7[Pillow 11.0 + Structlog 24.4]
        B8[HTTPX 0.27 Async Client]
    end

    subgraph AI ["AI Subsystem (Local Edge)"]
        A1[Ollama Server @ localhost:11434]
        A2[Text LLM: qwen2.5:7b / llama3.2:3b]
        A3[Vision VLM: qwen2-vl:7b / llama3.2-vision:11b]
    end

    subgraph Data ["Data Tier"]
        D1[(PostgreSQL 16 Alpine)]
        D2[pgAdmin 4 Container]
        D3[Local Storage Volume: /var/lib/sunflower/media]
    end

    Frontend -->|HTTPS REST + JSON / RFC 7807| Backend
    Backend -->|asyncpg driver pool| D1
    Backend -->|Async HTTP calls| AI
    Backend -->|Static File Mount / Media Storage| D3
    pgAdmin 4 -->|Port 5432| D1
```

---

## 2. Detailed Component Breakdown

### 2.1 Backend Environment & Dependencies
- **Runtime**: Python 3.12 (Strict typing enforced with `mypy --strict`).
- **Web Framework**: `fastapi>=0.115` with ASGI web server `uvicorn[standard]>=0.32`.
- **Database ORM**: `sqlalchemy[asyncio]>=2.0.36` using `asyncpg>=0.30` for asynchronous query execution and `psycopg[binary]>=3.2` as sync driver for Alembic migration executions.
- **Data Validation & Settings**: `pydantic>=2.9` and `pydantic-settings>=2.6`.
- **Security & Cryptography**:
  - `argon2-cffi>=23.1`: Argon2id modern password hashing with dummy verification to mitigate timing attacks.
  - `python-jose[cryptography]>=3.3`: JWT generation, signing, and verification.
  - Native standard library fallback: `hashlib.scrypt` and `hashlib.pbkdf2_hmac` for backward-compatible migration of legacy Werkzeug hashes.
- **Structured Logging**: `structlog>=24.4` with Request ID tracing middleware (`X-Request-ID`).
- **Image Processing**: `pillow>=11.0` for image dimension validation, EXIF metadata stripping, and thumbnail generation.
- **HTTP Client**: `httpx>=0.27` for non-blocking asynchronous communication with the local Ollama daemon.
- **Testing & Quality Tools**:
  - `pytest>=8.3`, `pytest-asyncio>=0.24`, `aiosqlite>=0.20` (in-memory SQLite for rapid integration testing).
  - `ruff>=0.7` (linter and formatter conforming to Python 3.12 standards).
  - `mypy>=1.13` with Pydantic plugin.

### 2.2 Frontend Environment & Dependencies
- **Runtime & Build Tooling**: Node.js 20+ / 22+ LTS, Vite 6.0 (`vite.config.ts`), TypeScript 5.6.
- **UI Library**: React 19 (`react`, `react-dom`).
- **Routing**: `react-router` v7 (`createBrowserRouter`, `RouterProvider`, `Outlet`, lazy component resolution).
- **Styling & Design System**: Tailwind CSS v4 (`@tailwindcss/vite`, `clsx`, `tailwind-merge`), custom CSS custom properties (Amber and Emerald botanical theme), dark/light mode toggle.
- **Server State Management**: `@tanstack/react-query` v5 (`useQuery`, `useMutation`, automatic query invalidation and optimistic updates).
- **Forms & Validation**: `react-hook-form` v7 with `@hookform/resolvers` and `zod` schemas.
- **Internationalization**: `i18next` v24, `react-i18next` v15, and `i18next-browser-languagedetector` with local translation resource bundles (`locales/en.json`, `locales/km.json`).
- **Data Visualization**: `recharts` v3.10.1 (`AreaChart`, `BarChart`, `PieChart`, `ResponsiveContainer`).
- **PWA & Offline Storage**: `vite-plugin-pwa` v1.3 with Workbox service workers and `idb` v8.0.3 (IndexedDB client wrapper).
- **Export & Utility**: `jspdf` v4.2, `html2canvas` v1.4, `lucide-react`, `react-icons`.
- **Testing**: `vitest` v2.1, `@testing-library/react` v16, `@testing-library/jest-dom` v6, `jsdom` v25.

### 2.3 Data Tier & Infrastructure
- **Relational Database**: PostgreSQL 16 Alpine running in Docker on port `5433:5432`.
- **Database Management UI**: pgAdmin 4 running on port `5050:80`.
- **Local Media Volume**: Docker volume `media` mounted at `/var/lib/sunflower/media` (FastAPI `StaticFiles` mounted at `/media`).
- **Container Orchestration**: `docker-compose.yml` orchestrating `db`, `pgadmin`, `api`, and `web`.
