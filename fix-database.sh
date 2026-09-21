#!/bin/bash

echo "🔧 Fix Database Connection"
echo ""
echo "The backend shows 'db: down' because the database password is wrong."
echo ""
echo "Get your Supabase connection string from:"
echo "https://supabase.com/dashboard → Your Project → Settings → Database → Connection pooling"
echo ""
echo "Make sure to REPLACE [YOUR-PASSWORD] with your actual password!"
echo ""
read -p "Paste your FULL connection string (with real password): " DB_CONN

if [[ -z "$DB_CONN" ]]; then
    echo "❌ Need connection string"
    exit 1
fi

# Generate URLs
DB_ASYNC="postgresql+asyncpg://${DB_CONN#postgresql://}"
DB_SYNC="postgresql+psycopg://${DB_CONN#postgresql://}"

cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/backend

echo ""
echo "Updating DATABASE_URL..."
vercel env rm DATABASE_URL production --yes
echo "$DB_ASYNC" | vercel env add DATABASE_URL production --yes

echo ""
echo "Updating ALEMBIC_DATABASE_URL..."
vercel env rm ALEMBIC_DATABASE_URL production --yes
echo "$DB_SYNC" | vercel env add ALEMBIC_DATABASE_URL production --yes

echo ""
echo "Redeploying backend..."
vercel --prod --yes > /dev/null 2>&1

echo ""
echo "✓ Done! Testing connection..."
sleep 5
curl -s https://backend-beta-smoky-84.vercel.app/health | jq .

echo ""
echo "If you see 'db: up', it's working!"
echo ""
