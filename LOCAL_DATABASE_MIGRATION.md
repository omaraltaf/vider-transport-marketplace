# Local Database Migration Instructions

## Issue
The local database user doesn't have permission to alter tables. This needs to be fixed before the driver rates feature will work.

## Quick Fix Options

### Option 1: Recreate Database (Easiest)
```bash
# Drop and recreate the database
dropdb vider_dev
createdb vider_dev

# Run migrations
npx prisma migrate deploy

# Seed the database
npx tsx src/db/seed.ts
```

### Option 2: Grant Permissions
Connect to PostgreSQL as superuser and run:
```sql
-- Connect as postgres superuser
psql postgres

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE vider_dev TO omaraltaf;
\c vider_dev
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO omaraltaf;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO omaraltaf;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO omaraltaf;
```

Then run:
```bash
npx prisma migrate deploy
```

### Option 3: Manual Column Addition
If you have psql access:
```bash
psql vider_dev -f scripts/add-columns-simple.sql
```

## Verify It Worked
```bash
npx tsx scripts/check-driver-rates.ts
```

You should see vehicle listings with `withDriverHourlyRate` and `withDriverDailyRate` populated.

## What This Adds
- `withDriverHourlyRate` column to VehicleListing table
- `withDriverDailyRate` column to VehicleListing table
- Migrates existing `withDriverCost` data to both new columns
- Updates seed data with proper hourly and daily rates

## After Migration
Restart your development server:
```bash
npm run dev
```

Then test the booking page - you should see:
1. Driver hourly and daily rates displayed in the pricing section
2. Correct rate shown in the with/without driver toggle based on rental type
3. Detailed cost breakdown showing vehicle rate and driver rate separately
