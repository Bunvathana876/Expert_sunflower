# 🌻 Sunflower Expert System - Complete Deployment Guide

## Prerequisites
- ✅ Git repository: https://github.com/Yongbeenm/Expert_sunflower-deploy.git
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ Vercel CLI installed and logged in

---

## Part 1: Setup Database (Do This First!)

### Step 1: Create Supabase Project

1. Go to: https://supabase.com/dashboard
2. Click **"New project"**
3. Fill in:
   - **Name:** `sunflower-expert`
   - **Database Password:** Create a strong password and **SAVE IT!**
   - **Region:** Choose closest to you (e.g., Southeast Asia)
4. Click **"Create new project"**
5. Wait 2-3 minutes for the database to provision

### Step 2: Get Database Connection String

1. In your Supabase project, click **Settings** (gear icon in sidebar)
2. Click **Database** in the left menu
3. Scroll down to **"Connection string"** section
4. Select **"Connection pooling"** tab (NOT "Session mode")
5. Copy the connection string (it looks like this):
   ```
   postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
6. **Replace `[YOUR-PASSWORD]` with your actual database password**
7. Save this string - you'll need it soon!

---

## Part 2: Deploy Backend to Vercel

### Step 3: Deploy Backend

Open your terminal and run:

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/backend
vercel
```

**When prompted:**
- `Set up and deploy?` → **Y** (Yes)
- `Which scope?` → Select your account
- `Link to existing project?` → **N** (No)
- `What's your project's name?` → **sunflower-backend**
- `In which directory is your code located?` → **./** (just press Enter)
- `Want to modify these settings?` → **N** (No)

Vercel will deploy and give you a URL like: `https://sunflower-backend-xxxxx.vercel.app`

**SAVE THIS BACKEND URL!**

### Step 4: Set Backend Environment Variables

Now we need to add environment variables. Run these commands **one by one**:

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/backend

# Database URLs (use your Supabase connection string)
vercel env add DATABASE_URL production
# Paste: postgresql+asyncpg://postgres.xxxxx:[PASSWORD]@xxx.pooler.supabase.com:6543/postgres

vercel env add ALEMBIC_DATABASE_URL production
# Paste: postgresql+psycopg://postgres.xxxxx:[PASSWORD]@xxx.pooler.supabase.com:6543/postgres

# Auth settings
vercel env add JWT_SECRET production
# Paste: -htv3M683XFFYJNb6U5Lxg4WguTllwX_V1b1JQWdPXzdG5sKccYNu9sykPRYp2ox

vercel env add JWT_ALG production
# Paste: HS256

vercel env add ACCESS_TTL_MIN production
# Paste: 15

vercel env add REFRESH_TTL_DAYS production
# Paste: 30

# API settings
vercel env add ENV production
# Paste: production

vercel env add LOG_LEVEL production
# Paste: INFO

# CORS - we'll update this after deploying frontend
vercel env add CORS_ORIGINS production
# Paste: * (for now, we'll fix this later)

# Media settings
vercel env add MEDIA_BACKEND production
# Paste: local

vercel env add MEDIA_ROOT production
# Paste: /tmp/sunflower_media

vercel env add MEDIA_PUBLIC_URL production
# Paste: https://YOUR-BACKEND-URL.vercel.app/media (use your actual backend URL)

vercel env add MEDIA_MAX_BYTES production
# Paste: 5242880

# Admin credentials
vercel env add ADMIN_EMAIL production
# Paste: admin@example.com

vercel env add ADMIN_PASSWORD production
# Paste: keT4zngeY5S-F87hXZiXsQ

vercel env add ADMIN_USERNAME production
# Paste: admin
```

### Step 5: Redeploy Backend with Environment Variables

```bash
vercel --prod
```

Your backend is now live! Test it by visiting:
```
https://YOUR-BACKEND-URL.vercel.app/health
```

You should see: `{"status":"ok","version":"0.1.0","db":"up"}`

---

## Part 3: Deploy Frontend to Vercel

### Step 6: Deploy Frontend

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/frontend
vercel
```

**When prompted:**
- `Set up and deploy?` → **Y** (Yes)
- `Which scope?` → Select your account
- `Link to existing project?` → **N** (No)
- `What's your project's name?` → **sunflower-frontend**
- `In which directory is your code located?` → **./** (just press Enter)
- `Want to modify these settings?` → **N** (No)

Vercel will deploy and give you a URL like: `https://sunflower-frontend-xxxxx.vercel.app`

**SAVE THIS FRONTEND URL!**

### Step 7: Set Frontend Environment Variable

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/frontend

vercel env add VITE_API_BASE_URL production
# Paste: https://YOUR-BACKEND-URL.vercel.app/api/v1 (use your actual backend URL)
```

### Step 8: Redeploy Frontend

```bash
vercel --prod
```

---

## Part 4: Connect Frontend and Backend (Fix CORS)

### Step 9: Update Backend CORS to Allow Frontend

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/backend

# Remove the old CORS setting
vercel env rm CORS_ORIGINS production

# Add the correct one with your frontend URL
vercel env add CORS_ORIGINS production
# Paste: https://YOUR-FRONTEND-URL.vercel.app (use your actual frontend URL)

# Redeploy
vercel --prod
```

---

## Part 5: Test Your Deployment

### Step 10: Test the Connection

1. Open your frontend URL: `https://YOUR-FRONTEND-URL.vercel.app`
2. Open browser DevTools (press F12)
3. Go to the **Network** tab
4. Try to login with:
   - **Username:** `admin`
   - **Password:** `keT4zngeY5S-F87hXZiXsQ`
5. Check:
   - ✅ API requests go to your backend URL
   - ✅ No CORS errors in Console tab
   - ✅ Login succeeds

---

## 🎉 You're Done!

### Your Deployed URLs:
- **Frontend:** https://YOUR-FRONTEND-URL.vercel.app
- **Backend:** https://YOUR-BACKEND-URL.vercel.app
- **Backend Health:** https://YOUR-BACKEND-URL.vercel.app/health
- **Backend API Docs:** https://YOUR-BACKEND-URL.vercel.app/docs

### Admin Credentials:
- **Username:** admin
- **Password:** keT4zngeY5S-F87hXZiXsQ

**⚠️ IMPORTANT: Save these credentials securely!**

---

## Troubleshooting

### Backend shows "db: down" at /health
- Check your DATABASE_URL is correct
- Make sure you replaced [YOUR-PASSWORD] with your actual password
- Verify the connection string uses `+asyncpg` for DATABASE_URL

### Frontend can't connect to backend
- Check VITE_API_BASE_URL is set correctly in frontend
- Check CORS_ORIGINS is set correctly in backend
- Make sure both include `/api/v1` at the end of VITE_API_BASE_URL

### CORS errors
- Update CORS_ORIGINS in backend to match your frontend URL exactly
- Redeploy backend after changing CORS_ORIGINS

### Build errors
- Check Vercel deployment logs
- Make sure Node.js and Python versions are correct in project settings

---

## Quick Commands Reference

```bash
# View environment variables
vercel env ls

# Remove an environment variable
vercel env rm VARIABLE_NAME production

# Redeploy to production
vercel --prod

# View logs
vercel logs --prod

# Link existing project
vercel link
```

---

## Need Help?

If something goes wrong:
1. Check deployment logs: `vercel logs --prod`
2. Check browser console for errors (F12)
3. Verify environment variables: `vercel env ls`
4. Make sure Supabase database is running
