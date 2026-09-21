# 🌻 Sunflower Expert System - Production Credentials

## 🌐 Live URLs

- **Frontend:** https://sunflower-web-ruddy.vercel.app
- **Backend API:** https://backend-beta-smoky-84.vercel.app
- **API Documentation:** https://backend-beta-smoky-84.vercel.app/docs
- **Health Check:** https://backend-beta-smoky-84.vercel.app/health

---

## 🔐 User Accounts

### Admin Account
Full system access - can manage users, diseases, symptoms, and all settings.

- **Username:** `admin`
- **Password:** `keT4zngeY5S-F87hXZiXsQ`
- **Permissions:** All (19 permissions)

### Expert/Agronomist Account
Can create and manage diseases, symptoms, and view analytics.

- **Username:** `expert`
- **Password:** `expert123`
- **Permissions:** 
  - Create/edit/delete diseases and symptoms
  - Publish/unpublish diseases
  - View all diagnoses
  - Manage feedback
  - View analytics

### Grower Account
Basic user - can run diagnoses and view published diseases.

- **Username:** `grower`
- **Password:** `grower123`
- **Permissions:**
  - Run diagnoses
  - View published diseases
  - View own diagnosis history
  - Submit feedback

---

## 📊 Database Content

### Diseases (5 total)
1. **Downy Mildew** (ប្រេះស្លឹក) - Fungal
2. **Rust** (ច្រែះ) - Fungal
3. **Powdery Mildew** (ម្សៅស) - Fungal
4. **Head Rot / Sclerotinia** (ក្បាលរលួយ) - Fungal
5. **Verticillium Wilt** (ជំងឺរួញ Verticillium) - Fungal

### Symptoms (20 total)
Across 8 categories:
- **Leaf:** Yellow spots, brown lesions, wilting, powdery coating, rust pustules
- **Stem:** Rot, cankers, discoloration
- **Head:** Rot, mold growth, discolored seeds, drooping
- **Whole Plant:** Stunted growth, yellowing, wilting
- **Root:** Rot, galls
- **Seedling:** Damping off, poor emergence
- **Environment:** High humidity

All content is **bilingual** (English/Khmer).

---

## 🗄️ Database Connection

**Provider:** Supabase  
**Connection String:** `postgresql://postgres.oaodclnyhpnnvoxswahx:jommuk-8gimxi-vybjIj@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`

---

## 🚀 Deployment Info

### Backend (Vercel)
- **Project:** `backend`
- **URL:** https://backend-beta-smoky-84.vercel.app
- **Framework:** FastAPI (Python 3.12)
- **Database:** PostgreSQL 16 (Supabase)

### Frontend (Vercel)
- **Project:** `sunflower-web`
- **URL:** https://sunflower-web-ruddy.vercel.app
- **Framework:** React 19 + Vite + TypeScript

---

## 🧪 Testing

### Login Test
```bash
curl -X POST https://backend-beta-smoky-84.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"keT4zngeY5S-F87hXZiXsQ"}'
```

### Health Check
```bash
curl https://backend-beta-smoky-84.vercel.app/health
# Should return: {"status":"ok","version":"0.1.0","db":"up"}
```

---

## 📝 How to Use

### As Admin:
1. Login at https://sunflower-web-ruddy.vercel.app
2. You can:
   - Create/edit/delete diseases and symptoms
   - Manage users
   - View all system data
   - Configure settings

### As Expert/Agronomist:
1. Login with expert account
2. You can:
   - Add new diseases with Khmer translations
   - Create symptoms
   - Configure disease-symptom weights
   - View diagnosis analytics

### As Grower:
1. Login with grower account
2. You can:
   - Run diagnoses for your sunflower crops
   - Select observed symptoms
   - Get disease recommendations
   - View your diagnosis history

---

## 🔒 Security Notes

⚠️ **IMPORTANT:**
- These are production credentials - keep them secure!
- Change the default passwords after first login
- Admin password: `keT4zngeY5S-F87hXZiXsQ`
- Database password: `jommuk-8gimxi-vybjIj`

---

## 📞 Support

If you need to:
- Reset passwords → Use admin account to manage users
- Add more users → Login as admin → User Management
- Modify diseases/symptoms → Login as expert or admin
- Run diagnostics → Any user can access this feature

---

**System Status:** ✅ **FULLY OPERATIONAL**

Last Updated: September 21, 2026
