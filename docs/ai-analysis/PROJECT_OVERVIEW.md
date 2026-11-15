# Project Overview: Sunflower Expert System 🌻

## 1. Executive Summary

The **Sunflower Expert System** (`Expert_sunflower-deploy`) is a production-grade, bilingual (English and Khmer - ភាសាខ្មែរ) agronomic expert platform and decision support tool for sunflower (*Helianthus annuus*) disease diagnosis and crop health management.

It was re-architected from a legacy Flask monolith into a modern decoupled architecture:
1. **Frontend**: A client-side Single Page Application (SPA) built with React 19, TypeScript (strict mode), Vite 6, Tailwind CSS 4, and TanStack Query v5. It is configured as an offline-first Progressive Web App (PWA) with client-side IndexedDB caching and synchronization.
2. **Backend**: An asynchronous RESTful API built with FastAPI (Python 3.12), SQLAlchemy 2.0 (asyncio), and Pydantic v2.
3. **Database**: PostgreSQL 16 Alpine managing normalized relational data, full-text search vectors (`tsvector`), versioned rule engines, and unified multilingual content translations.
4. **AI Layer**: An integrated local LLM/VLM subsystem powered by Ollama (defaulting to `qwen2.5:7b` / `llama3.2:3b` for natural language and `qwen2-vl:7b` / `llama3.2-vision:11b` for plant pathology image analysis).

---

## 2. Problem Statement & Target Audience

### 2.1 The Problem
Sunflowers are susceptible to numerous debilitating fungal, bacterial, viral, and abiotic diseases (e.g., Downy Mildew, Sclerotinia White Mold, Phomopsis Stem Canker, Charcoal Rot, Rust, Alternaria Blight). Many of these exhibit overlapping initial foliar or stem symptoms. Misdiagnosis leads to ineffective chemical fungicide applications, crop yield loss, and unnecessary financial waste. Moreover, smallholder farmers and field extension workers in rural areas frequently face unreliable internet connectivity, language barriers, and lack of immediate access to plant pathologists.

### 2.2 Intended User Roles
The system specifies a strict Role-Based Access Control (RBAC) matrix for three primary personas:

| Role Code | User Persona | Primary Objectives | Key Capabilities |
| :--- | :--- | :--- | :--- |
| `grower` | Farmers, Sunflower Producers, Field Officers | Diagnose crop issues in the field, learn disease management, retain diagnosis logs | • Multi-step anatomical symptom checker (`/check`)<br>• Real-time live probability preview<br>• Offline evaluation and IndexedDB auto-sync<br>• Branded A4 PDF scorecard generation & Web Share<br>• Conversational AI Assistant with photo inspection<br>• Historical diagnosis log viewing |
| `agronomist` | Agricultural Extension Agents, Plant Pathologists, Researchers | Curate botanical knowledge, calibrate diagnostic weight rules, monitor field health | • Full catalog authoring (diseases, symptoms, translations)<br>• Bayesian weight, required indicator, and pathognomonic trigger calibration<br>• Visual disease comparison tool (`/diseases/compare`)<br>• Direct grower feedback queue resolution<br>• Natural language database operations via AI Admin Chat |
| `admin` | IT Systems Administrators, Operations Leads | Security, role permission enforcement, database telemetry | • User account management & deactivation (`/admin/users`)<br>• Fine-grained permission assignment matrix (`/admin/roles`)<br>• Diagnostic ruleset hyperparameter versioning & activation (`/admin/rulesets`)<br>• Recharts analytical dashboards & metrics monitoring |

---

## 3. Core Capabilities & Value Proposition

1. **Deterministic, Testable Diagnosis Engine**:
   - Rather than relying on black-box, hallucination-prone LLM diagnoses, medical/botanical diagnoses are executed strictly by a pure, deterministic Bayesian evidence-accumulation algorithm (`app/services/engine/scoring.py`).
   - Supports tri-state symptom assertions (`yes`, `no`, `unknown`), negative evidence penalty weights ($\lambda_{\text{absent}}$), mandatory symptom constraints, and pathognomonic trump thresholds.
2. **Shannon Entropy Information Gain**:
   - Calculates the `next_best_questions` dynamically based on Shannon entropy reduction across candidate diseases, guiding users to a conclusive diagnosis in 3–5 targeted questions.
3. **True Offline-First Architecture**:
   - Built with `vite-plugin-pwa`, service workers, and `idb` (IndexedDB). If a farmer in a remote field loses 4G connectivity, diagnosis questionnaires are queued locally with cryptographic UUIDs and automatically synchronized when connectivity returns.
4. **Bilingual Localization (English & Khmer)**:
   - Complete localized agronomic terminology across the entire user interface and botanical knowledge base without schema duplication (`translations` entity-attribute-value-locale design).
5. **Conversational AI with Multimodal Vision**:
   - Local Ollama-powered botanical chat assistant that accepts natural language queries and field photos, extracts visible anatomical symptoms, maps them to database symptom records, feeds them into the expert system, and generates empathetic guidance.
6. **Agronomist Decision Support & Tooling**:
   - Live side-by-side disease comparator tool, interactive Recharts epidemiological dashboards (outbreak trends, symptom distributions, confidence clusters), and inline disease ruleset simulators.

---

## 4. Current Implementation Status Overview

- **Core Expert Engine**: 100% Fully Implemented, pure Python, zero DB dependencies, 100% unit test pass rate.
- **REST API & Persistence**: 100% Implemented (FastAPI 0.115, SQLAlchemy 2.0 Async, Alembic migrations, PostgreSQL 16).
- **Authentication & RBAC**: 100% Implemented (Argon2id hashing, JWT access tokens, HttpOnly refresh cookies with auto-rotation, fail-closed permission checks).
- **Frontend SPA**: 100% Implemented (React 19, TypeScript strict mode, Tailwind CSS 4, Vite 6, TanStack Query v5).
- **Offline PWA & Sync**: 100% Implemented (Service Worker cache, IndexedDB queue, online/offline browser listeners).
- **PDF & Sharing**: 100% Implemented (`html2canvas` + `jspdf` high-res canvas rendering, Web Share API).
- **AI Integration**: Implemented and operational via local Ollama client (gracefully degrades with 503/fallback when Ollama server is offline).
