# Project Directory Structure & Organization

```
Expert_sunflower-deploy/
├── Makefile                     # Root developer automation shortcuts (up, down, migrate, seed, test, lint)
├── docker-compose.yml           # Multi-container topology (db, pgadmin, api, web)
├── .env.example                 # Environment variable templates
├── cleanup.sh                   # Dev environment cleanup utility
│
├── backend/                     # FastAPI Backend Application
│   ├── pyproject.toml           # Python packaging, dependencies, ruff, mypy, pytest config
│   ├── Dockerfile               # Backend container image definition
│   ├── alembic.ini              # Database migration configuration
│   ├── alembic/                 # Alembic environment and version migration files
│   │   ├── env.py               # Async Alembic migration runner
│   │   └── versions/            # Schema migration history
│   │       ├── 0001_initial_skeleton.py
│   │       ├── 0002_data_model.py
│   │       └── 0003_disease_search_tsvector.py
│   ├── app/                     # Core backend source package
│   │   ├── main.py              # Application factory, CORS, exception handlers, static mount
│   │   ├── core/                # Infrastructure & cross-cutting components
│   │   │   ├── config.py        # Pydantic Settings configuration loader (.env)
│   │   │   ├── deps.py          # FastAPI dependencies (get_db, get_current_user, require_permission)
│   │   │   ├── errors.py        # RFC 7807 problem details exception hierarchy and handlers
│   │   │   ├── logging.py       # Structlog setup and X-Request-ID propagation
│   │   │   ├── rate_limit.py    # IP/User request rate limiting middleware
│   │   │   └── security.py      # Argon2id hashing, legacy password verify, JWT token lifecycle
│   │   ├── db/                  # Database connectivity
│   │   │   ├── base.py          # Declarative Base metadata
│   │   │   └── session.py       # Async SQLAlchemy session factory and connection pool
│   │   ├── models/              # SQLAlchemy 2.0 ORM Entity Definitions
│   │   │   ├── auth.py          # User, Role, Permission, RolePermission
│   │   │   ├── disease.py       # Disease, DiseaseSymptom (weights and constraints)
│   │   │   ├── symptom.py       # SymptomCategory, Symptom
│   │   │   ├── diagnosis.py     # DiagnosisSession, DiagnosisSelectedSymptom, DiagnosisResult
│   │   │   ├── translation.py   # Translation (composite PK entity-field-locale rows)
│   │   │   ├── ruleset.py       # Ruleset (scoring algorithm parameters & single-active index)
│   │   │   ├── feedback.py      # Feedback reports
│   │   │   ├── media.py         # Media uploads and metadata
│   │   │   ├── audit.py         # AuditLog immutable mutation trail
│   │   │   ├── mixins.py        # TimestampMixin (created_at, updated_at)
│   │   │   └── enums.py         # PathogenType, DiagnosisAnswer, DiagnosisOutcome, FeedbackStatus
│   │   ├── schemas/             # Pydantic v2 Request/Response DTOs
│   │   │   ├── auth.py          # AuthLogin, Register, TokenResponse, UserResponse
│   │   │   ├── content.py       # Disease, Symptom, Category schemas and bulk updates
│   │   │   ├── diagnosis.py     # DiagnosisRequest, DiagnosisResponse, SessionDetail
│   │   │   ├── admin.py         # User management, RolePermissions, RulesetResponse
│   │   │   ├── feedback.py      # FeedbackCreateRequest, FeedbackItem, StatusUpdate
│   │   │   └── analytics.py     # Overview metrics, OutbreakTrend, SymptomFrequency
│   │   ├── repositories/        # SQLAlchemy data access & query encapsulation
│   │   │   ├── disease.py       # Disease search, pagination, bulk symptoms replacement
│   │   │   ├── symptom.py       # Category grouping and symptom usage verification
│   │   │   ├── diagnosis.py     # Session persistence, history querying, active ruleset loading
│   │   │   ├── user.py          # User lookups, credentials, profile updates
│   │   │   ├── admin.py         # User/Role administration, permissions, rulesets
│   │   │   ├── feedback.py      # Feedback querying and status updating
│   │   │   ├── media.py         # Media records and storage keys
│   │   │   ├── analytics.py     # Aggregated diagnosis analytics and statistics
│   │   │   └── audit.py         # Audit trail insertion
│   │   ├── services/            # Business logic orchestration
│   │   │   ├── auth.py          # Registration, login, token refresh, password resets
│   │   │   ├── disease.py       # Disease lifecycle, search indexing, translation updates
│   │   │   ├── symptom.py       # Symptom CRUD with conflict guard
│   │   │   ├── feedback.py      # Feedback submission and triage
│   │   │   ├── analytics.py     # Metric computations
│   │   │   ├── admin.py         # Administrative operations
│   │   │   ├── engine/          # Clinical Expert Diagnosis Engine
│   │   │   │   ├── scoring.py   # PURE Bayesian weighted evidence accumulation
│   │   │   │   ├── next_question.py # Shannon entropy information-gain selector
│   │   │   │   ├── explain.py   # Supporting / against / missing evidence compiler
│   │   │   │   └── runner.py    # Database loading and result persistence coordinator
│   │   │   └── media/           # Media upload validation and filesystem storage
│   │   └── api/v1/routes/       # FastAPI REST endpoints
│   │       ├── public.py        # Public unauthenticated system statistics
│   │       ├── auth.py          # /auth/* (login, register, refresh, logout, me)
│   │       ├── users.py         # /users/me (profile and credentials)
│   │       ├── diseases.py      # /diseases/* (catalog, search, CRUD, bulk weights)
│   │       ├── symptoms.py      # /symptoms/* & /symptom-categories (grouped checklist)
│   │       ├── diagnosis.py     # /diagnosis/* (sessions, preview, history)
│   │       ├── feedback.py      # /feedback/* (grower reports, admin triage)
│   │       ├── media.py         # /media (image uploads)
│   │       ├── analytics.py     # /analytics/overview (dashboard telemetry)
│   │       ├── admin.py         # /admin/* (users, roles, permissions, rulesets)
│   │       └── ai.py            # /ai/* (chat, extract-symptoms, diagnose, analyze-image, admin-chat)
│   ├── ai/                      # Local AI module (Ollama integration)
│   │   ├── config.py            # AI configuration and model names
│   │   ├── schemas/             # Pydantic schemas for AI endpoints
│   │   ├── prompts/             # System prompt templates
│   │   └── services/            # AI services (ollama, chatbot, vision, symptom_extractor, admin_chat)
│   ├── scripts/                 # Data loading, seeding, and migration scripts
│   │   ├── seed.py              # Idempotent seed for roles, permissions, categories, admin
│   │   ├── seed_20_diseases_and_symptoms.sql # Master botanical dataset
│   │   ├── import_master_20_diseases.py      # SQL seed importer
│   │   ├── import_sample_diseases.py         # 5 core diseases importer
│   │   ├── optimize_symptoms.py              # Weight and discrimination power tuner
│   │   ├── cleanup_users.py                  # Test user account purger
│   │   └── reset_admin_password.py           # Admin credential recovery tool
│   └── tests/                   # Backend test suites (unit, api, integration)
│       ├── conftest.py          # Fixtures, test database, and mock clients
│       ├── unit/test_scoring.py # Pure engine tests (golden test cases)
│       ├── api/                 # Endpoint behavior and validation tests
│       └── integration/         # Migration and seed verification
│
├── frontend/                    # React 19 Frontend Application
│   ├── package.json             # NPM package dependencies and scripts
│   ├── tsconfig.json            # Strict TypeScript compiler options
│   ├── vite.config.ts           # Vite bundler, PWA plugin, test setup
│   ├── eslint.config.js         # ESLint 9 configuration
│   ├── Dockerfile               # Production / development container
│   ├── src/                     # Source code
│   │   ├── main.tsx             # Application entry point (mounting React tree)
│   │   ├── App.tsx              # Router provider & global auth provider wiring
│   │   ├── router.tsx           # React Router v7 route definitions and lazy loading
│   │   ├── test-setup.ts        # Vitest setup file
│   │   ├── api/                 # API client layer
│   │   │   ├── client.ts        # Fetch client, token interceptor, RFC 7807 error parsing
│   │   │   ├── ai.ts            # AI assistant API client
│   │   │   └── generated/       # OpenAPI generated type declarations
│   │   ├── components/          # Reusable shared UI components
│   │   │   ├── layout/          # AppLayout, BottomNav, ThemeBackground, AboutModal
│   │   │   └── ui/              # Badge, ConfidenceBar, EmptyState, Skeleton, ConfirmDialog, etc.
│   │   ├── features/            # Feature slices
│   │   │   ├── auth/            # Auth context, hooks, forms (Login, Register, Profile)
│   │   │   ├── landing/         # LandingPage with hero banner and stats
│   │   │   ├── diagnosis/       # CheckerPage, ResultPage, symptom toggles, PDF export
│   │   │   ├── diseases/        # DiseasesPage, DiseaseDetailPage, DiseaseComparePage
│   │   │   ├── history/         # HistoryPage (grower past sessions)
│   │   │   ├── feedback/        # FeedbackPage (grower report form)
│   │   │   ├── admin/           # Admin pages (Overview, Diseases, Symptoms, Users, Roles, Rulesets)
│   │   │   └── ai-assistant/    # AIChatWidget (draggable botanical AI advisor)
│   │   ├── hooks/               # useOfflineSync and common utility hooks
│   │   ├── i18n/                # i18next configuration
│   │   ├── lib/                 # idb offline queue and utility functions
│   │   ├── locales/             # en.json and km.json translation dictionaries
│   │   ├── styles/              # index.css (Tailwind 4 & custom CSS variables)
│   │   └── assets/              # Botanical disease photos and theme backgrounds
│   └── dist/                    # Production build output
│
└── docs/                        # Project architectural and operational documentation
    ├── ARCHITECTURE.md          # Original architecture specification
    ├── DECISIONS.md             # Decision log (ADR format)
    ├── MIGRATION.md             # Migration guide from legacy system
    ├── PROMPTS.md               # Prompt engineering reference
    └── ai-analysis/             # Comprehensive AI codebase analysis knowledge base
```
