#!/bin/bash

# Add Database Environment Variables to Vercel Backend
# Run this AFTER setting up Supabase

echo "============================================"
echo "📦 Adding Database to Vercel Backend"
echo "============================================"
echo ""
echo "Please have your Supabase connection string ready."
echo "It should look like: postgresql://postgres.xxxxx:password@xxx.pooler.supabase.com:6543/postgres"
echo ""

cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/backend

echo "Adding DATABASE_URL..."
echo ""
echo "Paste your Supabase connection string, but with +asyncpg added:"
echo "Example: postgresql+asyncpg://postgres.xxxxx:password@xxx.pooler.supabase.com:6543/postgres"
vercel env add DATABASE_URL production

echo ""
echo "Adding ALEMBIC_DATABASE_URL..."
echo ""
echo "Paste the same connection string, but with +psycopg instead:"
echo "Example: postgresql+psycopg://postgres.xxxxx:password@xxx.pooler.supabase.com:6543/postgres"
vercel env add ALEMBIC_DATABASE_URL production

echo ""
echo "✓ Database variables added!"
echo ""
echo "Now redeploying backend..."
vercel --prod

echo ""
echo "✓ Done! Your backend should now connect to the database."
echo ""
