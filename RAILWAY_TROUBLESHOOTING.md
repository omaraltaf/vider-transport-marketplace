# Railway Deployment Troubleshooting Guide

## Current Status

You've set up environment variables but still seeing CORS errors. Let's diagnose the issue step by step.

## Step 1: Check Railway Deployment Logs

1. Go to https://railway.app
2. Open your project
3. Click on your backend service
4. Click on "Deployments" tab
5. Click on the latest deployment
6. Look for errors in the logs

### What to look for:

**Good signs:**
```
✓ Prisma schema loaded
✓ Prisma Client generated
✓ Database migrations applied
✓ Server started on port 3000
🚀 Vider Platform API running on port 3000
```

**Bad signs:**
```
✗ Environment configuration error
✗ DATABASE_URL is required
✗ JWT_SECRET must be at least 32 characters
✗ Failed to connect to database
✗ Migration failed
```

## Step 2: Verify Environment Variables

In Railway, go to Variables tab and verify these are ALL set:

- [ ] `DATABASE_URL` (should be automatically set by PostgreSQL service)
- [ ] `JWT_SECRET` (64 character random string)
- [ ] `FRONTEND_URL` = `https://vider-transport-marketplace.vercel.app`
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000`
- [ ] `PLATFORM_COMMISSION_RATE` = `10`
- [ ] `PLATFORM_TAX_RATE` = `25`
- [ ] `BOOKING_TIMEOUT_HOURS` = `24`
- [ ] `MAX_FILE_SIZE` = `5242880`
- [ ] `JWT_ACCESS_EXPIRATION` = `15m`
- [ ] `JWT_REFRESH_EXPIRATION` = `7d`
- [ ] `DEFAULT_CURRENCY` = `NOK`
- [ ] `UPLOAD_DIR` = `./uploads`

## Step 3: Test Backend Directly

Open a new browser tab and try these URLs:

### Health Check
```
https://vider-transport-marketplace-production.up.railway.app/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "dependencies": {
    "database": "connected"
  }
}
```

### API Docs
```
https://vider-transport-marketplace-production.up.railway.app/api-docs
```

Should show Swagger UI documentation.

## Step 4: Check Database Tables

In Railway:
1. Click on your PostgreSQL service
2. Click "Data" tab
3. You should see these tables:
   - User
   - Company
   - VehicleListing
   - DriverListing
   - Booking
   - Payment
   - Transaction
   - Rating
   - Message
   - Notification
   - AuditLog
   - Dispute

If tables are missing, migrations didn't run.

## Step 5: Manual Migration (If Needed)

If tables are missing, run migrations manually:

1. In Railway, click on your backend service
2. Go to "Settings" tab
3. Scroll to "Service Variables"
4. Copy the `DATABASE_URL` value
5. In your local terminal:

```bash
# Set the production database URL
export DATABASE_URL="<paste-railway-database-url>"

# Run migrations
npx prisma migrate deploy

# Optional: Seed with test data
npx prisma db seed
```

## Step 6: Check CORS Configuration

The backend should log the FRONTEND_URL on startup. Check Railway logs for:

```
🔗 Frontend URL: https://vider-transport-marketplace.vercel.app
```

If this is missing or wrong, the CORS won't work.

## Step 7: Verify Vercel Environment Variable

In Vercel:
1. Go to your project
2. Settings → Environment Variables
3. Verify `VITE_API_BASE_URL` = `https://vider-transport-marketplace-production.up.railway.app`
4. NO `/api` at the end!

## Step 8: Force Redeploy

Sometimes Railway needs a fresh deployment:

1. In Railway, click on your backend service
2. Click "Deployments" tab
3. Click the three dots on the latest deployment
4. Click "Redeploy"

## Common Issues & Solutions

### Issue 1: "Environment configuration error"

**Solution:** One or more required environment variables are missing or invalid.
- Check Railway Variables tab
- Ensure JWT_SECRET is at least 32 characters
- Ensure all numeric values are valid numbers

### Issue 2: "Failed to connect to database"

**Solution:** DATABASE_URL is wrong or database isn't running.
- Verify PostgreSQL service is running in Railway
- Check DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Ensure DATABASE_URL is linked from PostgreSQL service

### Issue 3: "Migration failed"

**Solution:** Database schema conflicts or connection issues.
- Run migrations manually (see Step 5)
- Check database logs in Railway
- Verify DATABASE_URL has write permissions

### Issue 4: CORS errors persist

**Solution:** Backend isn't receiving requests or CORS config is wrong.
- Test backend health endpoint directly (Step 3)
- Verify FRONTEND_URL matches exactly (no trailing slash)
- Check browser console for the exact error
- Verify backend is actually running (check Railway logs)

### Issue 5: "Cannot find module" errors

**Solution:** Build process failed or dependencies missing.
- Check Railway build logs
- Verify `npm install` completed successfully
- Ensure `prisma generate` ran during build
- Try redeploying

## Debug Checklist

Run through this checklist:

1. [ ] Railway backend service is deployed and running
2. [ ] Railway PostgreSQL service is running
3. [ ] All environment variables are set in Railway
4. [ ] Backend health endpoint returns 200 OK
5. [ ] Database tables exist (check Railway PostgreSQL Data tab)
6. [ ] Vercel frontend is deployed
7. [ ] Vercel has correct VITE_API_BASE_URL
8. [ ] Browser shows the Vercel URL correctly
9. [ ] Browser console shows the actual error message
10. [ ] Railway logs show "Server started" message

## Still Not Working?

If you've checked everything above and it's still not working, share:

1. **Railway backend logs** (last 50 lines)
2. **Browser console errors** (full error message)
3. **Railway environment variables** (screenshot, hide sensitive values)
4. **Health endpoint response** (what you get when you visit /health)

This will help diagnose the exact issue.

## Quick Test Script

Run this in your browser console on the Vercel site:

```javascript
// Test backend connection
fetch('https://vider-transport-marketplace-production.up.railway.app/health')
  .then(r => r.json())
  .then(data => console.log('Backend health:', data))
  .catch(err => console.error('Backend error:', err));

// Test CORS
fetch('https://vider-transport-marketplace-production.up.railway.app/api/listings/search?page=1')
  .then(r => r.json())
  .then(data => console.log('API response:', data))
  .catch(err => console.error('API error:', err));
```

This will show you exactly what's failing.
