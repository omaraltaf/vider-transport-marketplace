#!/bin/bash

# Quick script to check Railway deployment status
echo "🔍 Checking Railway Deployment Status..."
echo ""

# Test API endpoint
echo "Testing API endpoint..."
curl -s --max-time 5 https://vider-transport-marketplace-production.up.railway.app/api || echo "❌ API not responding"

echo ""
echo ""
echo "📋 Recent Git Commits:"
git log --oneline -5

echo ""
echo "🔧 Current Branch:"
git branch --show-current

echo ""
echo "📦 Latest Push:"
git log origin/production --oneline -1
