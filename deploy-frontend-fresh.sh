#!/bin/bash

# Deploy Frontend Fresh (New Project)
set -e

echo "🎨 Deploying Frontend (Fresh)..."
echo ""

BACKEND_URL="https://backend-i91pmexxq-yongbeenms-projects.vercel.app"

cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/frontend

# Remove any existing link
rm -rf .vercel

echo "Creating new Vercel project..."
echo ""
echo "When prompted:"
echo "  - Link to existing project? → N (No)"
echo "  - Project name? → sunflower-app"
echo ""

# Deploy with manual prompts
vercel --prod

echo ""
read -p "What is your frontend URL? (e.g., https://sunflower-app-xxx.vercel.app): " FRONTEND_URL

if [[ -z "$FRONTEND_URL" ]]; then
    echo "❌ Need frontend URL"
    exit 1
fi

echo ""
echo "Configuring API URL..."
vercel env rm VITE_API_BASE_URL production --yes 2>/dev/null || true
echo "${BACKEND_URL}/api/v1" | vercel env add VITE_API_BASE_URL production --yes

echo "Redeploying..."
vercel --prod --yes

echo "✓ Frontend configured"
echo ""

# Update backend CORS
echo "Updating backend CORS..."
cd ../backend
vercel env rm CORS_ORIGINS production --yes 2>/dev/null || true
echo "$FRONTEND_URL" | vercel env add CORS_ORIGINS production --yes

echo "Redeploying backend..."
vercel --prod --yes

echo ""
echo "=========================="
echo "🎉 DONE!"
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
