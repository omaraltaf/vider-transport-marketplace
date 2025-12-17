# 🔧 Railway Environment Variables Checklist

**Date**: December 17, 2025  
**Status**: 🚨 **ACTION REQUIRED - Check Railway Environment Variables**

## 🎯 Problem

Railway deployment is crashing after manual restart. The most likely cause is **missing or invalid environment variables**.

The application validates all environment variables on startup using Zod schema validation in `src/config/env.ts`. If any required variable is missing or invalid, the app crashes immediately with a clear error message.

## ✅ Required Environment Variables

Go to your Railway dashboard → Select your project → Click backend service → Go to "Variables" tab

### 1. Database (REQUIRED)
```bash
DATABASE_URL=postgresql://...
```
- **Source**: Railway should auto-provide this from your PostgreSQL service
- **Check**: Make sure your PostgreSQL service is linked to the backend service
- **Format**: Must be a valid PostgreSQL connection string

### 2. Authentication (REQUIRED)
```bash
JWT_SECRET=<your-secret-here>
```
- **Requirement**: MUST be at least 32 characters long
- **Example**: `your-strong-random-secret-here-min-32-chars-1234567890`
- **Generate**: Use `openssl rand -base64 32` to generate a secure secret

```bash
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```
- **Optional**: These have defaults, but you can set them

### 3. Platform Configuration (REQUIRED)
```bash
PLATFORM_COMMISSION_RATE=5
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
```
- **PLATFORM_COMMISSION_RATE**: Number between 0-100 (percentage)
- **PLATFORM_TAX_RATE**: Number between 0-100 (percentage)
- **BOOKING_TIMEOUT_HOURS**: Positive integer

### 4. File Storage (REQUIRED)
```bash
MAX_FILE_SIZE=10485760
```
- **Requirement**: Positive integer (bytes)
- **Example**: 10485760 = 10MB

```bash
UPLOAD_DIR=./uploads
```
- **Optional**: Has default value `./uploads`

### 5. Application Settings (REQUIRED)
```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-url.com
```
- **NODE_ENV**: Must be `production`
- **PORT**: Railway usually sets this automatically to 3000
- **FRONTEND_URL**: MUST be a valid URL (https://...)

### 6. Email (OPTIONAL)
```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@vider.no
```
- **Optional**: If not configured, emails will be logged only
- **Note**: These are all optional and won't cause crashes if missing

### 7. Currency (OPTIONAL)
```bash
DEFAULT_CURRENCY=NOK
```
- **Optional**: Has default value `NOK`

## 🔍 How to Check

### Step 1: Go to Railway Dashboard
1. Visit https://railway.app
2. Select your project: "Vider Transport Marketplace"
3. Click on the backend service
4. Click "Variables" tab

### Step 2: Verify Each Required Variable
Check that ALL of these are present:
- ✅ `DATABASE_URL` (should be auto-provided)
- ✅ `JWT_SECRET` (min 32 chars)
- ✅ `PLATFORM_COMMISSION_RATE` (0-100)
- ✅ `PLATFORM_TAX_RATE` (0-100)
- ✅ `BOOKING_TIMEOUT_HOURS` (positive integer)
- ✅ `MAX_FILE_SIZE` (positive integer)
- ✅ `FRONTEND_URL` (valid URL)
- ✅ `NODE_ENV=production`
- ✅ `PORT=3000`

### Step 3: Get Deployment Logs
1. In Railway dashboard, click on your backend service
2. Click "Deployments" tab
3. Click on the latest (crashed) deployment
4. Copy the error logs and share them

## 🚨 Common Issues

### Issue 1: JWT_SECRET Too Short
```
Error: JWT_SECRET must be at least 32 characters
```
**Fix**: Generate a longer secret:
```bash
openssl rand -base64 32
```

### Issue 2: FRONTEND_URL Invalid
```
Error: FRONTEND_URL must be a valid URL
```
**Fix**: Must include protocol (https://) and be a valid URL format

### Issue 3: Missing Platform Configuration
```
Error: PLATFORM_COMMISSION_RATE is required
```
**Fix**: Add the missing variable with a valid number (0-100)

### Issue 4: DATABASE_URL Missing
```
Error: DATABASE_URL is required
```
**Fix**: Link your PostgreSQL service to the backend service in Railway

## 📋 Quick Setup Template

Copy these to Railway (replace values with your actual values):

```bash
# Database (Railway auto-provides this)
DATABASE_URL=postgresql://...

# Authentication (GENERATE A SECURE SECRET!)
JWT_SECRET=your-strong-random-secret-here-min-32-chars-1234567890
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Platform Configuration
PLATFORM_COMMISSION_RATE=5
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
DEFAULT_CURRENCY=NOK

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
```

## 🎯 Next Steps

1. **Check Railway Variables**: Verify all required variables are set
2. **Fix Any Missing/Invalid Variables**: Add or correct them
3. **Redeploy**: Railway will auto-redeploy when you save variable changes
4. **Share Logs**: If still crashing, share the deployment logs with me

## 📊 Expected Behavior After Fix

Once all environment variables are correctly set:

1. ✅ Build completes successfully
2. ✅ `npx prisma db push` syncs database schema
3. ✅ `node dist/index.js` starts the server
4. ✅ Environment validation passes
5. ✅ Database connection succeeds
6. ✅ Server listens on port 3000
7. ✅ API responds to requests

## 🔗 Verification Commands

Once deployed successfully, test:

```bash
# Test API root
curl https://vider-transport-marketplace-production.up.railway.app/api

# Expected: JSON response with API info

# Test platform admin (should return 401, not 404)
curl -I https://vider-transport-marketplace-production.up.railway.app/api/platform-admin/overview

# Expected: HTTP/1.1 401 Unauthorized
```

---

**Action Required**: Please check Railway environment variables and share the deployment logs if still crashing.
