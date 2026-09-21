# 🚀 Deploy to Vercel via Dashboard (Step-by-Step)

## Overview
You'll create **TWO separate projects** on Vercel:
1. **Backend** (FastAPI) - from `/backend` folder
2. **Frontend** (React) - from `/frontend` folder

---

## Part 1: Setup Database First! ⚠️

### Step 1: Create Supabase Database

1. Go to: https://supabase.com/dashboard
2. Sign up or login
3. Click **"New project"**
4. Fill in:
   - **Name:** `sunflower-expert`
   - **Database Password:** Create strong password (SAVE IT!)
   - **Region:** Choose closest to you
5. Click **"Create new project"**
6. **Wait 2-3 minutes** for provisioning
7. When ready:
   - Click **Settings** (gear icon) → **Database**
   - Scroll to **"Connection string"**
   - Click **"Connection pooling"** tab
   - Copy the connection string
   - **Replace `[YOUR-PASSWORD]`** with your actual password
   - **SAVE THIS STRING!** You'll need two versions:
     ```
     DATABASE_URL: postgresql+asyncpg://postgres.xxxxx:PASSWORD@xxx.pooler.supabase.com:6543/postgres
     
     ALEMBIC_DATABASE_URL: postgresql+psycopg://postgres.xxxxx:PASSWORD@xxx.pooler.supabase.com:6543/postgres
     ```

---

## Part 2: Deploy Backend

### Step 2: Create Backend Project on Vercel

1. Go to: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your repository: `Yongbeenm/Expert_sunflower-deploy`
4. Configure project:
   - **Project Name:** `sunflower-backend`
   - **Framework Preset:** Other
   - **Root Directory:** Click **"Edit"** → Select **`backend`** ← IMPORTANT!
   - **Build Command:** Leave empty or `echo "No build needed"`
   - **Output Directory:** Leave empty
   - **Install Command:** `pip install -e .`

### Step 3: Add Backend Environment Variables

**Before deploying**, click **"Environment Variables"** and add these:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres.xxxxx:PASSWORD@xxx.pooler.supabase.com:6543/postgres` |
| `ALEMBIC_DATABASE_URL` | `postgresql+psycopg://postgres.xxxxx:PASSWORD@xxx.pooler.supabase.com:6543/postgres` |
| `JWT_SECRET` | `-htv3M683XFFYJNb6U5Lxg4WguTllwX_V1b1JQWdPXzdG5sKccYNu9sykPRYp2ox` |
| `JWT_ALG` | `HS256` |
| `ACCESS_TTL_MIN` | `15` |
| `REFRESH_TTL_DAYS` | `30` |
| `ENV` | `production` |
| `LOG_LEVEL` | `INFO` |
| `CORS_ORIGINS` | `*` (we'll update this later) |
| `MEDIA_BACKEND` | `local` |
| `MEDIA_ROOT` | `/tmp/sunflower_media` |
| `MEDIA_PUBLIC_URL` | `https://YOUR-BACKEND-URL.vercel.app/media` (update after deploy) |
| `MEDIA_MAX_BYTES` | `5242880` |
| `ADMIN_EMAIL` | `admin@example.com` |
| `ADMIN_PASSWORD` | `keT4zngeY5S-F87hXZiXsQ` |
| `ADMIN_USERNAME` | `admin` |

**Note:** For `DATABASE_URL` and `ALEMBIC_DATABASE_URL`, use your actual Supabase connection string from Step 1!

### Step 4: Deploy Backend

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Once deployed, copy your backend URL (e.g., `https://sunflower-backend-xxxxx.vercel.app`)
4. **SAVE THIS URL!**

### Step 5: Update MEDIA_PUBLIC_URL

1. Go to your backend project → **Settings** → **Environment Variables**
2. Find `MEDIA_PUBLIC_URL`
3. Click **Edit**
4. Change to: `https://YOUR-ACTUAL-BACKEND-URL.vercel.app/media`
5. Click **Save**
6. Go to **Deployments** → Click **"..."** → **"Redeploy"**

### Step 6: Test Backend

Visit: `https://YOUR-BACKEND-URL.vercel.app/health`

You should see:
```json
{"status":"ok","version":"0.1.0","db":"up"}
```

If `"db":"down"`, check your `DATABASE_URL` is correct!

---

## Part 3: Deploy Frontend

### Step 7: Create Frontend Project on Vercel

1. Go to: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select the **SAME** repository: `Yongbeenm/Expert_sunflower-deploy`
4. Configure project:
   - **Project Name:** `sunflower-frontend`
   - **Framework Preset:** Vite
   - **Root Directory:** Click **"Edit"** → Select **`frontend`** ← IMPORTANT!
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Step 8: Add Frontend Environment Variable

**Before deploying**, click **"Environment Variables"** and add:

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | `https://YOUR-BACKEND-URL.vercel.app/api/v1` |

**Replace `YOUR-BACKEND-URL`** with your actual backend URL from Step 4!

### Step 9: Deploy Frontend

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Once deployed, copy your frontend URL (e.g., `https://sunflower-frontend-xxxxx.vercel.app`)
4. **SAVE THIS URL!**

---

## Part 4: Connect Frontend and Backend

### Step 10: Update Backend CORS

1. Go to your **backend** project on Vercel
2. Go to **Settings** → **Environment Variables**
3. Find `CORS_ORIGINS`
4. Click **Edit**
5. Change from `*` to your frontend URL: `https://YOUR-FRONTEND-URL.vercel.app`
6. Click **Save**
7. Go to **Deployments** → Click **"..."** → **"Redeploy"**

---

## Part 5: Test Everything!

### Step 11: Test the App

1. Open your frontend URL: `https://YOUR-FRONTEND-URL.vercel.app`
2. Open browser DevTools (F12) → **Network** tab
3. Try to login:
   - **Username:** `admin`
   - **Password:** `keT4zngeY5S-F87hXZiXsQ`
4. Check:
   - ✅ Login works
   - ✅ API requests go to your backend URL
   - ✅ No CORS errors in Console tab

---

## 🎉 Success!

Your app is now live!

### Your URLs:
- **Frontend:** https://YOUR-FRONTEND-URL.vercel.app
- **Backend:** https://YOUR-BACKEND-URL.vercel.app
- **API Docs:** https://YOUR-BACKEND-URL.vercel.app/docs

### Admin Credentials:
- **Username:** admin
- **Password:** keT4zngeY5S-F87hXZiXsQ

**⚠️ SAVE THESE CREDENTIALS SECURELY!**

---

## 🐛 Troubleshooting

### Backend build fails
- Check "Root Directory" is set to `backend`
- Check all environment variables are set
- Check DATABASE_URL is correct

### Frontend build fails
- Check "Root Directory" is set to `frontend`
- Check VITE_API_BASE_URL is set
- Check Node.js version (should be 18.x or higher)

### Backend shows "db: down"
- Verify DATABASE_URL is correct
- Make sure you replaced [YOUR-PASSWORD] with actual password
- Check Supabase database is running

### Frontend can't connect to backend
- Check VITE_API_BASE_URL in frontend settings
- Check CORS_ORIGINS in backend settings
- Make sure both URLs match exactly (no trailing slashes)

### CORS errors in browser
- Update CORS_ORIGINS in backend to match frontend URL exactly
- Redeploy backend after changing CORS_ORIGINS

---

## 📝 Quick Reference

### Backend Environment Variables Summary
```
DATABASE_URL=postgresql+asyncpg://...
ALEMBIC_DATABASE_URL=postgresql+psycopg://...
JWT_SECRET=-htv3M683XFFYJNb6U5Lxg4WguTllwX_V1b1JQWdPXzdG5sKccYNu9sykPRYp2ox
JWT_ALG=HS256
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=30
ENV=production
LOG_LEVEL=INFO
CORS_ORIGINS=https://YOUR-FRONTEND-URL.vercel.app
MEDIA_BACKEND=local
MEDIA_ROOT=/tmp/sunflower_media
MEDIA_PUBLIC_URL=https://YOUR-BACKEND-URL.vercel.app/media
MEDIA_MAX_BYTES=5242880
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=keT4zngeY5S-F87hXZiXsQ
ADMIN_USERNAME=admin
```

### Frontend Environment Variables Summary
```
VITE_API_BASE_URL=https://YOUR-BACKEND-URL.vercel.app/api/v1
```
