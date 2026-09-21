#!/bin/bash

# Complete Vercel Deployment Script
# This script deploys the Sunflower Expert System to Vercel

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "============================================"
echo "🌻 Sunflower Expert System Deployment"
echo "============================================"
echo ""

# Check if logged in
if ! vercel whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ Not logged in to Vercel${NC}"
    echo "Please run: vercel login"
    exit 1
fi

echo -e "${GREEN}✓ Logged in to Vercel${NC}"
echo ""

# Step 1: Database Info
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Database Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "Before we deploy, you need a PostgreSQL database."
echo ""
echo "📌 If you DON'T have a Supabase database yet:"
echo "   1. Go to: https://supabase.com/dashboard"
echo "   2. Create new project (takes ~2 minutes)"
echo "   3. Get connection string from Settings → Database → Connection pooling"
echo ""
echo "📌 You'll need this format:"
echo "   postgresql://postgres.xxxxx:[PASSWORD]@xxx.pooler.supabase.com:6543/postgres"
echo ""
read -p "Do you have your Supabase connection string ready? (y/n): " has_db
echo ""

if [[ "$has_db" != "y" && "$has_db" != "Y" ]]; then
    echo -e "${YELLOW}⚠️  Please set up Supabase first, then run this script again.${NC}"
    echo "Guide: https://supabase.com/docs/guides/getting-started"
    exit 0
fi

# Get database connection string
echo "Enter your Supabase connection string:"
echo "(Format: postgresql://postgres.xxxxx:password@xxx.pooler.supabase.com:6543/postgres)"
read -p "Connection string: " db_conn_string

if [[ -z "$db_conn_string" ]]; then
    echo -e "${RED}❌ Database connection string is required${NC}"
    exit 1
fi

# Create database URLs
DATABASE_URL="postgresql+asyncpg://${db_conn_string#postgresql://}"
ALEMBIC_DATABASE_URL="postgresql+psycopg://${db_conn_string#postgresql://}"

echo -e "${GREEN}✓ Database connection string saved${NC}"
echo ""

# Step 2: Deploy Backend
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: Deploy Backend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
cd backend

echo "Deploying backend to Vercel..."
BACKEND_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^ ]*' | head -1)

if [[ -z "$BACKEND_URL" ]]; then
    echo -e "${RED}❌ Backend deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Backend deployed!${NC}"
echo "   URL: $BACKEND_URL"
echo ""

# Step 3: Set Backend Environment Variables
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: Configure Backend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

echo "Setting environment variables..."

# Function to add env var silently
add_env() {
    local var_name=$1
    local var_value=$2
    echo "$var_value" | vercel env add "$var_name" production --yes > /dev/null 2>&1 || \
    (vercel env rm "$var_name" production --yes > /dev/null 2>&1; echo "$var_value" | vercel env add "$var_name" production --yes > /dev/null 2>&1)
    echo "  ✓ $var_name"
}

add_env "DATABASE_URL" "$DATABASE_URL"
add_env "ALEMBIC_DATABASE_URL" "$ALEMBIC_DATABASE_URL"
add_env "JWT_SECRET" "-htv3M683XFFYJNb6U5Lxg4WguTllwX_V1b1JQWdPXzdG5sKccYNu9sykPRYp2ox"
add_env "JWT_ALG" "HS256"
add_env "ACCESS_TTL_MIN" "15"
add_env "REFRESH_TTL_DAYS" "30"
add_env "ENV" "production"
add_env "LOG_LEVEL" "INFO"
add_env "CORS_ORIGINS" "*"
add_env "MEDIA_BACKEND" "local"
add_env "MEDIA_ROOT" "/tmp/sunflower_media"
add_env "MEDIA_PUBLIC_URL" "${BACKEND_URL}/media"
add_env "MEDIA_MAX_BYTES" "5242880"
add_env "ADMIN_EMAIL" "admin@example.com"
add_env "ADMIN_PASSWORD" "keT4zngeY5S-F87hXZiXsQ"
add_env "ADMIN_USERNAME" "admin"

echo ""
echo "Redeploying backend with environment variables..."
vercel --prod --yes > /dev/null 2>&1

echo -e "${GREEN}✓ Backend configured and redeployed${NC}"
echo ""

# Step 4: Deploy Frontend
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: Deploy Frontend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
cd ../frontend

echo "Deploying frontend to Vercel..."
FRONTEND_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^ ]*' | head -1)

if [[ -z "$FRONTEND_URL" ]]; then
    echo -e "${RED}❌ Frontend deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Frontend deployed!${NC}"
echo "   URL: $FRONTEND_URL"
echo ""

# Step 5: Configure Frontend
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 5: Configure Frontend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

echo "Setting frontend API URL..."
add_env "VITE_API_BASE_URL" "${BACKEND_URL}/api/v1"

echo ""
echo "Redeploying frontend with environment variables..."
vercel --prod --yes > /dev/null 2>&1

echo -e "${GREEN}✓ Frontend configured and redeployed${NC}"
echo ""

# Step 6: Update Backend CORS
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Step 6: Connect Frontend & Backend${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
cd ../backend

echo "Updating CORS to allow frontend..."
vercel env rm CORS_ORIGINS production --yes > /dev/null 2>&1
add_env "CORS_ORIGINS" "$FRONTEND_URL"

echo ""
echo "Redeploying backend with CORS update..."
vercel --prod --yes > /dev/null 2>&1

echo -e "${GREEN}✓ CORS configured${NC}"
echo ""

# Success!
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Your Sunflower Expert System is now live!"
echo ""
echo "📱 Frontend URL:"
echo "   $FRONTEND_URL"
echo ""
echo "🔧 Backend URL:"
echo "   $BACKEND_URL"
echo ""
echo "🏥 Health Check:"
echo "   ${BACKEND_URL}/health"
echo ""
echo "📚 API Docs:"
echo "   ${BACKEND_URL}/docs"
echo ""
echo "🔐 Admin Login:"
echo "   Username: admin"
echo "   Password: keT4zngeY5S-F87hXZiXsQ"
echo ""
echo -e "${YELLOW}⚠️  SAVE THESE CREDENTIALS SECURELY!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit $FRONTEND_URL"
echo "2. Login with admin credentials"
echo "3. Start adding diseases and symptoms!"
echo ""
echo "Test the backend health:"
echo "   curl ${BACKEND_URL}/health"
echo ""
