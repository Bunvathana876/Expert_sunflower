# AI Project Context & Safe Development Guidelines

This document provides a concise, high-density architectural cheat sheet for future AI agents and developers modifying or extending the `Expert_sunflower-deploy` codebase.

---

## 1. Architectural Invariants & Non-Negotiable Rules

1. **Rule 1: Pure Engine Isolation**
   - File: `backend/app/services/engine/scoring.py`
   - **MUST NEVER IMPORT** `app.db`, `app.models`, `fastapi`, or any async/network code.
   - It is standard-library only. All inputs are frozen dataclasses; all outputs are frozen dataclasses.
2. **Rule 2: AI Assists, The Expert System Decides**
   - The Ollama AI model **MUST NEVER DIRECTLY INVENT A DIAGNOSIS SCORE**.
   - Natural language and vision input must be extracted into symptoms, mapped to database `symptom_id` values, and passed into `DiagnosisRunner`. The rule-based engine is the sole source of truth for diagnoses.
3. **Rule 3: One Database, One Translations Table**
   - Never add language-specific columns (e.g., `name_km`, `description_km`) to content tables.
   - All multilingual localized text belongs in `translations(entity_type, entity_id, locale, field, value)` with field-level fallback to English (`en`).
4. **Rule 4: Standard RFC 7807 Problem Details**
   - All backend errors must raise subclasses of `AppError` in `app/core/errors.py`.
   - Never return bare `{ "error": "msg" }`. Use `{ "type", "title", "status", "detail", "errors" }`.
5. **Rule 5: Fail-Closed Authorization**
   - Permission checks via `require_permission(code)` in `app/core/deps.py` must fail closed. If an unexpected error or database glitch occurs during check evaluation, raise HTTP 403 Forbidden.
6. **Rule 6: Tri-State Symptom Answers**
   - The system distinguishes `yes`, `no`, and `unknown`.
   - A `"no"` actively penalizes candidate diseases that feature that symptom ($\lambda_{\text{absent}}$). It is not treated as an unselected blank.

---

## 2. Directory Navigation Quick Reference

| When you need to modify... | Look in this directory / file |
| :--- | :--- |
| Diagnosis scoring algorithm | `backend/app/services/engine/scoring.py` |
| Symptom questions & Shannon entropy | `backend/app/services/engine/next_question.py` |
| Database transaction & session persistence| `backend/app/services/engine/runner.py` |
| API routes & query parameters | `backend/app/api/v1/routes/` |
| ORM models & database schema | `backend/app/models/` |
| Database migrations | `backend/alembic/versions/` |
| Local Ollama prompts & services | `backend/ai/` |
| Database seed data & botanical knowledge | `backend/scripts/seed_20_diseases_and_symptoms.sql` |
| Frontend routing & page navigation | `frontend/src/router.tsx` |
| Symptom checker UI & state management | `frontend/src/features/diagnosis/` |
| Offline PWA storage & sync queue | `frontend/src/lib/offlineQueue.ts` & `hooks/useOfflineSync.ts` |
| PDF export & Web Share API | `frontend/src/features/diagnosis/utils/exportPdf.ts` |
| Admin visual charts & dashboard | `frontend/src/features/admin/components/AdminCharts.tsx` |
| English & Khmer UI text | `frontend/src/locales/en.json` & `km.json` |

---

## 3. Safe Workflow for Implementing Changes

1. **Before modifying backend API endpoints**:
   - Update or add Pydantic schemas in `app/schemas/`.
   - Keep route controllers thin: delegate business logic to `app/services/` and database queries to `app/repositories/`.
   - Run backend tests: `cd backend && pytest`.
2. **After adding or updating API endpoints**:
   - Run `cd frontend && npm run gen:api` to sync TypeScript schemas from OpenAPI.
3. **Before touching frontend components**:
   - Ensure components use standard `useTranslation()` keys rather than raw hardcoded strings.
   - Maintain dark/light mode compatibility using Tailwind classes and CSS variables.
   - Run frontend tests: `cd frontend && npm run test -- --run`.
   - Run typecheck: `cd frontend && npm run typecheck`.
