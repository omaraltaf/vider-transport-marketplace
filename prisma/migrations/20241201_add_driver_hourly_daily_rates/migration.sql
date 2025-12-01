-- Add separate hourly and daily driver rates to VehicleListing
ALTER TABLE "VehicleListing" ADD COLUMN "withDriverHourlyRate" DOUBLE PRECISION;
ALTER TABLE "VehicleListing" ADD COLUMN "withDriverDailyRate" DOUBLE PRECISION;

-- Migrate existing withDriverCost to both hourly and daily rates
-- Assuming existing withDriverCost was meant as daily rate
UPDATE "VehicleListing" 
SET "withDriverDailyRate" = "withDriverCost",
    "withDriverHourlyRate" = "withDriverCost" / 8
WHERE "withDriverCost" IS NOT NULL;

-- Keep withDriverCost for backward compatibility (can be removed later)
-- ALTER TABLE "VehicleListing" DROP COLUMN "withDriverCost";
