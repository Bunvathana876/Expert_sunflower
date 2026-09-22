# Sunflower Expert System 🌻

An AI-powered bilingual (English/Khmer) expert system for diagnosing sunflower diseases with intelligent symptom analysis, image recognition, Bayesian inference scoring, real-time knowledge management, and agronomist tooling.

---

## ✨ Features

### 👨‍🌾 For Growers
- 🔍 **Interactive Symptom Checker**: Multi-step diagnostic flow categorized by plant parts (leaves, stems, flowers, roots, seedlings).
- 📸 **AI Vision Analysis**: Multimodal disease diagnosis from uploaded leaf/plant photos.
- 💬 **AI Plant Care Assistant**: Conversational sunflower care, disease prevention, and treatment advice.
- 👤 **Account & Profile**: Manage profile details, credentials, and persistent authenticated sessions.
- 📊 **Diagnosis History**: View, search, filter, and track past diagnostic reports and confidence ratings.
- 📝 **Feedback System**: Report field discrepancies directly to agronomists.
- 🌐 **Bilingual UI**: Complete English and Khmer (ភាសាខ្មែរ) language support.
- 🎨 **Botanical Animated Theme**: Interactive WebGL shader background with high-contrast glassmorphism dark mode.

### 🔬 For Agronomists & Experts
- 🦠 **Disease Knowledge Base**: Create, edit, and publish disease definitions, pathogens, and treatment regimens.
- 🧬 **Symptom Weighting & Rulesets**: Configure diagnostic indicators, severity weights, and rules.
- 💬 **AI Expert Assistant**: Natural language querying over disease databases and rule suggestions.
- 📬 **Grower Feedback Review**: Validate diagnostic accuracy and update knowledge graphs based on field reports.

### 🛡️ For Administrators
- 👥 **User & Role Management**: Role-Based Access Control (RBAC) with customizable permissions matrix.
- 📈 **System Overview & Metrics**: Real-time stats on disease frequency, diagnostic confidence, and user activity.
- 🔑 **Enterprise Security**: Argon2id password hashing, JWT access tokens, HttpOnly refresh token rotation, and robust CORS/cookie controls.

---

## 📋 System Prerequisites

Before running the project, make sure the following software is installed on your machine:

| Requirement | Minimum Version | Recommended | Notes |
|-------------|-----------------|-------------|-------|
| **Git** | `2.x+` | Latest | Version control |
| **Node.js** | `20.x+` | `20.x` or `22.x LTS` | Includes `npm` |
| **Python** | `3.12+` | `3.12.x` | Backend runtime |
| **PostgreSQL** | `14+` | `16.x` | Required for local setup (or via Docker) |
| **Docker & Docker Compose** | `24+` | Docker Desktop | Optional (Recommended for quick start) |
| **Ollama** | Latest | Latest | Optional (For local AI LLM/Vision features) |

---

## 💻 OS-Specific Installation Guide

### 🍏 For macOS Users

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js, Python, and PostgreSQL**:
   ```bash
   brew install node@20 python@3.12 postgresql@16 git
   brew services start postgresql@16
   ```

3. **Install Docker Desktop (Optional)**:
   - Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) (select Mac with Apple Silicon or Intel chip).

---

### 🪟 For Windows Users

1. **Install Git for Windows**:
   - Download from [git-scm.com](https://git-scm.com/download/win).
   - Use Git Bash or PowerShell.

2. **Install Python 3.12+**:
   - Download from [python.org/downloads](https://www.python.org/downloads/).
   - ⚠️ **CRITICAL**: Check the box **"Add python.exe to PATH"** during installation.

3. **Install Node.js 20+ LTS**:
   - Download installer from [nodejs.org](https://nodejs.org/).

4. **Install PostgreSQL 16+** (or use Docker):
   - Download installer from [enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
   - Remember the superuser password you set during installation.

5. **PowerShell Script Execution Policy** (if virtual environment activation is blocked):
   Open PowerShell as Administrator and run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

6. **Install Docker Desktop for Windows (Optional)**:
   - Download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) (requires WSL2 backend).

---

## 🚀 Running the Project

### Option 1: Quick Start with Docker (Recommended for All Platforms)

Docker will run the PostgreSQL database, FastAPI backend, and React frontend in synchronized containers.

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd Expert_sunflower-deploy
   ```

2. **Create environment file**:
   - **macOS / Linux**:
     ```bash
     cp .env.example .env
     ```
   - **Windows (PowerShell)**:
     ```powershell
     Copy-Item .env.example .env
     ```
   - **Windows (Command Prompt)**:
     ```cmd
     copy .env.example .env
     ```

3. **Generate a secure `JWT_SECRET`**:
   - Run in your terminal:
     ```bash
     python3 -c "import secrets; print(secrets.token_urlsafe(48))"
     # On Windows (if python3 doesn't work, use python):
     python -c "import secrets; print(secrets.token_urlsafe(48))"
     ```
   - Copy the generated string and paste it into `.env` for `JWT_SECRET=your_secret_here`.

4. **Start the containers**:
   ```bash
   docker compose up --build
   ```

5. **Run database migrations and seed default data** (in a new terminal):
   ```bash
   docker compose exec api alembic upgrade head
   docker compose exec api python -m scripts.seed
   ```

6. **Open your browser**:
   - 🌐 **Frontend App**: [http://localhost:5173](http://localhost:5173)
   - 📄 **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - 📑 **API Documentation (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Option 2: Local Development Setup

Follow these steps if you want to run the frontend and backend directly on your host operating system without Docker.

#### 1. Setup Local Database

Ensure PostgreSQL is running locally and create a database named `sunflower`:

- **macOS / Linux**:
  ```bash
  psql -U postgres -c "CREATE DATABASE sunflower;"
  psql -U postgres -c "CREATE USER sunflower WITH PASSWORD '089429756';"
  psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sunflower TO sunflower;"
  ```
- **Windows**:
  Open **pgAdmin 4** or **SQL Shell (psql)** and create the `sunflower` database and user, or adjust `DATABASE_URL` in your `.env` file to match your local PostgreSQL credentials (e.g. `postgresql+asyncpg://postgres:your_password@localhost:5432/sunflower`).

---

#### 2. Backend Setup

##### 🍏 On macOS / Linux:
```bash
cd backend

# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Upgrade pip and install dependencies
pip install --upgrade pip
pip install -e .

# 3. Configure environment
cp ../.env.example .env
# Edit .env: update DATABASE_URL to host localhost instead of db:
# DATABASE_URL=postgresql+asyncpg://sunflower:089429756@localhost:5432/sunflower
# ALEMBIC_DATABASE_URL=postgresql+psycopg://sunflower:089429756@localhost:5432/sunflower

# 4. Apply database migrations
alembic upgrade head

# 5. Seed initial data (roles, permissions, admin accounts, diseases)
python -m scripts.seed

# 6. Start development server
uvicorn app.main:app --reload --port 8000
```

##### 🪟 On Windows (PowerShell):
```powershell
cd backend

# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -e .

# 3. Configure environment
Copy-Item ..\.env.example .env
# Edit .env: update DATABASE_URL to use localhost:
# DATABASE_URL=postgresql+asyncpg://sunflower:089429756@localhost:5432/sunflower
# ALEMBIC_DATABASE_URL=postgresql+psycopg://sunflower:089429756@localhost:5432/sunflower

# 4. Apply database migrations
alembic upgrade head

# 5. Seed initial data
python -m scripts.seed

# 6. Start development server
uvicorn app.main:app --reload --port 8000
```

---

#### 3. Frontend Setup

Open a separate terminal window:

##### 🍏 On macOS / Linux:
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev
```

##### 🪟 On Windows:
```powershell
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev
```

The frontend will run at [http://localhost:5173](http://localhost:5173).

---

#### 4. (Optional) Local AI Setup with Ollama

For local AI chat and vision disease recognition without third-party API dependencies:

1. **Install Ollama**:
   - **macOS**: Download from [ollama.com/download/mac](https://ollama.com/download/mac) or `brew install ollama`.
   - **Windows**: Download installer from [ollama.com/download/windows](https://ollama.com/download/windows).

2. **Pull the AI models**:
   ```bash
   ollama pull qwen2.5:7b    # General chat and diagnostic reasoning
   ollama pull llava:7b      # Vision model for leaf photo analysis
   ```

3. **Start Ollama service**:
   ```bash
   ollama serve
   ```

---

## 🔑 Default Seed Accounts

After running the database seed script (`python -m scripts.seed`), use these default credentials to log in:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | `admin@example.com` | `admin123456` | Full system access, users, roles, analytics |
| **Expert** | `expert@example.com` | `expert123456` | Disease knowledge base, rulesets, feedback |
| **Grower** | `grower@example.com` | `grower123456` | Symptom diagnosis, AI vision, care chat |

> ⚠️ **Important Security Notice**: Change default passwords before deploying to a public server.
> You can reset the admin password at any time via CLI:
> ```bash
> cd backend
> python -m scripts.reset_admin_password
> ```

---

## 🧪 Testing & Code Quality

### Backend Unit & Integration Tests
```bash
cd backend
pytest -v
```

### Frontend Tests, Type Checking & Build
```bash
cd frontend

# Run test suites with Vitest
npm test -- --run

# TypeScript validation
npm run typecheck

# Production build test
npm run build
```

---

## 🛠️ Common Troubleshooting

<details>
<summary><b>1. PowerShell script activation error on Windows (<code>running scripts is disabled</code>)</b></summary>

Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then try activating the virtual environment again (`.\.venv\Scripts\Activate.ps1`).
</details>

<details>
<summary><b>2. Database Connection Error (<code>connection to server at "db" failed</code>)</b></summary>

- **If using Docker**: The hostname `db` is correct because Docker handles container networking.
- **If running locally without Docker**: Change `db` to `localhost` in your backend `.env` file:
  ```env
  DATABASE_URL=postgresql+asyncpg://sunflower:089429756@localhost:5432/sunflower
  ALEMBIC_DATABASE_URL=postgresql+psycopg://sunflower:089429756@localhost:5432/sunflower
  ```
</details>

<details>
<summary><b>3. Port 5432 / 8000 / 5173 Already in Use</b></summary>

- **macOS / Linux**: Find and terminate the process holding the port:
  ```bash
  lsof -ti :8000 | xargs kill -9
  ```
- **Windows**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
  ```
</details>

---

## 🏗️ Architecture & Technology Stack

```mermaid
graph TD
    A[React 19 Frontend + Tailwind CSS 4] -->|REST API + HttpOnly Cookies| B[FastAPI Backend]
    B -->|Async SQLAlchemy / Alembic| C[(PostgreSQL 16 Database)]
    B -->|Local AI Inference| D[Ollama - Qwen2.5 / LLaVA]
    A -->|WebGL Canvas| E[Organic Smoke Shader Background]
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router 7, Lucide Icons, i18next.
- **Backend**: FastAPI (Python 3.12+), SQLAlchemy 2.0 (Async), Alembic, Pydantic v2, Argon2id, JWT.
- **Database**: PostgreSQL 16+.
- **AI / ML**: Ollama with Qwen 2.5 (text/reasoning) and LLaVA (vision/image classification).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
