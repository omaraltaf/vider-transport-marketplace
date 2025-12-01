# Driver Rates Migration Guide

## What Changed

We've updated the system to support separate hourly and daily driver rates instead of a single `withDriverCost` field.

### Database Changes
- Added `withDriverHourlyRate` column to `VehicleListing`
- Added `withDriverDailyRate` column to `VehicleListing`
- Kept `withDriverCost` for backward compatibility

### Application Changes
- Cost calculation now shows separate line items for vehicle and driver
- Driver toggle displays correct hourly/daily rate based on rental type
- Cost breakdown shows: Vehicle Rate, Driver Rate (if applicable), Subtotal, Commission, Taxes, Total

## How to Apply to Production

### Option 1: Using Railway CLI
```bash
# Connect to Railway production database
railway run psql $DATABASE_URL -f scripts/add-driver-rates-migration.sql
```

### Option 2: Using Railway Dashboard
1. Go to Railway dashboard
2. Select your project
3. Click on the PostgreSQL service
4. Click "Query" tab
5. Copy and paste the contents of `scripts/add-driver-rates-migration.sql`
6. Click "Execute"

### Option 3: Manual SQL Execution
Connect to your production database and run:

```sql
-- Add separate hourly and daily driver rates to VehicleListing
ALTER TABLE "VehicleListing" ADD COLUMN IF NOT EXISTS "withDriverHourlyRate" DOUBLE PRECISION;
ALTER TABLE "VehicleListing" ADD COLUMN IF NOT EXISTS "withDriverDailyRate" DOUBLE PRECISION;

-- Migrate existing withDriverCost to both hourly and daily rates
UPDATE "VehicleListing" 
SET "withDriverDailyRate" = "withDriverCost",
    "withDriverHourlyRate" = "withDriverCost" / 8
WHERE "withDriverCost" IS NOT NULL 
  AND "withDriverDailyRate" IS NULL;

-- Update existing seed data with proper rates
UPDATE "VehicleListing" 
SET "withDriverHourlyRate" = 350,
    "withDriverDailyRate" = 2500
WHERE "title" = 'Mercedes-Benz Actros 18-pallet truck';

UPDATE "VehicleListing" 
SET "withDriverHourlyRate" = 400,
    "withDriverDailyRate" = 2800
WHERE "title" = 'Refrigerated 21-pallet truck';

UPDATE "VehicleListing" 
SET "withDriverHourlyRate" = 300,
    "withDriverDailyRate" = 2200
WHERE "title" = 'Electric 8-pallet van';

UPDATE "VehicleListing" 
SET "withDriverHourlyRate" = 450,
    "withDriverDailyRate" = 3200
WHERE "title" = 'Heavy-duty trailer';
```

## Verification

After applying the migration, verify it worked:

```sql
SELECT 
  title, 
  "withDriverCost", 
  "withDriverHourlyRate", 
  "withDriverDailyRate"
FROM "VehicleListing"
WHERE "withDriver" = true;
```

You should see all vehicles with driver option now have both hourly and daily rates populated.

## What Users Will See

1. **With/Without Driver Toggle**: When a vehicle offers both options, users see a clear radio button selection
2. **Rate Display**: The toggle shows the correct rate (hourly or daily) based on the selected rental type
3. **Detailed Cost Breakdown**:
   - Vehicle Rate: XXX NOK
   - Driver Rate: XXX NOK (only if driver selected)
   - Subtotal: XXX NOK
   - Platform Commission (5%): XXX NOK
   - Taxes (25%): XXX NOK
   - **Total: XXX NOK**

## Rollback (if needed)

If you need to rollback:

```sql
ALTER TABLE "VehicleListing" DROP COLUMN IF EXISTS "withDriverHourlyRate";
ALTER TABLE "VehicleListing" DROP COLUMN IF EXISTS "withDriverDailyRate";
```

Note: The application will still work with just `withDriverCost` as we kept it for backward compatibility.
