#!/bin/bash
cd /Users/menghokyongben/Downloads/files\ 2/sunflower-expert/frontend
vercel env rm VITE_API_BASE_URL production --yes 2>/dev/null || true
printf "https://backend-beta-smoky-84.vercel.app/api/v1" | vercel env add VITE_API_BASE_URL production --yes
vercel --prod --yes
echo "Done! Frontend redeployed with API URL"
