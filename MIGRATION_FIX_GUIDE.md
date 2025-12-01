# Migration Fix Guide

## Problem
The deployment is failing because migration `20251201011147_add_driver_rates` failed in production. The columns already exist (we added them manually), but Prisma's migration tracking table shows the migration as failed.

## Error
```
Error: P3009
migrate found failed migrations in the target database
The `20251201011147_add_driver_rates` migration started at 2025-12-01 01:14:14.552557 UTC failed
```

## Solution

### Option 1: Fix via Railway CLI (Recommended)

1. **Connect to your Railway database:**
   ```bash
   railway connect postgres
   ```

2. **Run the fix script:**
   ```sql
   -- Delete the failed migration record
   DELETE FROM "_prisma_migrations" 
   WHERE migration_name = '20251201011147_add_driver_rates';
   
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
     'e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5',
     NOW(),
     '20251201011147_add_driver_rates',
     NULL,
     NULL,
     NOW(),
     1
   );
   ```

3. **Verify the fix:**
   ```sql
   SELECT * FROM "_prisma_migrations" 
   WHERE migration_name = '20251201011147_add_driver_rates';
   ```

4. **Redeploy:**
   ```bash
   git commit --allow-empty -m "Trigger redeploy after migration fix"
   git push origin main
   ```

### Option 2: Fix via Railway Dashboard

1. Go to your Railway project
2. Click on your PostgreSQL database
3. Click "Query" tab
4. Run the SQL from Option 1, step 2
5. Redeploy your service

### Option 3: Alternative - Use Prisma Migrate Resolve

If you have Railway CLI installed:

```bash
# Set your DATABASE_URL
export DATABASE_URL="your-railway-postgres-url"

# Mark the migration as rolled back
npx prisma migrate resolve --rolled-back 20251201011147_add_driver_rates

# Then mark it as applied
npx prisma migrate resolve --applied 20251201011147_add_driver_rates
```

## Verification

After applying the fix, the next deployment should succeed. The migration will be marked as complete and Prisma will not try to run it again.

## Prevention

To avoid this in the future:
1. Always test migrations locally first
2. Use `prisma migrate deploy` in production (which we already do)
3. Don't manually add columns that are in pending migrations
4. If you must add columns manually, either:
   - Don't create a migration for them, OR
   - Mark the migration as applied before deploying

## Current Status

- ✅ Columns exist in database: `withDriverHourlyRate`, `withDriverDailyRate`
- ❌ Migration marked as failed in `_prisma_migrations` table
- 🔧 Need to mark migration as successful to unblock deployments
