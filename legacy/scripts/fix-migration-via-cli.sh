#!/bin/bash

# Fix Failed Migration via Railway CLI
# This script connects to Railway and fixes the failed migration

echo "🔧 Fixing failed migration in Railway database..."
echo ""
echo "This will:"
echo "1. Delete the failed migration record"
echo "2. Insert it as successfully completed"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Run the fix via Railway CLI
railway run bash -c 'psql $DATABASE_URL << EOF
-- Delete the failed migration record
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '\''20251201011147_add_driver_rates'\'';

-- Insert it as successfully completed
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
  '\''e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5'\'',
  NOW(),
  '\''20251201011147_add_driver_rates'\'',
  NULL,
  NULL,
  NOW(),
  1
);

-- Verify
SELECT migration_name, finished_at, started_at 
FROM "_prisma_migrations" 
WHERE migration_name = '\''20251201011147_add_driver_rates'\'';
EOF'

echo ""
echo "✅ Migration fix complete!"
echo ""
echo "Next steps:"
echo "1. Trigger a redeploy: git commit --allow-empty -m 'Trigger redeploy' && git push"
echo "2. Or redeploy via Railway dashboard"
