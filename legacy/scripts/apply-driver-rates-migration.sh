#!/bin/bash

# Apply driver rates migration to production database
# This script adds the new driver rate columns and updates existing data

echo "🔄 Applying driver rates migration to production database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "Please set it to your production database URL"
    exit 1
fi

# Apply the migration
psql "$DATABASE_URL" -f scripts/add-driver-rates-migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "The following changes were made:"
    echo "  - Added withDriverHourlyRate column to VehicleListing"
    echo "  - Added withDriverDailyRate column to VehicleListing"
    echo "  - Migrated existing withDriverCost data"
    echo "  - Updated seed data with proper hourly and daily rates"
else
    echo "❌ Migration failed!"
    exit 1
fi
