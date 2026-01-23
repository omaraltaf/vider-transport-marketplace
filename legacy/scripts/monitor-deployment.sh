#!/bin/bash

echo "🔍 Monitoring Railway Deployment..."
echo "Checking every 15 seconds for 3 minutes..."
echo ""

API_URL="https://vider-transport-marketplace-production.up.railway.app/api"
MAX_ATTEMPTS=12
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "[$ATTEMPT/$MAX_ATTEMPTS] Testing API..."
    
    RESPONSE=$(curl -s --max-time 10 "$API_URL" 2>&1)
    
    if echo "$RESPONSE" | grep -q "deploymentVersion"; then
        echo "✅ SUCCESS! API is responding!"
        echo ""
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        exit 0
    elif echo "$RESPONSE" | grep -q "502"; then
        echo "⚠️  502 Error - Application not ready yet"
    elif echo "$RESPONSE" | grep -q "503"; then
        echo "⚠️  503 Error - Service unavailable"
    else
        echo "❌ No response or error"
    fi
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "   Waiting 15 seconds..."
        sleep 15
    fi
done

echo ""
echo "❌ Deployment did not complete within 3 minutes"
echo "Check Railway dashboard for build logs"
