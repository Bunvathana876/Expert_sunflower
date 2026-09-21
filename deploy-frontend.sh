#!/bin/bash

# Deploy Frontend Only
set -e

echo "🎨 Deploying Frontend..."
echo ""

BACKEND_URL="https://backend-i91pmexxq-yongbeenms-projects.vercel.app"

cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/frontend

echo "Deploying to Vercel..."
FRONTEND_URL=$(vercel --prod --yes 2>&1 | tee /dev/tty | grep -o 'https://[^ ]*\.vercel\.app' | head -1)

if [[ -z "$FRONTEND_URL" ]]; then
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✓ Frontend deployed: $FRONTEND_URL"
echo ""

# Add env var
echo "Configuring API URL..."
vercel env rm VITE_API_BASE_URL production --yes 2>/dev/null || true
echo "${BACKEND_URL}/api/v1" | vercel env add VITE_API_BASE_URL production --yes

echo "Redeploying with configuration..."
vercel --prod --yes > /dev/null 2>&1

echo "✓ Frontend configured"
echo ""

# Update backend CORS
echo "Updating backend CORS..."
cd ../backend
vercel env rm CORS_ORIGINS production --yes 2>/dev/null || true
echo "$FRONTEND_URL" | vercel env add CORS_ORIGINS production --yes

echo "Redeploying backend..."
vercel --prod --yes > /dev/null 2>&1

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
echo "Open your app: $FRONTEND_URL"
echo ""
