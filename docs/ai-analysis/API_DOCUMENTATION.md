# Verified REST API Specification (v1)

Base URL: `/api/v1`
Protocol: HTTP/1.1 / JSON (RFC 7807 for errors)
Authentication: Bearer JWT in `Authorization` header + HttpOnly Cookie `refresh_token`

---

## 1. Public & Operational Endpoints

### `GET /health`
- **Prefix**: Root (`/health`)
- **Auth**: None (Public)
- **Response**: `200 OK`
  ```json
  { "status": "ok", "version": "0.1.0", "db": "up" }
  ```

### `GET /api/v1/public/stats`
- **Auth**: None (Public)
- **Response**: `200 OK`
  ```json
  {
    "total_diseases": 26,
    "total_symptoms": 62,
    "published_diseases": 20
  }
  ```

---

## 2. Authentication & Profile Endpoints (`/auth`, `/users`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | None (Public) | Registers a new grower user account. Sets HttpOnly refresh cookie. |
| `POST` | `/auth/login` | None (Public) | Authenticates credentials with Argon2id. Returns `access_token` and user profile. |
| `POST` | `/auth/refresh` | Valid refresh cookie | Rotates refresh token family and returns new access token. |
| `POST` | `/auth/logout` | Authenticated | Revokes current refresh token and clears cookie. |
| `GET` | `/auth/me` | Authenticated | Returns current authenticated user, role, and permission code strings. |
| `PATCH`| `/users/me` | Authenticated | Updates current user's username, email, or password (requires current password). |

---

## 3. Diagnosis Engine Endpoints (`/diagnosis`)

### `POST /diagnosis/sessions`
- **Permission**: `diagnosis:run`
- **Body**:
  ```json
  {
    "answers": { "1": "yes", "2": "no", "5": "unknown" },
    "locale": "en"
  }
  ```
- **Response**: `200 OK` (`DiagnosisResponse`)
  ```json
  {
    "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "ruleset_version": "2026.09.1",
    "outcome": "matched",
    "results": [
      {
        "rank": 1,
        "disease": { "id": 1, "slug": "downy-mildew", "name": "Downy Mildew" },
        "score": 0.88,
        "confidence": 0.72,
        "evidence": {
          "supporting": [{ "symptom_id": 1, "weight": 0.7, "symptom_code": "yellow_spots" }],
          "against": [],
          "missing_key": []
        }
      }
    ],
    "next_best_questions": [
      { "symptom_id": 14, "symptom_code": "white_cottony_growth", "information_gain": 0.42 }
    ],
    "feedback_prompt": null
  }
  ```

### `POST /diagnosis/preview`
- **Permission**: `diagnosis:run`
- **Description**: Stateless evaluation. Same body and response shape as `/sessions`, but does not write to `diagnosis_sessions` or result tables. Used for real-time live preview.

### `GET /diagnosis/sessions`
- **Permission**: `diagnosis:read_own`
- **Query Params**: `page` (int, default 1), `size` (int, default 20)
- **Response**: `200 OK` (Paginated list of current user's past diagnoses).

### `GET /diagnosis/sessions/{id}`
- **Permission**: Owner of session OR `diagnosis:read_all`
- **Response**: `200 OK` (Full session details with selected symptoms and evidence breakdown).

---

## 4. Botanical Knowledge Base Endpoints (`/diseases`, `/symptoms`)

### `GET /diseases`
- **Auth**: Optional / Public
- **Query Params**: `q` (search text), `category`, `pathogen` (fungal, bacterial, viral, abiotic, other), `published` (bool), `page`, `size`, `locale` (`en` or `km`).
- **Response**: `200 OK` (Paginated list with localized names and descriptions).

### `GET /diseases/{slug}`
- **Auth**: Optional / Public
- **Response**: `200 OK` (Complete disease details, cause, treatment, prevention, image, and grouped symptom weights).

### `POST /diseases`
- **Permission**: `disease:create`
- **Status**: `201 Created`

### `PATCH /diseases/{id}`
- **Permission**: `disease:update`
- **Description**: Updates pathogen type, media image ID, or publication status.

### `DELETE /diseases/{id}`
- **Permission**: `disease:delete`
- **Status**: `204 No Content` (Permanent deletion with cascade to disease_symptoms).

### `PUT /diseases/{id}/symptoms`
- **Permission**: `disease:update`
- **Description**: Atomically replaces the complete symptom weight ruleset for a disease in a single transaction. Validates symptom IDs.
- **Body**:
  ```json
  {
    "symptoms": [
      {
        "symptom_id": 12,
        "weight": 0.85,
        "is_required": true,
        "is_pathognomonic": false
      }
    ]
  }
  ```

### `PUT /diseases/{id}/translations/{locale}`
- **Permission**: `disease:update`
- **Description**: Upserts localized strings for `name`, `description`, `cause`, `treatment`, `prevention`.

### `GET /symptoms`
- **Query Params**: `category` (category code filter), `locale` (`en` or `km`)
- **Response**: `200 OK` (List of symptoms grouped by anatomical category with sort order).

### `POST /symptoms` | `PATCH /symptoms/{id}`
- **Permission**: `symptom:create` / `symptom:update`

### `DELETE /symptoms/{id}`
- **Permission**: `symptom:delete`
- **Status**: `204 No Content`. Returns `409 Conflict` if the symptom is linked to any existing disease.

---

## 5. Local AI & Multimodal Endpoints (`/ai`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/ai/health` | None (Public) | Probes Ollama server status and loaded models (`AI_MODEL`, `AI_VISION_MODEL`). |
| `POST`| `/ai/chat` | Authenticated | Conversational bot for grower advice. English & Khmer. |
| `POST`| `/ai/extract-symptoms` | `diagnosis:run` | Converts natural language text into structured botanical symptoms. |
| `POST`| `/ai/diagnose` | `diagnosis:run` | End-to-end AI diagnosis: extracts symptoms, maps to DB IDs, executes expert engine, returns AI explanation. |
| `POST`| `/ai/analyze-image` | Authenticated | Sends base64 image to local VLM for visual observation extraction. |
| `POST`| `/ai/admin/chat` | `disease:read` | Conversational interface for admins/experts to query, create, update, or delete records. |
| `POST`| `/ai/expert/disease-draft`| `disease:create`| Generates disease knowledge draft from botanical literature. |
| `POST`| `/ai/expert/duplicate-check`| `disease:create`| Detects potential symptom/pathology overlaps with existing records. |

---

## 6. Feedback & Admin Management (`/feedback`, `/admin`, `/analytics`, `/media`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/media` | Authenticated | Uploads image (PNG, JPEG, WebP), validates magic bytes, strips EXIF, generates thumbnail. |
| `GET` | `/analytics/overview` | `analytics:read` | Returns 30-day checks trend, top symptoms, and no-match pattern clusters. |
| `GET` | `/feedback` | `feedback:read` (all) or own | Retrieves grower feedback list. |
| `POST` | `/feedback` | None / Authenticated | Submits crop issue or feedback linked to session. |
| `PATCH`| `/feedback/{id}` | `feedback:resolve` | Transitions feedback status (`open`, `in_review`, `resolved`). |
| `GET` | `/admin/users` | `user:manage` | Paginated user accounts list. |
| `PATCH`| `/admin/users/{id}` | `user:manage` | Updates user active status or role assignment. Prevents self-deactivation. |
| `GET` | `/admin/roles` | `rbac:manage` | Lists all roles and complete permission matrix. |
| `PUT` | `/admin/roles/{id}/permissions` | `rbac:manage` | Atomically updates permission mappings for a role. |
| `GET` | `/admin/rulesets` | `ruleset:manage` | Lists diagnostic ruleset versions and hyperparameters. |
| `POST`| `/admin/rulesets/{id}/activate` | `ruleset:manage` | Activates target ruleset and deactivates others. |
