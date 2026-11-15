# Supabase Staging Migration Execution Report

**Status:** **SUCCESS** — Migration executed, validated, and verified on 2026-11-10.
The migration from local PostgreSQL 16 (`expert_sunflower-deploy-db-1`) to Supabase PostgreSQL 17 staging (`expert-sunflower-staging` / `ngnnyujzeuepxxkwtnpl`) has been completed with 100% data integrity, active foreign key constraints, zero data loss, and all security guardrails enforced.

---

## 1. Verified Source and Destination

| Item | Verified Value |
| --- | --- |
| **Migration Status** | **SUCCESS** |
| **Execution Date** | 2026-11-10 |
| **Source Database** | `sunflower_db` in `expert_sunflower-deploy-db-1` |
| **Source Engine** | PostgreSQL 16.15 (Alpine Linux, port 5434) |
| **Source Alembic Revision** | `0004` |
| **Source Database State** | **Untouched & Preserved** (all 696 records intact) |
| **Destination Project** | `expert-sunflower-staging` |
| **Destination Project ID** | `ngnnyujzeuepxxkwtnpl` |
| **Destination Region** | `ap-southeast-2` (Sydney) |
| **Destination Engine** | PostgreSQL 17.11 on x86_64-pc-linux-gnu |
| **Destination Session Pooler** | `aws-0-ap-southeast-2.pooler.supabase.com:5432` |
| **Destination Database / Schema** | `postgres` / `public` |
| **Applied Alembic Revision** | `0004` |
| **Pooler User** | `postgres.ngnnyujzeuepxxkwtnpl` |
| **Authentication & TLS** | Password-backed from `0600` `.pgpass` file; TLSv1.3 `verify-full` via Supabase Root 2021 CA (`prod-ca-2021.crt`) |
| **Data API Status** | **Disabled** (confirmed via gateway 401 & direct database ACL verification) |

---

## 2. Table Row Counts: Source vs Destination

All core domain, RBAC, diagnostic, and user records were preserved without resetting passwords. Historical operational records (`refresh_tokens` and `rate_limit_events`) were intentionally excluded as specified.

| Table Name | Source Count | Destination Count | Status | Notes |
| --- | ---: | ---: | :---: | --- |
| `alembic_version` | 1 | 1 | **MATCH** | Revision `0004` applied by Alembic |
| `audit_log` | 0 | 0 | **MATCH** | Preserved clean state |
| `diagnosis_results` | 20 | 20 | **MATCH** | Full-row fingerprint verified |
| `diagnosis_selected_symptoms` | 54 | 54 | **MATCH** | Full-row fingerprint verified |
| `diagnosis_sessions` | 10 | 10 | **MATCH** | Full-row fingerprint verified |
| `disease_symptoms` | 80 | 80 | **MATCH** | Full-row fingerprint verified |
| `diseases` | 20 | 20 | **MATCH** | Full-row fingerprint verified; FTS trigger verified |
| `feedback` | 0 | 0 | **MATCH** | Preserved clean state |
| `media` | 0 | 0 | **MATCH** | Preserved clean state |
| `pending_ai_actions` | 0 | 0 | **MATCH** | Preserved clean state |
| `permissions` | 19 | 19 | **MATCH** | Full-row fingerprint verified |
| `rate_limit_events` | 4 | **0** | **EXCLUDED** | Historical operational cache omitted |
| `refresh_tokens` | 61 | **0** | **EXCLUDED** | Historical sessions omitted; forced clean re-login |
| `role_permissions` | 40 | 40 | **MATCH** | Full-row fingerprint verified |
| `roles` | 3 | 3 | **MATCH** | Full-row fingerprint verified |
| `rulesets` | 1 | 1 | **MATCH** | Full-row fingerprint verified |
| `symptom_categories` | 8 | 8 | **MATCH** | Full-row fingerprint verified |
| `symptoms` | 62 | 62 | **MATCH** | Full-row fingerprint verified |
| `translations` | 300 | 300 | **MATCH** | 150 English + 150 Khmer; all polymorphic entity IDs valid |
| `users` | 13 | 13 | **MATCH** | 13/13 exact Argon2id password hashes matched; no passwords reset |
| **Total Rows** | **696** | **631** | **SUCCESS** | Exactly 631 rows (617 core + 13 users + 1 alembic) |

---

## 3. Data Integrity & Verification Results

1. **Full-Row Table Fingerprints (MD5 Checksums):**
   Every non-empty table in destination was compared against live source using ordered full-row MD5 aggregation (`SELECT md5(string_agg(md5(t::text), '' ORDER BY t::text)) FROM <table> t;`):
   - `alembic_version`: `30ffb7557f3294e6834f976a436ce1b8` (**MATCH**)
   - `roles`: `eae51dccffb05cc0507171f900e458e5` (**MATCH**)
   - `permissions`: `8e6de2e25214ef55309849f21916c049` (**MATCH**)
   - `role_permissions`: `7b8c0ee9fd878f0a78362285f610fcab` (**MATCH**)
   - `users`: `24f0e05af579435ec1bf1c99c45cdcab` (**MATCH**)
   - `symptom_categories`: `9598418b33504e6963108ea995fb869a` (**MATCH**)
   - `diseases`: `5081da7649e1e731dc6aa0cdec023bfa` (**MATCH**)
   - `symptoms`: `4b0f471b7372af7131c77a25eae982a7` (**MATCH**)
   - `disease_symptoms`: `3b493deeb6bf0055fd80117a23b61da0` (**MATCH**)
   - `translations`: `79a02a019c5a109dbccf793c3fdcca55` (**MATCH**)
   - `rulesets`: `b6a0f7e6513fb68c9ed7a8b423fe0cb1` (**MATCH**)
   - `diagnosis_sessions`: `4374f28ab199873dd2888dc2d6bc7528` (**MATCH**)
   - `diagnosis_selected_symptoms`: `50d089243c2f5a4ae57fb221ddbf229c` (**MATCH**)
   - `diagnosis_results`: `af3456f3f27cdeefc752bb39bbcd8e4e` (**MATCH**)

2. **Foreign Key Integrity:**
   - 26 foreign key constraints verified across all destination tables.
   - Dynamic PL/pgSQL validation confirmed **0 constraint violations** and **0 dangling references**.

3. **Polymorphic Translations:**
   - Total translations: **300**
   - English (`en`): **150**
   - Khmer (`km`): **150**
   - Entity breakdowns: 160 disease translations, 124 symptom translations, 16 category translations.
   - Orphan check: **0** orphan disease translations, **0** orphan symptom translations, **0** orphan category translations.

4. **User Passwords & RBAC:**
   - All 13 user accounts verified with their exact original Argon2id password hashes.
   - No administrator or user passwords were reset or modified.

5. **Full-Text Search Trigger:**
   - Migration `0003`'s trigger `trg_translations_search_vector` on `translations` executed and populated `diseases.search_vector`.
   - Verified 20 out of 20 diseases possess populated GIN-indexed tsvectors.

6. **Database Sequence Synchronization:**
   The 11 persistent table sequences were restored to match source values to prevent primary key collision:
   - `audit_log_id_seq`: `last_value = 1`, `is_called = false`
   - `diagnosis_results_id_seq`: `last_value = 20`, `is_called = true`
   - `diseases_id_seq`: `last_value = 109`, `is_called = true`
   - `feedback_id_seq`: `last_value = 1`, `is_called = false`
   - `media_id_seq`: `last_value = 1`, `is_called = false`
   - `permissions_id_seq`: `last_value = 19`, `is_called = true`
   - `roles_id_seq`: `last_value = 3`, `is_called = true`
   - `rulesets_id_seq`: `last_value = 1`, `is_called = true`
   - `symptom_categories_id_seq`: `last_value = 8`, `is_called = true`
   - `symptoms_id_seq`: `last_value = 372`, `is_called = true`
   - `users_id_seq`: `last_value = 13`, `is_called = true`
   The 2 operational sequences (`rate_limit_events_id_seq`, `refresh_tokens_id_seq`) were cleanly initialized at `1, false`.

---

## 4. Security Validation

1. **Pre-Schema Privilege Hardening (Phase A):**
   - Applied [`scripts/supabase_staging_pre_schema.sql`](../scripts/supabase_staging_pre_schema.sql).
   - Revoked default privileges on tables, sequences, and functions created by `postgres` from `anon`, `authenticated`, and `service_role`.
   - Revoked execution permissions on `public.rls_auto_enable()` from `PUBLIC`, `anon`, `authenticated`, and `service_role`.

2. **Post-Schema Hardening & Row Level Security (Phase C):**
   - Applied [`scripts/supabase_staging_post_schema.sql`](../scripts/supabase_staging_post_schema.sql).
   - Explicitly enabled Row Level Security (RLS) on all 20 public tables (`relrowsecurity = true`).
   - Revoked all existing permissions on all public tables, sequences, and functions from `anon`, `authenticated`, and `service_role`.
   - Verified table grants: `tables_accessible_to_anon = 0`, `tables_accessible_to_auth = 0`.
   - Tested direct role switching: queries under `ROLE anon` and `ROLE authenticated` fail immediately with `ERROR: permission denied for table users`.

3. **Backend Application Access:**
   - Tested SQLAlchemy ORM queries using the backend pooler connection (`postgres.ngnnyujzeuepxxkwtnpl`).
   - Backend successfully executed queries across `Disease`, `Symptom`, `Translation`, and `User` models without encountering RLS blocks or permission errors.

4. **TLS / Network Security:**
   - Verified TLSv1.3 connection using `sslmode=verify-full` and `sslrootcert=/Users/bunvathana/Downloads/prod-ca-2021.crt`.
   - Pooler certificate verified against `*.pooler.supabase.com`.
   - Protected libpq `.pgpass` file kept at mode `0600` outside git tracking.

---

## 5. Source Database Preservation

- Source container: `expert_sunflower-deploy-db-1` (port 5434).
- Database: `sunflower_db`.
- Post-migration count verification: 20 diseases, 62 symptoms, 8 symptom categories, 80 disease-symptoms, 300 translations, 3 roles, 19 permissions, 40 role-permissions, 1 ruleset, 10 diagnosis sessions, 54 selected symptoms, 20 diagnosis results, 13 users, 61 refresh tokens, 4 rate-limit events.
- **Verification outcome:** Source database was completely untouched and preserved.

---

## 6. Execution Log Summary

1. **Preflight Verification:**
   - Target project ID verified: `ngnnyujzeuepxxkwtnpl`.
   - Both backup archives (`sunflower_db_pre_supabase_migration_20261110_060329.dump` and `.enc`) passed SHA-256 and HMAC-SHA256 checksums and verified via `scripts/verify_backup.sh`.
   - Public schema verified empty (0 tables, 0 enums).

2. **Phase A (Pre-Schema Security):**
   ```sh
   psql -w -X -v ON_ERROR_STOP=1 -f scripts/supabase_staging_pre_schema.sql
   ```
   *Committed: default privileges revoked from API roles; rls_auto_enable secured.*

3. **Phase B (Alembic Schema Upgrade):**
   ```sh
   cd backend && ALEMBIC_DATABASE_URL="postgresql+psycopg://postgres.ngnnyujzeuepxxkwtnpl@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=verify-full&sslrootcert=/Users/bunvathana/Downloads/prod-ca-2021.crt" alembic upgrade head
   ```
   *Upgraded: 0001 -> 0002 -> 0003 -> 0004. Created 20 tables, 4 enums, 66 indexes, 26 foreign keys, 1 trigger.*

4. **Phase C (Post-Schema Security):**
   ```sh
   psql -w -X -v ON_ERROR_STOP=1 -f scripts/supabase_staging_post_schema.sql
   ```
   *Committed: RLS enabled on 20/20 tables; all public object grants revoked from anon, authenticated, service_role.*

5. **Phase D (Data Import & Sequence Synchronization):**
   Generated dependency-ordered data import SQL from verified dump (`roles` -> `permissions` -> `role_permissions` -> `users` -> `symptom_categories` -> `media` -> `diseases` -> `symptoms` -> `disease_symptoms` -> `translations` -> `rulesets` -> `diagnosis_sessions` -> `diagnosis_selected_symptoms` -> `diagnosis_results` -> empty operational tables) with session `search_path = public` and 11 sequence setvals.
   ```sh
   psql -w -X -v ON_ERROR_STOP=1 -f scratch/staging_data_import.sql
   ```
   *Committed: 17 COPY operations succeeded with zero errors; sequences synchronized.*

---

## 7. Required Next Steps for Staging Deployment (Render)

1. **FastAPI Staging Environment Configuration:**
   Configure the Render web service environment variables:
   - `DATABASE_URL`: Session pooler connection string pointing to Supabase staging:
     `postgresql+psycopg://postgres.ngnnyujzeuepxxkwtnpl:<ROTATED_PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=verify-full&sslrootcert=/etc/secrets/prod-ca-2021.crt`
   - `ALEMBIC_DATABASE_URL`: Same connection string format.
   - Upload `prod-ca-2021.crt` as a Render Secret File mounted at `/etc/secrets/prod-ca-2021.crt`.

2. **Backend Readiness Check:**
   - Deploy backend to Render staging environment.
   - Perform health check `/api/v1/health` and verify database ping.
   - Verify grower, agronomist, and admin authentication using existing passwords.

3. **Frontend Staging Integration:**
   - Configure frontend build on Vercel / Render pointing to the staging FastAPI backend API.
