#!/bin/bash

# Railway Deployment Test Script
# Replace YOUR_RAILWAY_URL with your actual Railway URL

RAILWAY_URL="https://your-app-name.railway.app"

echo "🚀 Testing Railway Deployment..."
echo "URL: $RAILWAY_URL"
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -f "$RAILWAY_URL/health" || echo "❌ Health check failed"
echo ""

# Test 2: API Root
echo "2. Testing API Root..."
curl -f "$RAILWAY_URL/api" || echo "❌ API root failed"
echo ""

# Test 3: Authentication Endpoint
echo "3. Testing Authentication Endpoint..."
curl -X POST "$RAILWAY_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vider.no","password":"admin123!"}' || echo "❌ Auth test failed"
echo ""

# Test 4: Search Endpoint
echo "4. Testing Search Endpoint..."
curl -f "$RAILWAY_URL/api/listings/vehicles/search?location=Oslo" || echo "❌ Search test failed"
echo ""

echo "✅ Deployment tests completed!"
echo ""
echo "🔑 Test with Platform Admin Account:"
echo "   Email: admin@vider.no"
echo "   Password: admin123!"
echo ""
echo "📱 Access your application at: $RAILWAY_URL"