#!/bin/bash

# Vider Database Setup Script
# This script helps set up the PostgreSQL database for development

set -e

echo "🚀 Vider Database Setup"
echo "======================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and configure your database settings."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📋 Configuration:"
echo "  Database URL: ${DATABASE_URL}"
echo ""

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to PostgreSQL!"
    echo ""
    echo "Please ensure:"
    echo "  1. PostgreSQL is running"
    echo "  2. DATABASE_URL in .env is correct"
    echo "  3. Database user has necessary permissions"
    echo ""
    echo "Example DATABASE_URL format:"
    echo "  postgresql://username:password@localhost:5432/database_name"
    exit 1
fi

echo "✅ PostgreSQL connection successful!"
echo ""

# Run migrations
echo "📦 Running database migrations..."
npm run migrate

echo ""
echo "🌱 Seeding database with test data..."
npm run db:seed

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Test accounts created:"
echo "  Platform Admin: admin@vider.no / password123"
echo "  Company Admin (Oslo): admin@oslotransport.no / password123"
echo "  Company Admin (Bergen): admin@bergenlogistics.no / password123"
echo "  Company User (Trondheim): user@trondheimfleet.no / password123"
echo ""
echo "You can now start the development server with: npm run dev"
