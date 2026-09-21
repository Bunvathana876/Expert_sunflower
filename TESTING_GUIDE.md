# 🚀 Application Testing Guide

Both backend and frontend are now running! Here's how to test everything.

## 🟢 Services Running

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | http://localhost:8000 | ✅ Running |
| **API Docs** | http://localhost:8000/docs | ✅ Interactive Swagger UI |
| **Frontend** | http://localhost:5174 | ✅ Running |
| **Health Check** | http://localhost:8000/health | ✅ DB Connected |

## 🔐 Test Accounts

Use these credentials to log in:

| Username | Password | Role | What You Can Test |
|----------|----------|------|-------------------|
| `admin` | `admin` | Admin | Full admin panel, user management, RBAC, rulesets |
| `expert` | `expert` | Agronomist | Disease CRUD, symptom weights, feedback review, analytics |
| `user` | `user` | Grower | Browse diseases, run diagnostics, view history |

## 🧪 Quick Tests

### 1️⃣ Test the Web UI (Recommended)

**Open in your browser**: http://localhost:5174

#### Test Landing Page
- Should see "Sunflower Crop Disease Expert System" hero section
- Click "Browse Disease Library" → should list diseases
- Click "Diagnose Crop" → should go to symptom checker

#### Test Login & User Roles

**A. Login as Grower (User)**
1. Go to http://localhost:5174/login
2. Username: `user`, Password: `user`
3. Click "Log In"
4. ✅ Should redirect to home page
5. Try running a diagnosis:
   - Click "Check Symptoms" or "Diagnose Crop"
   - Select a plant part (e.g., "Leaf")
   - Answer some symptom questions (Yes/No/Not Sure)
   - Click "Get Result"
   - Should see diagnosis results with confidence scores

**B. Login as Expert (Agronomist)**
1. Log out (top right menu)
2. Login with username: `expert`, password: `expert`
3. Notice: Admin menu should appear in navigation
4. Go to http://localhost:5174/admin
5. ✅ Should see admin dashboard with:
   - Overview/Analytics
   - Diseases management
   - Symptoms catalog
   - Feedback queue
   - But NO "Users" or "Roles" (expert doesn't have those permissions)

**C. Login as Admin**
1. Log out
2. Login with username: `admin`, password: `admin`
3. Go to http://localhost:5174/admin
4. ✅ Should see ALL admin options:
   - Overview
   - Diseases
   - Symptoms
   - Feedback
   - **Users** (admin only)
   - **Roles** (admin only)
   - **Rulesets** (admin only)

### 2️⃣ Test the API Directly

#### Test Login API
```bash
# Login as admin
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "admin"}'

# Login as expert
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "expert", "password": "expert"}'

# Login as user
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "user", "password": "user"}'
```

#### Test Health Check
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","version":"0.1.0","db":"up"}
```

#### Test Disease List
```bash
curl http://localhost:8000/api/v1/diseases
# Should return paginated list of diseases
```

### 3️⃣ Interactive API Testing (Swagger UI)

**Best way to test the API!**

1. Open: http://localhost:8000/docs
2. You'll see all available endpoints
3. Click "Authorize" button (top right)
4. Login to get a token:
   - Scroll to "auth" section
   - Expand `POST /api/v1/auth/login`
   - Click "Try it out"
   - Enter:
     ```json
     {
       "identifier": "admin",
       "password": "admin"
     }
     ```
   - Click "Execute"
   - Copy the `access_token` from the response
5. Click "Authorize" again and paste the token
6. Now you can test any endpoint!

**Try these:**
- `GET /api/v1/auth/me` - See your current user info
- `GET /api/v1/diseases` - List all diseases
- `GET /api/v1/symptoms` - List symptoms by category
- `POST /api/v1/diagnosis/preview` - Run a diagnosis without saving

## 🎯 Feature Testing Checklist

### ✅ Authentication & Authorization
- [ ] Login with each user type (admin, expert, user)
- [ ] Logout works
- [ ] Invalid credentials show error
- [ ] Token refresh works (try waiting 15 minutes and making another request)
- [ ] Accessing admin panel without permissions redirects

### ✅ Disease Library (All Users)
- [ ] Browse diseases at http://localhost:5174/diseases
- [ ] Search diseases by name
- [ ] Click on a disease to see details
- [ ] View disease symptoms, causes, treatments
- [ ] Switch language (EN ⇄ KM) - check if Khmer displays correctly

### ✅ Symptom Checker (All Users)
- [ ] Start diagnosis at http://localhost:5174/check
- [ ] Select plant part category
- [ ] Answer symptom questions (Yes/No/Not Sure)
- [ ] See live preview of possible diseases
- [ ] See "Next Best Questions" recommendations
- [ ] Get final diagnosis results
- [ ] View evidence (supporting/conflicting symptoms)
- [ ] Results are shareable (copy URL)

### ✅ Admin Panel - Diseases (Expert & Admin)
- [ ] View diseases list at http://localhost:5174/admin/diseases
- [ ] Create new disease
- [ ] Edit disease content (name, description, etc.)
- [ ] Edit symptoms tab - add/remove symptoms
- [ ] Adjust symptom weights (0.00 - 1.00)
- [ ] Toggle required/pathognomonic flags
- [ ] See live preview of how changes affect diagnosis
- [ ] Upload disease image

### ✅ Admin Panel - Users (Admin Only)
- [ ] View users at http://localhost:5174/admin/users
- [ ] Change user roles
- [ ] Activate/deactivate users
- [ ] Expert should NOT see this menu

### ✅ Admin Panel - Roles (Admin Only)
- [ ] View roles at http://localhost:5174/admin/roles
- [ ] See permission matrix
- [ ] Edit role permissions
- [ ] Expert should NOT see this menu

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to API"
**Solution**: Check if backend is running:
```bash
curl http://localhost:8000/health
```
If not responding, restart backend:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Issue: "Database connection failed"
**Solution**: Check PostgreSQL is running:
```bash
psql -U sunflower -d sunflower -h localhost -c "SELECT 1;"
```

### Issue: "Login doesn't work"
**Solution**: Verify passwords were set correctly:
```bash
cd backend
source .venv/bin/activate
python -c "
import asyncio
from app.db.session import async_session_factory
from app.models.auth import User
from sqlalchemy import select

async def check():
    async with async_session_factory() as session:
        result = await session.execute(select(User.username, User.email))
        for username, email in result:
            print(f'{username} - {email}')

asyncio.run(check())
"
```

### Issue: Frontend shows blank page
**Solution**: 
1. Check browser console for errors (F12 → Console)
2. Check frontend terminal for errors
3. Try clearing browser cache and reload

### Issue: Symptoms not loading in checker
**Solution**: Make sure you've run the seed script:
```bash
cd backend
source .venv/bin/activate
python -m scripts.seed
```

## 📊 Verify Test Data

Check if you have diseases and symptoms:

```bash
# Count diseases
psql -U sunflower -d sunflower -h localhost -c "SELECT COUNT(*) FROM diseases;"

# Count symptoms
psql -U sunflower -d sunflower -h localhost -c "SELECT COUNT(*) FROM symptoms;"

# List symptom categories
psql -U sunflower -d sunflower -h localhost -c "SELECT code FROM symptom_categories ORDER BY sort_order;"
```

If empty, run the migration script (if you have legacy data) or seed script.

## 🎨 UI/UX Testing Tips

1. **Test on different screen sizes**:
   - Narrow your browser window (mobile view)
   - Should see mobile navigation at bottom
   - Category cards should adapt to 2 columns

2. **Test language switching**:
   - Look for language toggle
   - Switch to Khmer (KM)
   - Verify Khmer text renders properly (no clipped characters)

3. **Test accessibility**:
   - Try navigating with keyboard only (Tab key)
   - Focus indicators should be visible
   - Screen reader should work

4. **Test print**:
   - View a disease detail page
   - Try Print (Ctrl+P / Cmd+P)
   - Should format nicely for printing

## 📱 Next Steps

Once basic testing is done:
1. Try creating a new disease (as expert/admin)
2. Add symptoms and weights to it
3. Run a diagnosis that should match your new disease
4. Submit feedback (as grower)
5. Review feedback (as expert/admin)
6. Check analytics dashboard
7. Test role permission changes

---

**Happy Testing! 🎉**

If you find any issues, check the terminal output for both backend and frontend for error messages.
