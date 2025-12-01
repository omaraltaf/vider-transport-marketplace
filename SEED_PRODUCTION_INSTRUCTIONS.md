# Seed Production Database Instructions

The production database on Railway is currently empty. Here's how to seed it with test data:

## Option 1: Using Railway CLI (Recommended)

1. Install Railway CLI if you haven't:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Link to your project:
```bash
railway link
```

4. Run the seed script:
```bash
railway run npm run db:seed
```

## Option 2: Using Environment Variable

1. Get your Railway database URL:
   - Go to https://railway.app
   - Open your project
   - Click on the Postgres service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value

2. Run the seed with the Railway database URL:
```bash
DATABASE_URL="your-railway-database-url-here" npm run db:seed
```

## Option 3: Seed via API Call

You can also create a temporary API endpoint to seed the database:

1. I can create a `/api/admin/seed` endpoint (protected by admin auth)
2. You call it once from the frontend or via curl
3. Then we remove the endpoint

Would you like me to implement Option 3?

## What Gets Seeded

The seed script will create:
- 3 Companies (Oslo, Bergen, Trondheim)
- 4 Users with different roles
- 4 Vehicle listings
- 3 Driver listings  
- 4 Sample bookings
- Ratings and messages
- Platform configuration

All test accounts will use password: `password123`

## Verify After Seeding

After seeding, you can verify by:

1. Checking the API:
```bash
curl https://vider-transport-marketplace-production.up.railway.app/api/listings/search
```

2. Trying to login at the frontend with:
   - Email: `admin@vider.no`
   - Password: `password123`

## Current Issue

The reason login and listings don't work is because the Railway database is empty (no users or listings exist yet). Once we seed it, everything will work!
