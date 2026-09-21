#!/bin/bash

echo "🔍 Checking admin credentials from Vercel..."
echo ""
cd backend

echo "Admin Email:"
vercel env pull .env.temp 2>/dev/null
grep "ADMIN_EMAIL" .env.temp | cut -d'=' -f2
echo ""

echo "Admin Username:"
grep "ADMIN_USERNAME" .env.temp | cut -d'=' -f2
echo ""

echo "Admin Password:"
grep "ADMIN_PASSWORD" .env.temp | cut -d'=' -f2
echo ""

rm -f .env.temp
echo "✅ Done! Use these credentials to login at:"
echo "   https://sunflower-web-ruddy.vercel.app/login"
