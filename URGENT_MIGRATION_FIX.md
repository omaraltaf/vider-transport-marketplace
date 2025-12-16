# 🚨 URGENT: Fix Failed Migration

## The Problem

Your Railway deployment is stuck because the `_prisma_migrations` table is empty, but your database already has the schema. Prisma doesn't know which migrations have been applied, so it tries to run them all and fails when it encounters existing columns.

## The Quick Fix

### Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

### Step 3: Link to your project

```bash
railway link
```

Select your project from the list.

### Step 4: Run the baseline script

```bash
./scripts/baseline-migrations.sh
```

This will mark all 5 migrations as applied in your database.

### Step 5: Redeploy

```bash
git commit --allow-empty -m "Trigger redeploy after baseline"
git push origin main
```

Or click "Redeploy" in Railway dashboard.

## Alternative: Manual SQL via psql

If you have `psql` installed locally:

1. Get your DATABASE_URL from Railway:
   ```bash
   railway variables --json | grep DATABASE_URL
   ```

2. Connect and run the SQL:
   ```bash
   psql "YOUR_DATABASE_URL" < scripts/baseline-migrations.sql
   ```

## What This Does

- Populates the empty `_prisma_migrations` table with records for all 5 migrations
- Marks them all as successfully completed
- Tells Prisma that the database is already up-to-date
- Allows future deployments to proceed normally

## After the Fix

Your next deployment should succeed. You should see:
```
✓ Prisma schema loaded from prisma/schema.prisma
✓ Database schema is up to date!
```

---

**TL;DR:** 
```bash
npm i -g @railway/cli
railway login
railway link
./scripts/baseline-migrations.sh
```
Then redeploy.
