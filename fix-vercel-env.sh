#!/bin/bash

# Fix Vercel Environment Variables
# This script removes incorrect variables and sets the correct ones

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "============================================"
echo "🔧 Fixing Vercel Environment Variables"
echo "============================================"
echo ""

# Step 1: Clean up frontend (remove backend variables)
echo -e "${BLUE}Step 1: Cleaning up frontend variables${NC}"
cd frontend

echo "Removing backend-specific variables from frontend..."
FRONTEND_BACKEND_VARS=(
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "POSTGRES_DB"
  "DATABASE_URL"
  "ALEMBIC_DATABASE_URL"
  "JWT_SECRET"
  "JWT_ALG"
  "ACCESS_TTL_MIN"
  "REFRESH_TTL_DAYS"
  "ENV"
  "LOG_LEVEL"
  "CORS_ORIGINS"
  "MEDIA_BACKEND"
  "MEDIA_ROOT"
  "MEDIA_PUBLIC_URL"
  "MEDIA_MAX_BYTES"
  "ADMIN_EMAIL"
  "ADMIN_PASSWORD"
  "ADMIN_USERNAME"
)

for var in "${FRONTEND_BACKEND_VARS[@]}"; do
  echo "  Removing $var..."
  vercel env rm "$var" production --yes 2>/dev/null || true
done

echo -e "${GREEN}✓ Frontend cleaned${NC}"
echo ""

# Step 2: Set correct frontend variable
echo -e "${BLUE}Step 2: Setting frontend API URL${NC}"
echo "Removing old VITE_API_BASE_URL..."
vercel env rm VITE_API_BASE_URL production --yes 2>/dev/null || true

echo "Setting VITE_API_BASE_URL..."
echo "https://expert-sunflower-deploy.vercel.app/api/v1" | vercel env add VITE_API_BASE_URL production

echo -e "${GREEN}✓ Frontend variable set${NC}"
echo ""

# Step 3: Update backend CORS
echo -e "${BLUE}Step 3: Updating backend CORS${NC}"
cd ../backend

echo "Removing old CORS_ORIGINS..."
vercel env rm CORS_ORIGINS production --yes 2>/dev/null || true

echo "Setting CORS_ORIGINS..."
echo "https://frontend-bay-eight-66.vercel.app" | vercel env add CORS_ORIGINS production

# Step 4: Set/update other backend variables
echo ""
echo -e "${BLUE}Step 4: Updating backend variables${NC}"

# Function to update or add env var
update_env() {
  local var_name=$1
  local var_value=$2
  echo "Setting $var_name..."
  vercel env rm "$var_name" production --yes 2>/dev/null || true
  echo "$var_value" | vercel env add "$var_name" production
}

update_env "JWT_SECRET" "-htv3M683XFFYJNb6U5Lxg4WguTllwX_V1b1JQWdPXzdG5sKccYNu9sykPRYp2ox"
update_env "JWT_ALG" "HS256"
update_env "ACCESS_TTL_MIN" "15"
update_env "REFRESH_TTL_DAYS" "30"
update_env "ENV" "production"
update_env "LOG_LEVEL" "INFO"
update_env "MEDIA_BACKEND" "local"
update_env "MEDIA_ROOT" "/tmp/sunflower_media"
update_env "MEDIA_PUBLIC_URL" "https://expert-sunflower-deploy.vercel.app/media"
update_env "MEDIA_MAX_BYTES" "5242880"
update_env "ADMIN_EMAIL" "admin@example.com"
update_env "ADMIN_PASSWORD" "keT4zngeY5S-F87hXZiXsQ"
update_env "ADMIN_USERNAME" "admin"

echo -e "${GREEN}✓ Backend variables updated${NC}"
echo ""

# Step 5: Redeploy
echo -e "${BLUE}Step 5: Redeploying projects${NC}"
echo ""
echo "Redeploying frontend..."
cd ../frontend
vercel --prod

echo ""
echo "Redeploying backend..."
cd ../backend
vercel --prod

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✓ Fix Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Database Setup${NC}"
echo ""
echo "Your backend still needs a database. Set up Supabase:"
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Create new project (wait 2-3 min)"
echo "3. Get connection string from Settings → Database"
echo "4. Run these commands:"
echo ""
echo "  cd backend"
echo "  vercel env add DATABASE_URL production"
echo "  # Paste: postgresql+asyncpg://YOUR_CONNECTION_STRING"
echo ""
echo "  vercel env add ALEMBIC_DATABASE_URL production"
echo "  # Paste: postgresql+psycopg://YOUR_CONNECTION_STRING"
echo ""
echo "  vercel --prod"
echo ""
echo -e "${GREEN}Your admin credentials:${NC}"
echo "  Username: admin"
echo "  Password: keT4zngeY5S-F87hXZiXsQ"
echo ""
echo "Frontend: https://frontend-bay-eight-66.vercel.app"
echo "Backend: https://expert-sunflower-deploy.vercel.app"
echo ""
