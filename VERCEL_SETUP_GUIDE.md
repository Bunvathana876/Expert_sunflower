# 🚀 Vercel CLI Setup Guide

## Quick Start (Automated)

Run this single command to set up everything automatically:

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert
./setup-vercel-env.sh
```

The script will:
1. Login to Vercel
2. Link your projects
3. Set all environment variables
4. Redeploy both frontend and backend

---

## Manual Setup (Step-by-Step)

If you prefer to do it manually or if the script fails, follow these steps:

### Step 1: Login to Vercel

```bash
vercel login
```

Follow the prompts to login with your email or GitHub.

---

### Step 2: Setup Frontend

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/frontend

# Link to your Vercel project
vercel link
# Select: Your account → Project "frontend-bay-eight-66"

# Add environment variable
vercel env add VITE_API_BASE_URL production
# When prompted, paste: https://expert-sunflower-deploy.vercel.app/api/v1

# Redeploy
vercel --prod
```

---

### Step 3: Setup Backend

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/backend

# Link to your Vercel project
vercel link
# Select: Your account → Project "expert-sunflower-deploy"

# Add all environment variables
vercel env add CORS_ORIGINS production
# Paste: https://frontend-bay-eight-66.vercel.app

vercel env add JWT_SECRET production
# Paste: -htv3M683XFFYJNb6U5Lxg4WguTllwX_V1b1JQWdPXzdG5sKccYNu9sykPRYp2ox

vercel env add JWT_ALG production
# Paste: HS256

vercel env add ACCESS_TTL_MIN production
# Paste: 15

vercel env add REFRESH_TTL_DAYS production
# Paste: 30

vercel env add ENV production
# Paste: production

vercel env add LOG_LEVEL production
# Paste: INFO

vercel env add MEDIA_BACKEND production
# Paste: local

vercel env add MEDIA_ROOT production
# Paste: /tmp/sunflower_media

vercel env add MEDIA_PUBLIC_URL production
# Paste: https://expert-sunflower-deploy.vercel.app/media

vercel env add MEDIA_MAX_BYTES production
# Paste: 5242880

vercel env add ADMIN_EMAIL production
# Paste: admin@example.com

vercel env add ADMIN_PASSWORD production
# Paste: keT4zngeY5S-F87hXZiXsQ

vercel env add ADMIN_USERNAME production
# Paste: admin

# Redeploy
vercel --prod
```

---

## Step 4: Setup Database (REQUIRED)

Your backend won't work without a database. Use Supabase (recommended):

### Supabase Setup:

1. Go to https://supabase.com/dashboard
2. Create new project (wait 2-3 minutes)
3. Go to Settings → Database → Connection string
4. Copy the **connection pooling** string
5. Add to Vercel:

```bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/backend

# For DATABASE_URL - use +asyncpg
vercel env add DATABASE_URL production
# Paste: postgresql+asyncpg://postgres.xxx:[PASSWORD]@xxx.pooler.supabase.com:6543/postgres

# For ALEMBIC_DATABASE_URL - use +psycopg
vercel env add ALEMBIC_DATABASE_URL production
# Paste: postgresql+psycopg://postgres.xxx:[PASSWORD]@xxx.pooler.supabase.com:6543/postgres

# Redeploy again
vercel --prod
```

---

## 🎉 After Setup

### Your URLs:
- **Frontend:** https://frontend-bay-eight-66.vercel.app
- **Backend:** https://expert-sunflower-deploy.vercel.app

### Admin Credentials:
- **Username:** admin
- **Password:** keT4zngeY5S-F87hXZiXsQ

**⚠️ SAVE THESE CREDENTIALS!**

---

## Testing the Connection

1. Open: https://frontend-bay-eight-66.vercel.app
2. Open browser DevTools (F12) → Network tab
3. Try to login with admin credentials
4. Check:
   - API requests go to `https://expert-sunflower-deploy.vercel.app/api/v1`
   - No CORS errors in console
   - Login works

---

## Troubleshooting

### Frontend can't connect to backend:
```bash
# Check frontend env var
cd frontend
vercel env ls

# Should show: VITE_API_BASE_URL = https://expert-sunflower-deploy.vercel.app/api/v1
```

### CORS errors:
```bash
# Check backend CORS setting
cd backend
vercel env ls

# Should show: CORS_ORIGINS = https://frontend-bay-eight-66.vercel.app
```

### Backend errors:
```bash
# Check logs
vercel logs expert-sunflower-deploy --prod
```

### Database connection failed:
- Make sure DATABASE_URL and ALEMBIC_DATABASE_URL are set
- Verify the connection strings are correct
- Check Supabase project is active

---

## Quick Commands Reference

```bash
# View environment variables
vercel env ls

# Pull environment variables to local
vercel env pull

# Remove an environment variable
vercel env rm VARIABLE_NAME production

# View deployment logs
vercel logs --prod

# Redeploy
vercel --prod
```

---

## Need Help?

If something doesn't work:
1. Check Vercel deployment logs: `vercel logs --prod`
2. Check browser console for errors (F12)
3. Verify all environment variables: `vercel env ls`
4. Make sure database is set up and connection string is correct
