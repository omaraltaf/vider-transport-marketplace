#!/bin/bash

# Vercel Deployment Script for Vider Transport Marketplace
# This script handles the deployment with correct configuration

echo "🚀 Starting Vercel deployment..."

# Clean previous deployment config
rm -rf .vercel

# Build the project
echo "📦 Building project..."
npm run build

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found after build"
    exit 1
fi

echo "✅ Build successful - dist folder created"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
npx vercel --prod --yes

echo "✅ Deployment complete!"
echo "🔗 Your app should be available at: ${VITE_FRONTEND_URL:-https://vider-transport-marketplace.vercel.app}"
echo ""
echo "📋 Next steps:"
echo "1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Test Financial Management components"
echo "3. Verify no 'token not defined' errors"