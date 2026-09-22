# Sunflower Expert System 🌻

AI-powered bilingual (English/Khmer) expert system for diagnosing sunflower diseases with intelligent symptom analysis, image recognition, and real-time knowledge management.

## ✨ Features

### For Growers:
- 🔍 **Disease Diagnosis** - Expert system with symptom-based diagnosis
- 📸 **Image Analysis** - AI-powered vision system for disease identification  
- 💬 **AI Assistant** - Natural language chat for plant health questions
- 📊 **Diagnosis History** - Track and review past diagnoses
- 📝 **Feedback System** - Report issues and request improvements
- 🌐 **Bilingual** - Full support for English and Khmer languages

### For Experts (Agronomists):
- 🦠 **Disease Management** - Create, update, and manage disease database
- 🔬 **Symptom Management** - Configure symptoms and diagnostic weights
- 📈 **Analytics Dashboard** - View system usage and diagnosis patterns
- 💬 **AI Admin Chat** - Natural language commands to modify database
- 📬 **Feedback Management** - Review and respond to user feedback
- 🌍 **Translation Tools** - Manage multilingual content

### For Administrators:
- 👥 **User Management** - Manage user accounts and roles
- 🔐 **Role-Based Access Control** - Fine-grained permissions system
- ⚙️ **Ruleset Configuration** - Tune diagnosis algorithm parameters
- 📊 **System Analytics** - Monitor system health and performance
- 💬 **Full AI Capabilities** - Advanced AI-powered data management
- 🔧 **System Configuration** - Manage system settings

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 14+
- Ollama (for AI features)

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone <your-repo-url>
cd sunflower-expert

# Start services
docker compose up --build

# Run migrations and seed data
docker compose exec api alembic upgrade head
docker compose exec api python -m scripts.seed
```

Access:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Option 2: Local Development

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Ollama (AI Features):**
```bash
ollama pull qwen2.5:7b    # Main AI model
ollama pull llava:7b      # Vision model
ollama serve
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** | Complete setup guide for new developers |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System architecture and data model |
| **[AI_ADMIN_COMMANDS.md](AI_ADMIN_COMMANDS.md)** | AI admin chat commands |
| **[AI_INTEGRATION.md](AI_INTEGRATION.md)** | AI integration guide |
| **[AI_PERMISSIONS.md](AI_PERMISSIONS.md)** | Permission system documentation |
| **[FEEDBACK_SYSTEM_OVERVIEW.md](FEEDBACK_SYSTEM_OVERVIEW.md)** | Feedback feature documentation |
| **[CLEANUP_GUIDE.md](CLEANUP_GUIDE.md)** | Project cleanup before deployment |

## 🏗️ Project Structure

```
sunflower-expert/
├── backend/              # FastAPI + PostgreSQL
│   ├── app/             # Application code
│   │   ├── api/         # API routes
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   └── schemas/     # Pydantic schemas
│   ├── ai/              # AI services (Ollama)
│   ├── alembic/         # Database migrations
│   └── tests/           # Backend tests
│
├── frontend/            # React + TypeScript
│   ├── src/
│   │   ├── features/    # Feature modules
│   │   ├── components/  # Shared components
│   │   └── api/         # API client
│   └── public/          # Static assets
│
└── docs/                # Documentation
```

## 🔑 Default Credentials

After running seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | change-me-before-production |
| Expert | expert@example.com | change-me-before-production |
| Grower | grower@example.com | change-me-before-production |

**⚠️ Change these before deploying to production!**

## 🧪 Testing

**Backend:**
```bash
cd backend
source .venv/bin/activate
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

**Linting:**
```bash
# Backend
cd backend
ruff format .
ruff check --fix .

# Frontend
cd frontend
npm run lint
```

## 🌐 API Endpoints

### Public Endpoints:
- `GET /api/v1/diseases` - List published diseases
- `POST /api/v1/diagnosis/run` - Run diagnosis session
- `POST /api/v1/feedback` - Submit feedback

### Admin Endpoints:
- `GET /api/v1/admin/users` - Manage users
- `POST /api/v1/diseases` - Create diseases
- `PUT /api/v1/diseases/{id}` - Update diseases
- `GET /api/v1/analytics/overview` - System analytics

### AI Endpoints:
- `POST /api/v1/ai/chat` - Chat with AI assistant
- `POST /api/v1/ai/admin/chat` - AI admin commands
- `POST /api/v1/ai/analyze-image` - Analyze plant images

Full API documentation: http://localhost:8000/docs

## 🛠️ Technologies

### Backend:
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **Ollama** - Local AI models
- **Pydantic** - Data validation

### Frontend:
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching
- **React Router** - Navigation
- **i18next** - Internationalization

### AI/ML:
- **Ollama** - Local LLM server
- **Qwen 2.5** - Language model
- **LLaVA** - Vision model

## 📝 License

[Your License Here]

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

## 📧 Support

For issues and questions:
- Create an issue on GitHub
- Check documentation in `/docs`
- Review setup instructions

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Offline mode support
- [ ] Multi-crop support
- [ ] Advanced analytics
- [ ] API versioning
- [ ] Automated testing CI/CD

---

**Built with ❤️ for sustainable agriculture** 🌱
