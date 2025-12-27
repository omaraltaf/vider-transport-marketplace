# Railway Environment Variables Setup Guide

## 🚀 Step-by-Step Railway Deployment

### Step 1: Add PostgreSQL Database Service

1. In your Railway dashboard, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. The `DATABASE_URL` will be automatically added to your environment variables

### Step 2: Required Environment Variables

Add these environment variables in Railway dashboard (Variables tab):

#### 🔐 JWT Configuration (REQUIRED)
```
JWT_SECRET=nA0gZ6/7A270dekoIjznuKWgQ7HqMaebD9V9pdeaMpg=
JWT_REFRESH_SECRET=f32I6jFsMwj0pW8Mgs0fqaU1FC5KLWsxlNLjP7MgBv4=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### 🌐 Application Configuration (REQUIRED)
```
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://your-railway-domain.railway.app
```

#### 📧 Email Configuration (REQUIRED for notifications)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@vider.no
```

#### 💰 Platform Configuration (REQUIRED)
```
PLATFORM_COMMISSION_RATE=5
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
DEFAULT_CURRENCY=NOK
MIN_BOOKING_AMOUNT=500
MAX_BOOKING_AMOUNT=100000
```

#### 📁 File Upload Configuration (REQUIRED)
```
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
```

#### 🔒 Security Configuration (REQUIRED)
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
PASSWORD_MIN_LENGTH=8
```

### Step 3: Optional Environment Variables

#### 📊 Redis Configuration (Optional - for better performance)
```
REDIS_URL=redis://localhost:6379
```

#### 🔍 Logging Configuration (Optional)
```
LOG_LEVEL=info
LOG_FORMAT=json
```

## 🎯 Quick Setup Commands

### Copy-Paste Environment Variables (All Required)
```
JWT_SECRET=nA0gZ6/7A270dekoIjznuKWgQ7HqMaebD9V9pdeaMpg=
JWT_REFRESH_SECRET=f32I6jFsMwj0pW8Mgs0fqaU1FC5KLWsxlNLjP7MgBv4=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://your-railway-domain.railway.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@vider.no
PLATFORM_COMMISSION_RATE=5
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
DEFAULT_CURRENCY=NOK
MIN_BOOKING_AMOUNT=500
MAX_BOOKING_AMOUNT=100000
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
PASSWORD_MIN_LENGTH=8
```

## 📋 Deployment Checklist

### Before Deployment:
- [ ] PostgreSQL database service added to Railway project
- [ ] All required environment variables configured
- [ ] Email SMTP credentials configured (use Gmail App Password)
- [ ] Frontend URL updated to match Railway domain

### After Deployment:
- [ ] Check deployment logs for successful migration
- [ ] Test health endpoint: `https://your-domain.railway.app/health`
- [ ] Test API endpoints: `https://your-domain.railway.app/api/auth/health`
- [ ] Seed production data if needed

## 🔧 Database Setup

Railway will automatically:
1. Create PostgreSQL database
2. Provide `DATABASE_URL` environment variable
3. Run migrations during build process (`postbuild` script)

## 🚨 Common Issues & Solutions

### Issue: "platform_configs table does not exist"
**Solution**: Ensure PostgreSQL service is added and `DATABASE_URL` is available during build

### Issue: "JWT_SECRET is required"
**Solution**: Add all JWT environment variables from the list above

### Issue: "SMTP configuration missing"
**Solution**: Configure email settings (use Gmail with App Password for testing)

### Issue: "Port already in use"
**Solution**: Railway automatically handles port assignment, ensure `PORT=8080` is set

## 📞 Next Steps After Setup

1. **Add all environment variables** from the list above
2. **Add PostgreSQL database service** in Railway dashboard
3. **Redeploy** - Railway will automatically redeploy with new configuration
4. **Test the deployment** using the health endpoints
5. **Seed production data** if needed

## 🎉 Success Indicators

When deployment is successful, you should see:
- ✅ Build completes without errors
- ✅ Database migrations run successfully
- ✅ Server starts on port 8080
- ✅ Health endpoint responds: `/health`
- ✅ API endpoints respond: `/api/auth/health`

---

**Need Help?** Check the deployment logs in Railway dashboard for specific error messages.