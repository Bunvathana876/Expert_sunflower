# Sunflower Expert System 🌻

AI-powered bilingual (English/Khmer) expert system for diagnosing sunflower diseases with intelligent symptom analysis, image recognition, real-time knowledge management, and agronomist tooling.

---

## ✨ Key Features

### 👨‍🌾 For Growers:
- 🔍 **Interactive Disease Diagnosis** – Step-by-step symptom checker with visual plant part categories (leaves, stems, flowers, roots).
- 📸 **AI Vision Analysis** – Multimodal disease identification from plant photos.
- 💬 **AI Plant Health Assistant** – Real-time chat for sunflower care advice, disease prevention, and organic/chemical treatments.
- 👤 **User Profile & Account Management** – Edit details, change password, and manage active session with instant refresh persistence.
- 📊 **Diagnosis History** – Review and track past diagnosis sessions and confidence ratings.
- 📝 **Feedback System** – Submit field feedback and report discrepancies to agronomists.
- 🌐 **Full Bilingual Support** – English and Khmer (ភាសាខ្មែរ) with seamless switching.

###  For Agronomists & Experts:
- 🦠 **Disease Knowledge Base** – Create, review, and publish diseases with causative pathogens and treatment guidelines.
- 🧬 **Symptom Weighting & Rulesets** – Configure diagnostic indicators, symptom severity, and Bayesian inference weights.
- 💬 **AI Admin Assistant** – Natural language querying and automated rule suggestions.
- 📬 **Grower Feedback Review** – Validate diagnosis accuracy and incorporate field reports into the knowledge graph.

### 🛡️ For Administrators:
- 👥 **User & Role Management** – Fine-grained Role-Based Access Control (RBAC) with granular permissions.
- 📈 **Analytics Dashboard** – Real-time stats on disease frequency, diagnostic confidence, and user activity.
- 🔑 **Secure Authentication** – Argon2id password hashing, JWT access tokens, and HttpOnly refresh token rotation with local & production cookie security.

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.12+**
- **Node.js 20+** & npm
- **PostgreSQL 14+**
- **Ollama** (optional, for local AI chat & vision features)

---

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone <your-repo-url>
cd sunflower-expert

# Start full stack (API, DB, Frontend, Ollama)
docker compose up --build

# Run database migrations and seed initial data
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
```

Access:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Option 2: Local Development

#### 1. Backend Setup:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e .

# Configure environment
cp ../.env.example .env

# Apply migrations and seed data
alembic upgrade head
python -m scripts.seed

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup:
```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```

#### 3. AI Setup (Ollama):
```bash
# Pull recommended models
ollama pull qwen2.5:7b    # Chat & reasoning
ollama pull llava:7b      # Vision & disease leaf recognition
ollama serve
```

---

## 🔑 Default Credentials

After running `python -m scripts.seed`:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@example.com` | `admin123456` |
| **Expert** | `expert@example.com` | `expert123456` |
| **Grower** | `grower@example.com` | `grower123456` |

> ⚠️ **Important**: Update default passwords before deploying to a public production server. You can reset the admin password anytime using:
> ```bash
> cd backend
> python3 -m scripts.reset_admin_password
> ```

---

## 🧪 Testing & Code Quality

### Backend Tests
```bash
cd backend
python3 -m pytest
```

### Frontend Tests & Type Checking
```bash
cd frontend

# Run Vitest test suites
npm test -- --run

# TypeScript type check
npm run typecheck

# Production build test
npm run build
```

---

## 🏗️ Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** + **Tailwind CSS 4**
- **TanStack Query** (React Query)
- **React Router 7**
- **Lucide Icons**
- **i18next** (English & Khmer)

### Backend & Database
- **FastAPI** (Python 3.12+)
- **SQLAlchemy 2.0 (Async)** + **Alembic**
- **PostgreSQL**
- **Argon2id** & **JWT (Jose)**
- **Pydantic v2**

### AI Engine
- **Ollama** (Local self-hosted LLM/VLM runtime)
- **Qwen 2.5** & **LLaVA**

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
