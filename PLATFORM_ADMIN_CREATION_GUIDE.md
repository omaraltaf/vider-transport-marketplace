# Platform Admin Creation Guide

## Current Status
The production database is fully seeded and operational, but the platform admin account (`admin@vider.no`) doesn't exist yet.

## Option 1: Manual Database Query (Recommended)

If you have access to the Railway PostgreSQL database, you can run this SQL query directly:

```sql
-- First, get the password hash for 'password123'
-- Hash: $2b$12$LQv3c1yPdHlh5f3NfJSBUOQOSUOEr3lIZOFSQs/wJl7.2LJSGxUjG

-- Find an existing company ID to use
SELECT id, name FROM "Company" LIMIT 1;

-- Insert the platform admin user (replace COMPANY_ID with actual ID from above)
INSERT INTO "User" (
  id,
  email,
  "passwordHash",
  role,
  "companyId",
  "firstName",
  "lastName",
  phone,
  "emailVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@vider.no',
  '$2b$12$LQv3c1yPdHlh5f3NfJSBUOQOSUOEr3lIZOFSQs/wJl7.2LJSGxUjG',
  'PLATFORM_ADMIN',
  'COMPANY_ID_HERE', -- Replace with actual company ID
  'Platform',
  'Administrator',
  '+47 12345678',
  true,
  NOW(),
  NOW()
);
```

## Option 2: Railway CLI (If Available)

If you have Railway CLI installed and configured:

```bash
# Connect to the database
railway connect

# Run the platform admin creation script
railway run node scripts/create-platform-admin.js
```

## Option 3: API Endpoint (When Deployed)

Once the new API endpoint is deployed, you can use:

```bash
curl -X POST "https://vider-transport-marketplace-production.up.railway.app/api/seed/platform-admin" \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: YOUR_JWT_SECRET" \
  -d '{}'
```

## Verification

After creating the platform admin, test the login:

```bash
curl -X POST "https://vider-transport-marketplace-production.up.railway.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@vider.no", "password": "password123"}'
```

## Platform Admin Credentials

- **Email:** admin@vider.no
- **Password:** password123
- **Role:** PLATFORM_ADMIN

⚠️ **Important:** Change the default password immediately after first login!

## Current Working Accounts

While the platform admin is being created, you can use these existing accounts:

1. **Oslo Transport AS Admin**
   - Email: admin@oslotransport.no
   - Password: password123
   - Role: COMPANY_ADMIN

2. **Bergen Logistics AS Admin**
   - Email: admin@bergenlogistics.no
   - Password: password123
   - Role: COMPANY_ADMIN

Both accounts are verified and working in production.