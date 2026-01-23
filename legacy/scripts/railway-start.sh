#!/bin/sh

# Railway startup script with proper error handling
set -e

echo "🚀 Starting Railway deployment..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Check if database has data, if not seed it
echo "🌱 Checking if database needs seeding..."
PLATFORM_CONFIG_COUNT=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM platform_configs;" 2>/dev/null | tail -n 1 || echo "0")

if [ "$PLATFORM_CONFIG_COUNT" = "0" ]; then
    echo "🌱 Database is empty, seeding with production data..."
    npm run seed
else
    echo "✅ Database already has data, skipping seed"
fi

# Start the application
echo "🚀 Starting application..."
exec node dist/index.js