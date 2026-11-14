# Feature Inventory & Implementation Deep Dive

## 1. Feature Map & Status Summary

| Feature Name | Primary Persona | Route(s) | Status | Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **Interactive Symptom Checker** | Grower, Agronomist | `/check` | Complete | Unit & Reducer Tests |
| **Real-time Live Candidate Preview** | Grower | `/check` (embedded) | Complete | AbortController Debounce |
| **Diagnostic Results & Evidence Breakdown**| Grower | `/check/:sessionId` | Complete | Tested |
| **PDF Diagnostic Report & Web Share** | Grower | `/check/:sessionId` | Complete | Tested |
| **Side-by-Side Disease Comparison** | Grower, Agronomist | `/diseases/compare` | Complete | Functional |
| **Offline-First PWA & IndexedDB Sync** | Grower (Field) | App-wide (`/check`) | Complete | Functional |
| **Botanical AI Chat & Vision Advisor** | Grower, Admin | Floating Widget (`AppLayout`) | Complete | API & Unit Tested |
| **Natural Language AI Admin Chat** | Agronomist, Admin | Floating Widget (Admin mode)| Complete | Intent Tested |
| **Bilingual Localization (EN / KM)** | All Users | App-wide | Complete | Full Coverage |
| **Disease Knowledge Base & Editor** | Agronomist, Admin | `/diseases`, `/admin/diseases/*` | Complete | API Tested |
| **Diagnostic Ruleset & Weight Tuning** | Agronomist, Admin | `/admin/rulesets`, `/admin/diseases/:id` | Complete | Tested |
| **Epidemiological Recharts Dashboard** | Agronomist, Admin | `/admin` | Complete | Tested |
| **Grower Feedback Queue** | Grower, Agronomist | `/feedback`, `/admin/feedback` | Complete | API Tested |
| **User & RBAC Matrix Management** | Admin | `/admin/users`, `/admin/roles` | Complete | API Tested |

---

## 2. In-Depth Feature Analysis

### 2.1 Interactive Symptom Checker & Live Preview
- **Purpose**: Allows a grower to diagnose plant disease by selecting observed symptoms categorized by plant anatomy (leaves, stems, flower heads, whole plant).
- **Files**:
  - `frontend/src/features/diagnosis/pages/CheckerPage.tsx`
  - `frontend/src/features/diagnosis/reducer.ts`
  - `frontend/src/features/diagnosis/components/CategorySelector.tsx`
  - `frontend/src/features/diagnosis/components/SymptomToggle.tsx`
  - `frontend/src/features/diagnosis/components/LiveCandidateList.tsx`
  - `backend/app/api/v1/routes/diagnosis.py`
  - `backend/app/services/engine/scoring.py`
  - `backend/app/services/engine/runner.py`
- **Internal Mechanics**:
  - `checkerReducer` manages a dictionary of answers: `Record<number, Answer>` where `Answer = "yes" | "no" | "unknown"`.
  - While the grower is toggling symptoms, a 400ms debounced `useEffect` triggers `POST /api/v1/diagnosis/preview` with an `AbortController`.
  - The backend executes the pure scoring algorithm without writing to the database, returning candidate probabilities that update `LiveCandidateList` in real-time.
  - Submitting triggers `POST /api/v1/diagnosis/sessions`, which persists the session, records selected symptom rows, writes candidate evidence, and redirects to `/check/:sessionId`.

### 2.2 Offline-First PWA & IndexedDB Queue
- **Purpose**: Enables uninterrupted diagnosis in remote agricultural fields without internet connectivity.
- **Files**:
  - `frontend/src/lib/offlineQueue.ts`
  - `frontend/src/hooks/useOfflineSync.ts`
  - `frontend/src/components/ui/OfflineBanner.tsx`
  - `frontend/vite.config.ts` (VitePWA Workbox precaching)
- **Internal Mechanics**:
  - When `navigator.onLine === false` (or if a network error occurs during submission), `enqueueOfflineDiagnosis` writes the diagnosis payload to IndexedDB (`sunflower-offline-db`, object store `pending_diagnoses`) with a client UUID.
  - `useOfflineSync` listens to browser `online` and `offline` events.
  - When connection is restored, `syncPendingData()` iterates through pending items, calls `submitDiagnosis()`, removes synced entries from IndexedDB, and invalidates React Query caches (`diagnosisHistory`, `diagnosisSession`).

### 2.3 Downloadable PDF Report & Web Share
- **Purpose**: Generates an authoritative, branded diagnostic scorecard that can be printed or shared via messaging apps (Telegram, WhatsApp, Email).
- **Files**:
  - `frontend/src/features/diagnosis/utils/exportPdf.ts`
  - `frontend/src/features/diagnosis/components/DiagnosticReportModal.tsx`
- **Internal Mechanics**:
  - Captures the rendered DOM element using `html2canvas` at 2x resolution (`scale: 2`) for crisp vector-like text rendering.
  - Slices long content into standard A4 pages (`210mm x 297mm`) using `jsPDF`.
  - Automatically triggers browser file download or invokes `navigator.share()` with file attachments via the Web Share API.

### 2.4 Side-by-Side Disease Comparison
- **Purpose**: Allows growers and agronomists to contrast 2 to 3 lookalike diseases side-by-side to distinguish ambiguous symptoms.
- **Files**:
  - `frontend/src/features/diseases/pages/DiseaseComparePage.tsx`
  - `frontend/src/features/diseases/hooks.ts`
- **Internal Mechanics**:
  - Provides quick-select comparison presets (e.g. Downy Mildew vs Powdery Mildew, Alternaria vs Septoria leaf spots, Sclerotinia vs Phomopsis stem rots).
  - Queries `useDiseaseDetail` concurrently for selected slugs and aligns pathogen classification, diagnostic differences, symptom overlaps, and fungicide chemical vs organic treatments in parallel comparison columns.

### 2.5 Botanical AI Chat & Vision Subsystem
- **Purpose**: Conversational crop advisor that answers farmer questions, extracts symptoms from natural language or uploaded photos, and executes expert diagnoses.
- **Files**:
  - `frontend/src/features/ai-assistant/components/AIChatWidget.tsx`
  - `backend/app/api/v1/routes/ai.py`
  - `backend/ai/services/chatbot_service.py`
  - `backend/ai/services/vision_service.py`
  - `backend/ai/services/symptom_extractor.py`
  - `backend/ai/services/ollama_service.py`
- **Internal Mechanics**:
  - **Draggable floating widget**: Uses pointer event tracking and clamps position within viewport, persisting coordinate state to `localStorage`.
  - **Vision Analysis**: Encodes uploaded field photographs to Base64, dispatches to Ollama's vision model (`qwen2-vl:7b` or `llama3.2-vision:11b`), and extracts visible plant parts and discoloration.
  - **Symptom Extraction & Mapping**: Normalizes free-form text or vision observations into structured entities, maps them against database `symptoms` records, and feeds them directly into `DiagnosisRunner`.
  - **Admin Chat**: When opened by an administrator or agronomist, switches to administrative intent parsing (`admin_chat_service.py`), permitting natural language database querying and CRUD operations.

### 2.6 Epidemiological Recharts Visual Analytics
- **Purpose**: Provides agronomists and administrators with high-level visual telemetry regarding disease occurrences, symptom frequencies, and unclassified patterns.
- **Files**:
  - `frontend/src/features/admin/pages/OverviewPage.tsx`
  - `frontend/src/features/admin/components/AdminCharts.tsx`
  - `backend/app/api/v1/routes/analytics.py`
  - `backend/app/services/analytics.py`
  - `backend/app/repositories/analytics.py`
- **Internal Mechanics**:
  - **Outbreak Trend Chart**: Recharts `AreaChart` with gradient fill tracking 30-day daily checks with 7d/14d/30d filter toggles.
  - **Symptom Distribution Chart**: Recharts `PieChart` (Donut) and `BarChart` illustrating the most frequently observed clinical indicators.
  - **Confidence Distribution Chart**: Clustered histogram showing diagnostic certainty tiers (High $\ge 70\%$, Moderate $40-69\%$, Low $1-39\%$, Inconclusive).
  - **Health Gauges**: Match rate scorecard, feedback resolution rate, and active knowledge base coverage gauges.
