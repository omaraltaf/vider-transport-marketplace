#!/bin/bash

# 🚀 Vercel Frontend Deployment Script
# Deploys the Vider Transport Marketplace frontend to Vercel

echo "🚀 Starting Vercel deployment for Vider Transport Marketplace..."

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found. Please run this script from the project root."
    exit 1
fi

# Navigate to frontend directory
cd frontend

echo "📦 Building frontend for production..."

# Build the frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "🚀 Deploying to Vercel..."

# Deploy to Vercel
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "✅ Your Vider Transport Marketplace frontend is now live on Vercel!"
    echo "✅ Backend is running on Railway"
    echo "✅ Full-stack Norwegian B2B Transport platform is ready!"
    echo ""
    echo "🔗 Platform Admin Access:"
    echo "   Email: admin@vider.no"
    echo "   Password: admin123!"
    echo ""
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi