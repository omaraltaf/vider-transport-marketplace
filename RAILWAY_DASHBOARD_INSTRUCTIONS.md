# 🚂 Railway Dashboard Setup Instructions

## 🎯 Current Issue Fix

The deployment error shows: **"The table 'public.platform_configs' does not exist"**

This means database migrations haven't run. I've fixed this with a new startup script.

## 🔧 What I Fixed

1. **Updated `railway.json`** - Now runs migrations before starting
2. **Created `scripts/railway-start.sh`** - Handles migrations + seeding
3. **Added `start:railway` script** - Railway-specific startup

## 📋 Railway Dashboard Setup

### Step 1: Add Required Services

In your Railway project dashboard:

1. **Add PostgreSQL Database**
   - Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
   - This automatically provides `DATABASE_URL`

2. **Add Redis Cache**
   - Click **"+ New"** → **"Database"** → **"Add Redis"**  
   - This automatically provides `REDIS_URL`

### Step 2: Environment Variables

Go to **Variables** tab and add these **one by one**:

#### 🔐 JWT & Security (Required)
```
JWT_SECRET=nA0gZ6/7A270dekoIjznuKWgQ7HqMaebD9V9pdeaMpg=
JWT_REFRESH_SECRET=f32I6jFsMwj0pW8Mgs0fqaU1FC5KLWsxlNLjP7MgBv4=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### 🌐 Application Config (Required)
```
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://vider-transport-marketplace.vercel.app
```

#### 💰 Platform Settings (Required)
```
PLATFORM_COMMISSION_RATE=5
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
DEFAULT_CURRENCY=NOK
MIN_BOOKING_AMOUNT=500
MAX_BOOKING_AMOUNT=100000
```

#### 📁 File Upload (Required)
```
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
```

#### 🔒 Security Limits (Required)
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
PASSWORD_MIN_LENGTH=8
```

#### 📧 Email Config (Optional but Recommended)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=noreply@vider.no
```

### Step 3: Redeploy

After adding all variables:
1. Railway will **automatically redeploy**
2. The new startup script will:
   - ✅ Generate Prisma client
   - ✅ Run database migrations
   - ✅ Seed database if empty
   - ✅ Start the server

### Step 4: Verify Success

Check the deployment logs for:
- ✅ "Generating Prisma client..."
- ✅ "Running database migrations..."
- ✅ "Database already has data" or "seeding with production data..."
- ✅ "Starting application..."
- ✅ "Vider Platform API running on port 8080"

## 🧪 Test Your Deployment

Once deployed successfully, test these endpoints:

```bash
# Health check
curl https://your-railway-domain.railway.app/health

# API health  
curl https://your-railway-domain.railway.app/api/auth/health

# Platform config (should work now)
curl https://your-railway-domain.railway.app/api/platform/config
```

## ✅ Success Checklist

- [ ] PostgreSQL database service added
- [ ] Redis cache service added
- [ ] All 22 environment variables added
- [ ] Deployment shows "Deployed" status
- [ ] Logs show successful migration
- [ ] Health endpoints respond
- [ ] No "platform_configs" errors

## 🚨 If Still Having Issues

1. **Check Railway logs** for specific error messages
2. **Verify DATABASE_URL** is automatically provided by PostgreSQL service
3. **Ensure all environment variables** are added correctly
4. **Try manual redeploy** if automatic didn't trigger

---

**The migration issue should be fixed with the new startup script!**