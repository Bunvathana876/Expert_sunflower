#!/bin/bash

# Seed Production Database
# This runs migrations and initial data seed

set -e

echo "🌱 Seeding Production Database"
echo ""

cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/backend

# Activate virtual environment
source .venv/bin/activate

# Use transaction mode connection (port 6543) with prepared statement workaround
export DATABASE_URL="postgresql+asyncpg://postgres.oaodclnyhpnnvoxswahx:jommuk-8gimxi-vybjIj@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?prepared_statement_cache_size=0"
export ALEMBIC_DATABASE_URL="postgresql+psycopg://postgres.oaodclnyhpnnvoxswahx:jommuk-8gimxi-vybjIj@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
export ADMIN_PASSWORD="keT4zngeY5S-F87hXZiXsQ"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_USERNAME="admin"

echo "✓ Environment configured"
echo ""

echo "Running database seed..."
python -m scripts.seed

echo ""
echo "✓ Database seeded!"
echo ""
echo "Admin credentials:"
echo "  Username: admin"
echo "  Password: keT4zngeY5S-F87hXZiXsQ"
echo ""
echo "Try logging in at: https://sunflower-web-ruddy.vercel.app"
echo ""
