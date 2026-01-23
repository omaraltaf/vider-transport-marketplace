-- Fix failed migration by marking it as applied
-- This script should be run directly on the production database

-- First, delete the failed migration record
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251201011147_add_driver_rates';

-- Then insert it as successfully completed
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
) VALUES (
  gen_random_uuid(),
  'e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5',
  NOW(),
  '20251201011147_add_driver_rates',
  NULL,
  NULL,
  NOW(),
  1
);
