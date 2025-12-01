#!/bin/bash

echo "🔍 Checking production database via API..."
echo ""

echo "1. Testing health endpoint:"
curl -s https://vider-transport-marketplace-production.up.railway.app/health | jq '.'
echo ""

echo "2. Checking vehicle listings:"
curl -s https://vider-transport-marketplace-production.up.railway.app/api/listings/search | jq '.total'
echo ""

echo "3. Testing login with test account:"
curl -s -X POST https://vider-transport-marketplace-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vider.no","password":"password123"}' | jq '.'
echo ""

echo "4. Trying to register a new account:"
curl -s -X POST https://vider-transport-marketplace-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123",
    "firstName":"Test",
    "lastName":"User",
    "phone":"+4712345678",
    "companyName":"Test Company",
    "organizationNumber":"999888777",
    "businessAddress":"Test Street 1",
    "city":"Oslo",
    "postalCode":"0001",
    "fylke":"Oslo",
    "kommune":"Oslo",
    "vatRegistered":true
  }' | jq '.'
