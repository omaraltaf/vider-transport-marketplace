#!/bin/bash
# Baseline Prisma Migrations
# Use this when the database schema exists but _prisma_migrations is empty

echo "🔧 Baselining Prisma migrations..."
echo ""
echo "This will mark all existing migrations as applied without running them."
echo "Use this when your database already has the schema but Prisma doesn't know about it."
echo ""

# Mark each migration as resolved (applied) without actually running it
railway run npx prisma migrate resolve --applied 20251128180427_test
railway run npx prisma migrate resolve --applied 20251128202520_add_notifications
railway run npx prisma migrate resolve --applied 20251128203519_add_dispute_model
railway run npx prisma migrate resolve --applied 20251128203625_add_dispute_booking_relation
railway run npx prisma migrate resolve --applied 20251201011147_add_driver_rates

echo ""
echo "✅ All migrations marked as applied!"
echo ""
echo "Verifying migration status..."
railway run npx prisma migrate status

echo ""
echo "Next step: Redeploy your backend service on Railway"
