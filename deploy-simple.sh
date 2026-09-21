#!/bin/bash

# SIMPLE VERCEL DEPLOYMENT SCRIPT
# Just answer the prompts!

set -e

echo "🌻 Simple Vercel Deployment"
echo "=========================="
echo ""

# Check login
if ! vercel whoami > /dev/null 2>&1; then
    echo "Logging into Vercel..."
    vercel login
fi

echo "✓ Logged in"
echo ""

# Get database connection
echo "📌 Step 1: Database Connection"
echo ""
echo "Get your Supabase connection string from:"
echo "https://supabase.com/dashboard → Your Project → Settings → Database → Connection pooling"
echo ""
echo "Example: postgresql://postgres.abc:password@aws-0-ap.pooler.supabase.com:6543/postgres"
echo ""
read -p "Paste your connection string: " DB_CONN

if [[ -z "$DB_CONN" ]]; then
    echo "❌ Need database connection string!"
    exit 1
fi

# Generate URLs
DB_ASYNC="postgresql+asyncpg://${DB_CONN#postgresql://}"
DB_SYNC="postgresql+psycopg://${DB_CONN#postgresql://}"

echo ""
echo "✓ Database configured"
echo ""

# Deploy Backend
echo "📌 Step 2: Deploying Backend..."
echo ""
cd backend

# Create .vercelignore
cat > .vercelignore << 'EOF'
.venv
__pycache__
*.pyc
.pytest_cache
.mypy_cache
.ruff_cache
tests/
EOF

# Deploy
echo "Deploying to Vercel..."
BACKEND_URL=$(vercel --prod --yes 2>&1 | tee /dev/tty | grep -o 'https://[^ ]*\.vercel\.app' | head -1)

if [[ -z "$BACKEND_URL" ]]; then
    echo ""
    echo "❌ Deployment failed. Try again or check Vercel dashboard."
    exit 1
fi

echo ""
echo "✓ Backend deployed: $BACKEND_URL"
echo ""

# Add environment variables
echo "Adding environment variables..."

vercel env rm DATABASE_URL production --yes 2>/dev/null || true
echo "$DB_ASYNC" | vercel env add DATABASE_URL production --yes

vercel env rm ALEMBIC_DATABASE_URL production --yes 2>/dev/null || true
echo "$DB_SYNC" | vercel env add ALEMBIC_DATABASE_URL production --yes

vercel env rm JWT_SECRET production --yes 2>/dev/null || true
echo "-htv3M683XFFYJNb6U5Lxg4WguTllwX_V1b1JQWdPXzdG5sKccYNu9sykPRYp2ox" | vercel env add JWT_SECRET production --yes

vercel env rm JWT_ALG production --yes 2>/dev/null || true
echo "HS256" | vercel env add JWT_ALG production --yes

vercel env rm ACCESS_TTL_MIN production --yes 2>/dev/null || true
echo "15" | vercel env add ACCESS_TTL_MIN production --yes

vercel env rm REFRESH_TTL_DAYS production --yes 2>/dev/null || true
echo "30" | vercel env add REFRESH_TTL_DAYS production --yes

vercel env rm ENV production --yes 2>/dev/null || true
echo "production" | vercel env add ENV production --yes

vercel env rm LOG_LEVEL production --yes 2>/dev/null || true
echo "INFO" | vercel env add LOG_LEVEL production --yes

vercel env rm CORS_ORIGINS production --yes 2>/dev/null || true
echo "*" | vercel env add CORS_ORIGINS production --yes

vercel env rm MEDIA_BACKEND production --yes 2>/dev/null || true
echo "local" | vercel env add MEDIA_BACKEND production --yes

vercel env rm MEDIA_ROOT production --yes 2>/dev/null || true
echo "/tmp/sunflower_media" | vercel env add MEDIA_ROOT production --yes

vercel env rm MEDIA_PUBLIC_URL production --yes 2>/dev/null || true
echo "${BACKEND_URL}/media" | vercel env add MEDIA_PUBLIC_URL production --yes

vercel env rm MEDIA_MAX_BYTES production --yes 2>/dev/null || true
echo "5242880" | vercel env add MEDIA_MAX_BYTES production --yes

vercel env rm ADMIN_EMAIL production --yes 2>/dev/null || true
echo "admin@example.com" | vercel env add ADMIN_EMAIL production --yes

vercel env rm ADMIN_PASSWORD production --yes 2>/dev/null || true
echo "keT4zngeY5S-F87hXZiXsQ" | vercel env add ADMIN_PASSWORD production --yes

vercel env rm ADMIN_USERNAME production --yes 2>/dev/null || true
echo "admin" | vercel env add ADMIN_USERNAME production --yes

echo "Redeploying with environment variables..."
vercel --prod --yes > /dev/null 2>&1

echo "✓ Backend configured"
echo ""

# Deploy Frontend
echo "📌 Step 3: Deploying Frontend..."
echo ""
cd ../frontend

# Deploy
echo "Deploying to Vercel..."
FRONTEND_URL=$(vercel --prod --yes 2>&1 | tee /dev/tty | grep -o 'https://[^ ]*\.vercel\.app' | head -1)

if [[ -z "$FRONTEND_URL" ]]; then
    echo ""
    echo "❌ Frontend deployment failed"
    exit 1
fi

echo ""
echo "✓ Frontend deployed: $FRONTEND_URL"
echo ""

# Add frontend env
echo "Configuring frontend..."
vercel env rm VITE_API_BASE_URL production --yes 2>/dev/null || true
echo "${BACKEND_URL}/api/v1" | vercel env add VITE_API_BASE_URL production --yes

echo "Redeploying..."
vercel --prod --yes > /dev/null 2>&1

echo "✓ Frontend configured"
echo ""

# Update CORS
echo "📌 Step 4: Connecting frontend & backend..."
cd ../backend

vercel env rm CORS_ORIGINS production --yes 2>/dev/null || true
echo "$FRONTEND_URL" | vercel env add CORS_ORIGINS production --yes

echo "Redeploying backend..."
vercel --prod --yes > /dev/null 2>&1

echo "✓ Connected"
echo ""

# Done!
echo "=========================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=========================="
echo ""
echo "Your App:"
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL"
echo ""
echo "Login:"
echo "  Username: admin"
echo "  Password: keT4zngeY5S-F87hXZiXsQ"
echo ""
echo "Test backend:"
echo "  curl ${BACKEND_URL}/health"
echo ""
echo "SAVE THESE CREDENTIALS!"
echo ""
