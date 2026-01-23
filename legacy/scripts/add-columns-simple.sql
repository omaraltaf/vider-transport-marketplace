-- Add driver rate columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='VehicleListing' AND column_name='withDriverHourlyRate') THEN
        ALTER TABLE "VehicleListing" ADD COLUMN "withDriverHourlyRate" DOUBLE PRECISION;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='VehicleListing' AND column_name='withDriverDailyRate') THEN
        ALTER TABLE "VehicleListing" ADD COLUMN "withDriverDailyRate" DOUBLE PRECISION;
    END IF;
END $$;

-- Update existing data
UPDATE "VehicleListing" 
SET "withDriverDailyRate" = "withDriverCost",
    "withDriverHourlyRate" = "withDriverCost" / 8
WHERE "withDriverCost" IS NOT NULL 
  AND "withDriverDailyRate" IS NULL;

-- Update seed data with proper rates
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
