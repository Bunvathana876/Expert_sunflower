# Data Flow & Transaction Lifecycles

## 1. Flow 1: Interactive Symptom Diagnosis Workflow

This is the central grower workflow from symptom selection through real-time preview to persistent result generation.

```mermaid
sequenceDiagram
    autonumber
    actor Grower as Grower (User)
    participant UI as CheckerPage (React)
    participant State as checkerReducer
    participant Client as apiFetch (client.ts)
    participant API as FastAPI (routes/diagnosis.py)
    participant Runner as DiagnosisRunner (runner.py)
    participant Engine as Pure Engine (scoring.py)
    participant DB as PostgreSQL 16

    Grower->>UI: Selects symptoms (Yes / No / Unknown)
    UI->>State: dispatch({ type: "SET_ANSWER", symptomId, answer })
    State-->>UI: Updated answers state

    rect rgb(240, 248, 255)
        Note over UI,Engine: Debounced Live Preview (400ms)
        UI->>Client: previewDiagnosis(answers, locale, abortSignal)
        Client->>API: POST /api/v1/diagnosis/preview
        API->>Runner: runner.preview(req)
        Runner->>DB: Fetch active ruleset & published disease rules
        DB-->>Runner: Cached rules & weights
        Runner->>Engine: rank(rules, answers, params)
        Engine-->>Runner: Ranked DiseaseScore[]
        Runner->>Engine: next_best_questions(rules, answers, params)
        Engine-->>Runner: Top 3 informative symptoms
        Runner-->>API: DiagnosisResponse (stateless)
        API-->>Client: 200 OK + JSON
        Client-->>UI: LiveCandidateList updates with probability bars
    end

    Grower->>UI: Clicks "Run Diagnosis"
    UI->>Client: submitDiagnosis(answers, locale)
    Client->>API: POST /api/v1/diagnosis/sessions
    API->>Runner: runner.create_session(req, current_user)
    Runner->>DB: Fetch active ruleset & rules
    DB-->>Runner: Rules data
    Runner->>Engine: rank(rules, answers, params)
    Engine-->>Runner: Retained scored diseases
    Runner->>Engine: build_evidence(rule, answers)
    Engine-->>Runner: Supporting / Against / Missing breakdown

    rect rgb(255, 250, 240)
        Note over Runner,DB: Atomic Persistence Transaction
        Runner->>DB: INSERT INTO diagnosis_sessions (...)
        Runner->>DB: INSERT INTO diagnosis_selected_symptoms (...)
        Runner->>DB: INSERT INTO diagnosis_results (...)
        DB-->>Runner: Commit & generated UUID session_id
    end

    Runner-->>API: DiagnosisResponse
    API-->>Client: 200 OK
    Client-->>UI: Navigate to /check/{session_id}
    UI->>Grower: Displays ResultPage with top disease & evidence
```

---

## 2. Flow 2: Offline Diagnosis Queuing and Resynchronization

When field internet drops, the system transitions gracefully into offline mode.

```mermaid
sequenceDiagram
    autonumber
    actor Grower as Grower (In Field)
    participant UI as CheckerPage
    participant Queue as IndexedDB (lib/offlineQueue.ts)
    participant Sync as useOfflineSync Hook
    participant Client as apiFetch
    participant Backend as FastAPI Backend

    Grower->>UI: Submits diagnosis while offline (navigator.onLine === false)
    UI->>Queue: enqueueOfflineDiagnosis({ answers, locale })
    Queue->>Queue: Store item in 'pending_diagnoses' with client UUID
    Queue-->>UI: Item enqueued successfully
    UI->>Grower: Display "Saved Offline" confirmation modal

    Note over Grower,Sync: Grower returns to village / cellular connectivity restored
    Browser->>Sync: 'online' event triggered
    Sync->>Queue: getPendingDiagnoses()
    Queue-->>Sync: Return pending items list

    loop For each pending item
        Sync->>Queue: updateDiagnosisStatus(id, "syncing")
        Sync->>Client: submitDiagnosis(item.answers, item.locale)
        Client->>Backend: POST /api/v1/diagnosis/sessions
        Backend-->>Client: 200 OK (Persisted in PostgreSQL)
        Client-->>Sync: Success
        Sync->>Queue: removeSyncedDiagnosis(item.id)
    end

    Sync->>UI: queryClient.invalidateQueries(["diagnosisHistory"])
    UI->>Grower: Show "Sync complete" banner & update history page
```

---

## 3. Flow 3: AI Multimodal Symptom Extraction & Expert Diagnosis

```mermaid
sequenceDiagram
    autonumber
    actor User as Grower / Agronomist
    participant Chat as AIChatWidget (React)
    participant AI_API as FastAPI (routes/ai.py)
    participant Extractor as SymptomExtractor (ai/services)
    participant Vision as VisionService (ai/services)
    participant Ollama as Local Ollama Server (:11434)
    participant DB as PostgreSQL 16
    participant Runner as DiagnosisRunner

    User->>Chat: Uploads crop leaf photo + "Leaves turning brown"
    Chat->>AI_API: POST /api/v1/ai/diagnose (image_base64 + message)

    AI_API->>Extractor: extract_symptoms(message, locale)
    Extractor->>Ollama: POST /api/generate (prompt: symptom_extraction.txt)
    Ollama-->>Extractor: JSON { plant_part: ["leaf"], symptoms: ["brown_spots"] }

    AI_API->>Vision: extract_symptoms_from_image(image_base64)
    Vision->>Ollama: POST /api/generate (VLM multimodal prompt)
    Ollama-->>Vision: JSON { plant_part: ["leaf"], observations: ["foliar necrosis"] }

    AI_API->>Extractor: map_to_database_symptoms(extracted, db)
    Extractor->>DB: Match extracted terms with symptoms & translations
    DB-->>Extractor: Matched symptom IDs [12, 45]

    AI_API->>Runner: runner.create_session(DiagnosisRequest(answers={12: "yes", 45: "yes"}))
    Runner->>Runner: Executes pure engine scoring
    Runner->>DB: Persists diagnosis session
    DB-->>Runner: Saved session ID

    AI_API->>Ollama: Generate empathetic natural language explanation
    Ollama-->>AI_API: "Based on foliar necrosis and brown spots..."
    AI_API-->>Chat: AIDiagnosisResponse
    Chat->>User: Displays diagnosis cards, probability, and advice
```

---

## 4. Flow 4: Authentication & Silent Token Refresh Loop

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant Client as apiFetch (client.ts)
    participant AuthContext as AuthProvider (context.tsx)
    participant API as FastAPI (/api/v1/auth/*)

    User->>Client: apiFetch("/diagnosis/sessions")
    Client->>API: GET /diagnosis/sessions with Bearer expired_token
    API-->>Client: 401 Unauthorized (application/problem+json)

    rect rgb(255, 245, 245)
        Note over Client,API: Automatic Token Rotation
        Client->>AuthContext: _onRefreshNeeded() interceptor triggered
        AuthContext->>API: POST /api/v1/auth/refresh (Cookie: refresh_token)
        API->>API: Verify refresh token, check revocation, generate new pair
        API-->>AuthContext: 200 OK + new access_token + Set-Cookie: new_refresh_token
        AuthContext-->>Client: Return new access_token
    end

    Client->>API: Re-attempt GET /diagnosis/sessions with Bearer new_token
    API-->>Client: 200 OK + Paginated sessions
    Client-->>User: Render history view
```
