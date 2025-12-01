# Seed Production Database NOW

## Step 1: Wait for Deployment
Wait 2-3 minutes for Railway to finish deploying the latest code.

## Step 2: Get Your JWT Secret
You need your JWT_SECRET from Railway:

1. Go to https://railway.app
2. Open your project
3. Click on your backend service
4. Go to "Variables" tab
5. Copy the value of `JWT_SECRET`

## Step 3: Run This Command

Replace `YOUR_JWT_SECRET_HERE` with the actual JWT secret from Railway:

```bash
curl -X POST https://vider-transport-marketplace-production.up.railway.app/api/seed \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: YOUR_JWT_SECRET_HERE"
```

## Expected Response

You should see:

```json
{
  "message": "Database seeded successfully!",
  "data": {
    "companies": 3,
    "users": 4,
    "vehicles": 4,
    "drivers": 3,
    "bookings": 3,
    "ratings": 1,
    "messages": 2
  },
  "testAccounts": [
    { "email": "admin@vider.no", "password": "password123", "role": "PLATFORM_ADMIN" },
    { "email": "admin@oslotransport.no", "password": "password123", "role": "COMPANY_ADMIN" },
    { "email": "admin@bergenlogistics.no", "password": "password123", "role": "COMPANY_ADMIN" },
    { "email": "user@trondheimfleet.no", "password": "password123", "role": "COMPANY_USER" }
  ]
}
```

## Step 4: Test It

After seeding:

1. **Test Login**: Go to https://vider-transport-marketplace.vercel.app/login
   - Email: `admin@vider.no`
   - Password: `password123`

2. **Test Listings**: Go to https://vider-transport-marketplace.vercel.app/search
   - You should see 4 vehicle listings

3. **Test API**: 
```bash
curl https://vider-transport-marketplace-production.up.railway.app/api/listings/search
```

## Troubleshooting

### If you get "Invalid seed secret"
- Make sure you copied the JWT_SECRET correctly
- Make sure there are no extra spaces or quotes

### If you get "Already seeded"
- The database already has data
- You can verify by testing login or checking listings

### If you get a 404 error
- Wait a bit longer for Railway to finish deploying
- Check the Railway logs to see if the deployment succeeded

## Security Note

After seeding, you may want to remove the seed endpoint for security. Let me know and I can remove it!
