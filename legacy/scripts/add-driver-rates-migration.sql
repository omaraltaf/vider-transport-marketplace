-- Add separate hourly and daily driver rates to VehicleListing
ALTER TABLE "VehicleListing" ADD COLUMN IF NOT EXISTS "withDriverHourlyRate" DOUBLE PRECISION;
ALTER TABLE "VehicleListing" ADD COLUMN IF NOT EXISTS "withDriverDailyRate" DOUBLE PRECISION;

-- Migrate existing withDriverCost to both hourly and daily rates
-- Assuming existing withDriverCost was meant as daily rate, calculate hourly as daily/8
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
