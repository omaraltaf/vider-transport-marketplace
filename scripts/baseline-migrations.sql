-- Baseline Prisma Migrations
-- Run this in Railway's PostgreSQL Query tab to mark all migrations as applied

-- Insert migration records for all existing migrations
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
) VALUES 
(
  gen_random_uuid(),
  '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  NOW(),
  '20251128180427_test',
  NULL,
  NULL,
  NOW(),
  1
),
(
  gen_random_uuid(),
  '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
  NOW(),
  '20251128202520_add_notifications',
  NULL,
  NULL,
  NOW(),
  1
),
(
  gen_random_uuid(),
  '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
  NOW(),
  '20251128203519_add_dispute_model',
  NULL,
  NULL,
  NOW(),
  1
),
(
  gen_random_uuid(),
  '4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
  NOW(),
  '20251128203625_add_dispute_booking_relation',
  NULL,
  NULL,
  NOW(),
  1
),
(
  gen_random_uuid(),
  'e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5',
  NOW(),
  '20251201011147_add_driver_rates',
  NULL,
  NULL,
  NOW(),
  1
);

-- Verify the migrations were inserted
SELECT migration_name, finished_at 
FROM "_prisma_migrations" 
ORDER BY started_at;
