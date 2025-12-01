#!/bin/bash

# This script seeds the Railway production database
# You need to set the DATABASE_URL environment variable to your Railway database

if [ -z "$RAILWAY_DATABASE_URL" ]; then
  echo "❌ Error: RAILWAY_DATABASE_URL environment variable is not set"
  echo ""
  echo "To get your Railway database URL:"
  echo "1. Go to https://railway.app/project/your-project"
  echo "2. Click on your Postgres service"
  echo "3. Go to Variables tab"
  echo "4. Copy the DATABASE_URL value"
  echo ""
  echo "Then run:"
  echo "export RAILWAY_DATABASE_URL='your-database-url'"
  echo "./scripts/seed-production.sh"
  exit 1
fi

echo "🌱 Seeding Railway production database..."
echo ""

DATABASE_URL="$RAILWAY_DATABASE_URL" npx tsx src/db/seed.ts

echo ""
echo "✅ Done!"
