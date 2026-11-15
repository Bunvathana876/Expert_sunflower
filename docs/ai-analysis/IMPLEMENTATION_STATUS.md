# Implementation Status: Verified vs Planned Functionality

## 1. Feature Implementation Matrix

| Component / Feature | Implementation Status | Ground Truth Verification | Notes |
| :--- | :---: | :--- | :--- |
| **Pure Diagnosis Scoring Engine** | **100% COMPLETE** | `app/services/engine/scoring.py` | 100% unit tested, pure Python stdlib, deterministic. |
| **Entropy Information Gain Selector** | **100% COMPLETE** | `app/services/engine/next_question.py` | Simulates posterior Shannon entropy across candidates. |
| **Evidence Explanation Compiler** | **100% COMPLETE** | `app/services/engine/explain.py` | Categorizes into supporting, against, and missing key. |
| **FastAPI REST API Routes** | **100% COMPLETE** | `app/api/v1/routes/*` | 11 router modules registered, validated with Pydantic v2. |
| **SQLAlchemy 2.0 Async ORM Models**| **100% COMPLETE** | `app/models/*` | Full schema with cascade deletes, check constraints. |
| **Alembic Database Migrations** | **100% COMPLETE** | `alembic/versions/*` | 3 migrations executed up to tsvector full-text search. |
| **RBAC & Fail-Closed Access Control** | **100% COMPLETE** | `app/core/deps.py`, `models/auth.py` | 19 atomic permissions, 3 seeded roles, fail-closed. |
| **Argon2id Authentication & JWT** | **100% COMPLETE** | `app/core/security.py`, `services/auth.py` | Password hashing, dummy verification, refresh cookie rotation. |
| **Multilingual Translations Architecture**| **100% COMPLETE** | `app/models/translation.py` | Unified table with field-level fallback to English. |
| **Symptom Checker UI & Reducer** | **100% COMPLETE** | `features/diagnosis/pages/CheckerPage.tsx` | Anatomical categories, live debounced preview, drawer. |
| **Offline-First PWA & IndexedDB Queue**| **100% COMPLETE** | `lib/offlineQueue.ts`, `hooks/useOfflineSync.ts` | Stores pending sessions locally, auto-syncs when online. |
| **PDF Diagnostic Report & Web Share** | **100% COMPLETE** | `features/diagnosis/utils/exportPdf.ts` | High-res 2x canvas capture to A4 multi-page PDF. |
| **Side-by-Side Disease Comparison** | **100% COMPLETE** | `features/diseases/pages/DiseaseComparePage.tsx`| 2-3 column comparative breakdown with quick presets. |
| **Admin Epidemiological Recharts** | **100% COMPLETE** | `features/admin/components/AdminCharts.tsx` | AreaChart, Donut, BarChart, and KPI scorecards. |
| **Disease Knowledge Base CRUD Editor** | **100% COMPLETE** | `features/admin/pages/DiseaseEditorPage.tsx` | Real-time weight sliders, inline symptom creation, preview. |
| **Ollama Local AI Chatbot** | **100% COMPLETE** | `backend/ai/services/chatbot_service.py` | Async streaming/generation via HTTPX to Ollama daemon. |
| **Ollama Vision Plant Photo Analysis** | **100% COMPLETE** | `backend/ai/services/vision_service.py` | Base64 multimodal inference (`qwen2-vl` / `llama3.2-vision`).|
| **AI Symptom Extraction & Auto-Diagnosis**| **100% COMPLETE** | `app/api/v1/routes/ai.py` | Natural language text -> DB mapping -> expert engine. |
| **AI Admin Conversational Data Ops** | **100% COMPLETE** | `backend/ai/services/admin_chat_service.py` | Natural language intent parsing for DB CRUD operations. |

---

## 2. Incomplete, In-Progress, or Planned Capabilities

### 2.1 Planned / Inferred Enhancements (Not Yet Built)
1. **Remote Cloud Object Storage for Media (S3 / GCS)**:
   - *Current Status*: Media uploads are stored on local persistent disk (`/var/lib/sunflower/media`) mounted via FastAPI `StaticFiles`.
   - *Planned*: An S3/Cloud Storage driver is referenced in `docs/ARCHITECTURE.md` but is not yet implemented.
2. **Distributed Redis Cache for Token Revocation**:
   - *Current Status*: Revoked refresh tokens are kept in an in-memory `RefreshTokenStore` set.
   - *Planned*: Production Redis store for multi-worker container horizontal scaling.
3. **Headless Browser Automated E2E Test Suite**:
   - *Current Status*: Unit and API tests pass (55 backend + 37 frontend), but Playwright/Cypress end-to-end integration tests are not yet authored.
