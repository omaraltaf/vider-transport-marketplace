# 🚨 URGENT: Fix Failed Migration

## The Problem

Your Railway deployment is stuck in a crash loop because of a failed database migration. The migration tried to add columns that already exist, causing it to fail. Now Prisma won't deploy anything until this is fixed.

## The Quick Fix

### Option 1: Use the Script (Easiest)

```bash
./scripts/fix-migration-via-cli.sh
```

### Option 2: Manual Fix via Railway CLI

1. **Connect to your database:**
   ```bash
   railway connect postgres
   ```

2. **Run this SQL:**
   ```sql
   DELETE FROM "_prisma_migrations" 
   WHERE migration_name = '20251201011147_add_driver_rates';
   
   INSERT INTO "_prisma_migrations" (
     id, checksum, finished_at, migration_name, 
     logs, rolled_back_at, started_at, applied_steps_count
   ) VALUES (
     gen_random_uuid(),
     'e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5e8c5c8f5',
     NOW(),
     '20251201011147_add_driver_rates',
     NULL, NULL, NOW(), 1
   );
   ```

3. **Trigger redeploy:**
   ```bash
   git commit --allow-empty -m "Trigger redeploy after migration fix"
   git push origin main
   ```

### Option 3: Via Railway Dashboard

1. Go to Railway → Your Project → PostgreSQL
2. Click "Query" tab
3. Paste and run the SQL from Option 2
4. Go to your backend service and click "Redeploy"

## What This Does

- Removes the failed migration record from Prisma's tracking table
- Adds it back as successfully completed
- Allows deployments to proceed normally

## After the Fix

Your next deployment should succeed. The app will start normally and the migration issue will be resolved.

## Need More Details?

See `MIGRATION_FIX_GUIDE.md` for complete documentation.

---

**TL;DR:** Run `./scripts/fix-migration-via-cli.sh` then redeploy.
