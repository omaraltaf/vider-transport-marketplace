# Registration Debug Guide

## Issue
"Registration failed: Failed to fetch" error when trying to register.

## Root Cause Analysis

The backend is running correctly on port 3000 and CORS is properly configured. The issue is likely one of the following:

### 1. Frontend .env Not Loaded

Vite requires a restart to pick up `.env` file changes. If you just created or modified `frontend/.env`, you need to restart the frontend dev server.

**Solution:**
```bash
# Stop the frontend server (Ctrl+C in the terminal)
# Then restart it:
cd frontend
npm run dev
```

### 2. Browser Cache

The browser might be caching an old API configuration.

**Solution:**
- Open browser DevTools (F12)
- Go to Network tab
- Check "Disable cache"
- Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)

### 3. Check API URL in Browser

Open browser console and run:
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
```

It should show: `http://localhost:3000/api`

If it shows `undefined`, the .env file isn't being loaded.

## Verification Steps

### 1. Verify Backend is Running
```bash
curl http://localhost:3000/health
```

Should return: `{"status":"healthy",...}`

### 2. Verify Registration Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!",
    "firstName":"Test",
    "lastName":"User",
    "phone":"+4712345678",
    "companyName":"Test AS",
    "organizationNumber":"123456789",
    "businessAddress":"Test Street 1",
    "city":"Oslo",
    "postalCode":"0001",
    "fylke":"Oslo",
    "kommune":"Oslo",
    "vatRegistered":true
  }'
```

Should return success or validation error (not connection error).

### 3. Check Browser Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try to register
4. Look for the request to `/api/auth/register`
5. Check:
   - Is the request being made?
   - What's the full URL?
   - What's the error status?
   - Check the "Console" tab for any errors

## Current Configuration

- Backend: `http://localhost:3000` ✅ Running
- Frontend: `http://localhost:5173` ✅ Running
- API Base URL: `http://localhost:3000/api` ✅ Configured
- CORS: ✅ Properly configured

## Quick Fix

**Most likely solution - Restart the frontend server:**

```bash
# In your terminal where frontend is running:
# 1. Stop it (Ctrl+C)
# 2. Restart:
cd frontend
npm run dev
```

Then try registering again.

## Still Not Working?

If the issue persists after restarting:

1. Check browser console for errors
2. Check Network tab to see the actual request being made
3. Verify the request URL is `http://localhost:3000/api/auth/register`
4. Check if there are any browser extensions blocking requests (ad blockers, privacy tools)
