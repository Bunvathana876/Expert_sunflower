# ✅ Deployment Checklist

Print this and check off each step!

## 🗄️ Database Setup

- [ ] Create Supabase account at https://supabase.com/dashboard
- [ ] Create new project named `sunflower-expert`
- [ ] Set strong database password and save it
- [ ] Wait for database to provision (2-3 min)
- [ ] Get connection string from Settings → Database → Connection pooling
- [ ] Replace `[YOUR-PASSWORD]` with actual password
- [ ] Save both connection strings:
  - `postgresql+asyncpg://...` (for DATABASE_URL)
  - `postgresql+psycopg://...` (for ALEMBIC_DATABASE_URL)

---

## 🔧 Backend Deployment

- [ ] Go to https://vercel.com/new
- [ ] Import repository: `Yongbeenm/Expert_sunflower-deploy`
- [ ] Set Project Name: `sunflower-backend`
- [ ] Set Root Directory: `backend` ⚠️ IMPORTANT
- [ ] Add ALL environment variables (see list below)
- [ ] Click Deploy
- [ ] Wait for deployment to complete
- [ ] Copy backend URL and save it
- [ ] Update `MEDIA_PUBLIC_URL` with actual backend URL
- [ ] Redeploy backend
- [ ] Test: Visit `https://your-backend.vercel.app/health`
- [ ] Verify shows: `{"status":"ok","db":"up"}`

### Backend Environment Variables (14 total)
- [ ] DATABASE_URL
- [ ] ALEMBIC_DATABASE_URL
- [ ] JWT_SECRET
- [ ] JWT_ALG
- [ ] ACCESS_TTL_MIN
- [ ] REFRESH_TTL_DAYS
- [ ] ENV
- [ ] LOG_LEVEL
- [ ] CORS_ORIGINS (set to `*` initially)
- [ ] MEDIA_BACKEND
- [ ] MEDIA_ROOT
- [ ] MEDIA_PUBLIC_URL
- [ ] MEDIA_MAX_BYTES
- [ ] ADMIN_EMAIL
- [ ] ADMIN_PASSWORD
- [ ] ADMIN_USERNAME

---

## 🎨 Frontend Deployment

- [ ] Go to https://vercel.com/new
- [ ] Import SAME repository: `Yongbeenm/Expert_sunflower-deploy`
- [ ] Set Project Name: `sunflower-frontend`
- [ ] Set Root Directory: `frontend` ⚠️ IMPORTANT
- [ ] Set Framework: Vite
- [ ] Add environment variable: `VITE_API_BASE_URL`
- [ ] Set value: `https://your-backend.vercel.app/api/v1`
- [ ] Click Deploy
- [ ] Wait for deployment to complete
- [ ] Copy frontend URL and save it

### Frontend Environment Variables (1 total)
- [ ] VITE_API_BASE_URL

---

## 🔗 Connect Frontend & Backend

- [ ] Go to backend project on Vercel
- [ ] Go to Settings → Environment Variables
- [ ] Edit `CORS_ORIGINS`
- [ ] Change from `*` to frontend URL (e.g., `https://your-frontend.vercel.app`)
- [ ] Save
- [ ] Go to Deployments tab
- [ ] Click "..." → "Redeploy"

---

## 🧪 Testing

- [ ] Open frontend URL in browser
- [ ] Open DevTools (F12) → Network tab
- [ ] Login with:
  - Username: `admin`
  - Password: `keT4zngeY5S-F87hXZiXsQ`
- [ ] Verify login works
- [ ] Check Network tab shows requests to backend
- [ ] Check Console tab has no CORS errors
- [ ] Try navigating different pages
- [ ] Test creating/viewing diseases

---

## 📝 Save These!

Write down your credentials:

**Backend URL:** _______________________________________

**Frontend URL:** _______________________________________

**Database Password:** _______________________________________

**Admin Username:** admin

**Admin Password:** keT4zngeY5S-F87hXZiXsQ

**Supabase Project:** https://supabase.com/dashboard/project/_______

---

## ❌ Common Issues

### "db: down" in health check
→ Check DATABASE_URL is correct with actual password

### Frontend can't reach backend
→ Check VITE_API_BASE_URL includes `/api/v1` at the end

### CORS errors
→ Update CORS_ORIGINS in backend to match frontend URL exactly

### Build fails
→ Check Root Directory is set correctly (`backend` or `frontend`)

---

## 🎉 Done!

When all items are checked, your app is live and working!

Share your frontend URL with users: https://your-frontend.vercel.app
