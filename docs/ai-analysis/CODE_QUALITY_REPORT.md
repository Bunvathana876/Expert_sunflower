# Code Quality & Architectural Risk Assessment

This report provides an objective, evidence-based audit of code quality, architecture consistency, security posture, and technical debt across the `Expert_sunflower-deploy` codebase.

---

## 1. Audit Summary Matrix

| Category | Status | Critical | High | Medium | Low |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Architecture & Layering** | Exceptional (Clear boundary, pure scoring engine) | 0 | 0 | 0 | 1 |
| **Type Safety & Contracts** | Strong (Strict TS 5.6 + Mypy on `app`) | 0 | 0 | 1 | 2 |
| **Security & Authentication**| Strong (Argon2id, HttpOnly, fail-closed RBAC) | 0 | 1 | 1 | 1 |
| **Test Coverage** | Solid (55 Backend + 37 Frontend passing) | 0 | 0 | 2 | 1 |
| **AI Subsystem Code Quality**| Partial Technical Debt (Ruff lint warnings, long lines)| 0 | 1 | 3 | 2 |
| **Performance & Scalability**| Good (Async SQLAlchemy, debounced live preview) | 0 | 0 | 2 | 2 |
| **Accessibility (a11y) & UX** | High Quality (ARIA tags, skeletons, fallbacks) | 0 | 0 | 1 | 2 |
| **TOTALS** | | **0** | **2** | **10** | **11** |

---

## 2. Identified Findings & Risk Classifications

### [HIGH] Security & State Management
#### 1. In-Memory Revocation Store for Refresh Tokens
- **File**: `backend/app/core/security.py` (lines 95–115)
- **Finding**: Revoked refresh tokens are stored in an in-memory set (`RefreshTokenStore._revoked: set[str]`).
- **Impact**: In a multi-worker ASGI setup (`uvicorn --workers 4`) or multi-instance container deployment, token revocation is not shared between processes. A revoked token could theoretically be accepted by another worker until expired.
- **Classification**: **High**
- **Recommendation**: Replace `RefreshTokenStore` with a Redis backend or a lightweight database table with expiration indexing (`revoked_tokens(jti, expires_at)`).

#### 2. AI Admin Chat Executes State Changes via Natural Language Without Separate 2FA / Re-authentication
- **File**: `backend/ai/services/admin_chat_service.py`
- **Finding**: Admin AI chat executes database deletions and creations based on conversational natural language intent without requiring re-entering credentials or confirming via an interactive dialog modal.
- **Impact**: Prompt injection or unexpected intent misclassification could inadvertently delete or mutate disease records.
- **Classification**: **High**
- **Recommendation**: Require a two-phase confirmation protocol (e.g., AI returns an action draft token; user must click an explicit confirmation button in the UI).

---

### [MEDIUM] Code Quality & Technical Debt
#### 3. Ruff Lint Violations in AI Subsystem & Scripts
- **Files**:
  - `backend/ai/config.py:41` (RUF012 mutable class attribute default)
  - `backend/ai/services/admin_chat_service.py` (Multiple E501 line length > 100 characters)
  - `backend/scripts/seed.py` (E501 line length > 100 characters)
- **Finding**: 77 Ruff warnings detected primarily within `backend/ai/` and `scripts/`.
- **Impact**: Reduced maintainability in AI modules compared to the clean `app/` core.
- **Classification**: **Medium**
- **Recommendation**: Run `ruff check --fix` and reformat long string templates in `admin_chat_service.py`.

#### 4. Hardcoded Fallback Values in Component Logic
- **File**: `frontend/src/features/diagnosis/pages/ResultPage.tsx` (lines 89–90)
- **Finding**: `totalAnalyzedDiseases = 26` and fallback `evaluatedSymptomsCount = 8` are hardcoded in the scorecard calculations rather than dynamically reading `stats.total_diseases`.
- **Impact**: If an agronomist adds 5 new diseases, the result page may show "Compared against 26 diseases" instead of the live database count.
- **Classification**: **Medium**
- **Recommendation**: Bind this metric to the live `/api/v1/public/stats` API query.

#### 5. Missing Automated E2E Cypress/Playwright Tests
- **Finding**: Unit and API integration tests exist for frontend and backend, but there is no automated headless browser end-to-end (E2E) suite testing the complete flow from landing -> checker -> PDF export.
- **Impact**: Regressions in browser-specific APIs (Canvas rendering, Web Share API, Service Worker lifecycle) could escape unnoticed.
- **Classification**: **Medium**
- **Recommendation**: Introduce a Playwright test suite for critical grower flows.

---

### [LOW] Polish & Optimizations
#### 6. Canvas Context Warning in Headless JSDOM
- **File**: `frontend/src/components/ui/__tests__/ShaderBackground.test.tsx`
- **Finding**: Test logs output `Error: Not implemented: HTMLCanvasElement.prototype.getContext (without installing the canvas npm package)`.
- **Impact**: Tests pass, but mock canvas context should be cleanly installed in `test-setup.ts`.
- **Classification**: **Low**

#### 7. CSS Asset Warnings for Heavy Background Images
- **Files**: `frontend/src/assets/images/*.jpeg`
- **Finding**: Several background images are 1MB–3MB in size.
- **Impact**: Slightly longer initial page asset loading on low-bandwidth rural connections.
- **Classification**: **Low**
- **Recommendation**: Compress images to WebP/AVIF format with resolution responsive `srcset`.
