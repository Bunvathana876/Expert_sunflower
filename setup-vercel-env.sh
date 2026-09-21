#!/bin/bash

# Vercel Environment Variables Setup Script
# Run this script to configure your Vercel deployments

set -e

echo "============================================"
echo "🌻 Sunflower Expert System - Vercel Setup"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Login to Vercel
echo -e "${BLUE}Step 1: Login to Vercel${NC}"
echo "Please login when prompted..."
echo ""
vercel login

echo ""
echo -e "${GREEN}✓ Logged in successfully${NC}"
echo ""

# Step 2: Link Frontend Project
echo -e "${BLUE}Step 2: Link Frontend Project${NC}"
echo "When prompted, select:"
echo "  - Your Vercel account"
echo "  - Project: frontend-bay-eight-66 (or the one with URL: frontend-bay-eight-66.vercel.app)"
echo ""
cd frontend
vercel link

echo ""
echo -e "${GREEN}✓ Frontend linked${NC}"
echo ""

# Step 3: Link Backend Project
echo -e "${BLUE}Step 3: Link Backend Project${NC}"
echo "When prompted, select:"
echo "  - Your Vercel account"
echo "  - Project: expert-sunflower-deploy (or the one with URL: expert-sunflower-deploy.vercel.app)"
echo ""
cd ../backend
vercel link

echo ""
echo -e "${GREEN}✓ Backend linked${NC}"
echo ""

# Step 4: Set Frontend Environment Variables
echo -e "${BLUE}Step 4: Set Frontend Environment Variable${NC}"
cd ../frontend
echo ""
echo "Setting VITE_API_BASE_URL..."
echo "https://expert-sunflower-deploy.vercel.app/api/v1" | vercel env add VITE_API_BASE_URL production

echo ""
echo -e "${GREEN}✓ Frontend environment variable set${NC}"
echo ""

# Step 5: Set Backend Environment Variables
echo -e "${BLUE}Step 5: Set Backend Environment Variables${NC}"
cd ../backend

echo ""
echo "Setting CORS_ORIGINS..."
echo "https://frontend-bay-eight-66.vercel.app" | vercel env add CORS_ORIGINS production

echo ""
echo "Setting JWT_SECRET..."
echo "-htv3M683XFFYJNb6U5Lxg4WguTllwX_V1b1JQWdPXzdG5sKccYNu9sykPRYp2ox" | vercel env add JWT_SECRET production

echo ""
echo "Setting JWT_ALG..."
echo "HS256" | vercel env add JWT_ALG production

echo ""
echo "Setting ACCESS_TTL_MIN..."
echo "15" | vercel env add ACCESS_TTL_MIN production

echo ""
echo "Setting REFRESH_TTL_DAYS..."
echo "30" | vercel env add REFRESH_TTL_DAYS production

echo ""
echo "Setting ENV..."
echo "production" | vercel env add ENV production

echo ""
echo "Setting LOG_LEVEL..."
echo "INFO" | vercel env add LOG_LEVEL production

echo ""
echo "Setting MEDIA_BACKEND..."
echo "local" | vercel env add MEDIA_BACKEND production

echo ""
echo "Setting MEDIA_ROOT..."
echo "/tmp/sunflower_media" | vercel env add MEDIA_ROOT production

echo ""
echo "Setting MEDIA_PUBLIC_URL..."
echo "https://expert-sunflower-deploy.vercel.app/media" | vercel env add MEDIA_PUBLIC_URL production

echo ""
echo "Setting MEDIA_MAX_BYTES..."
echo "5242880" | vercel env add MEDIA_MAX_BYTES production

echo ""
echo "Setting ADMIN_EMAIL..."
echo "admin@example.com" | vercel env add ADMIN_EMAIL production

echo ""
echo "Setting ADMIN_PASSWORD..."
echo "keT4zngeY5S-F87hXZiXsQ" | vercel env add ADMIN_PASSWORD production

echo ""
echo "Setting ADMIN_USERNAME..."
echo "admin" | vercel env add ADMIN_USERNAME production

echo ""
echo -e "${GREEN}✓ Backend environment variables set${NC}"
echo ""

# Step 6: Database Warning
echo -e "${YELLOW}⚠️  IMPORTANT: Database Setup Required${NC}"
echo ""
echo "You still need to set up a PostgreSQL database and add:"
echo "  - DATABASE_URL"
echo "  - ALEMBIC_DATABASE_URL"
echo ""
echo "I recommend using Supabase (free): https://supabase.com"
echo ""
echo "After setting up the database, run:"
echo "  cd backend"
echo "  echo 'YOUR_DATABASE_URL' | vercel env add DATABASE_URL production"
echo "  echo 'YOUR_ALEMBIC_URL' | vercel env add ALEMBIC_DATABASE_URL production"
echo ""

# Step 7: Redeploy
echo -e "${BLUE}Step 6: Redeploy Projects${NC}"
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
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Your admin credentials:"
echo "  Username: admin"
echo "  Password: keT4zngeY5S-F87hXZiXsQ"
echo ""
echo -e "${YELLOW}⚠️  SAVE THESE CREDENTIALS SECURELY!${NC}"
echo ""
echo "Frontend URL: https://frontend-bay-eight-66.vercel.app"
echo "Backend URL: https://expert-sunflower-deploy.vercel.app"
echo ""
echo "Next steps:"
echo "1. Set up PostgreSQL database (Supabase recommended)"
echo "2. Add DATABASE_URL and ALEMBIC_DATABASE_URL"
echo "3. Test the connection at your frontend URL"
echo ""
