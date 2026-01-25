# Railway Environment Variables Checklist

## 🎯 Essential Variables (Copy & Paste Ready)

### Step 1: Add Database Services
1. **PostgreSQL**: **+ New** → **Database** → **Add PostgreSQL**
   - This automatically adds `DATABASE_URL`
2. **Redis**: **+ New** → **Database** → **Add Redis**  
   - This automatically adds `REDIS_URL`

### Step 2: Add These Environment Variables

**Copy and paste each line into Railway Variables tab:**

```
JWT_SECRET=nA0gZ6/7A270dekoIjznuKWgQ7HqMaebD9V9pdeaMpg=
```

```
JWT_REFRESH_SECRET=f32I6jFsMwj0pW8Mgs0fqaU1FC5KLWsxlNLjP7MgBv4=
```

```
JWT_EXPIRES_IN=15m
```

```
JWT_REFRESH_EXPIRES_IN=7d
```

```
NODE_ENV=production
```

```
PORT=8080
```

```
FRONTEND_URL=https://vider-transport-marketplace.vercel.app
```

```
PLATFORM_COMMISSION_RATE=5
```

```
PLATFORM_TAX_RATE=25
```

```
BOOKING_TIMEOUT_HOURS=24
```

```
DEFAULT_CURRENCY=NOK
```

```
MIN_BOOKING_AMOUNT=500
```

```
MAX_BOOKING_AMOUNT=100000
```

```
MAX_FILE_SIZE=10485760
```

```
UPLOAD_PATH=./uploads
```

```
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
```

```
RATE_LIMIT_WINDOW_MS=900000
```

```
RATE_LIMIT_MAX_REQUESTS=100
```

```
SESSION_TIMEOUT_MINUTES=60
```

```
MAX_LOGIN_ATTEMPTS=5
```

```
PASSWORD_MIN_LENGTH=8
```

### Step 3: Firebase Configuration (Required for Admin/Auth)
**Get these from your Firebase Service Account JSON file:**

```
FIREBASE_PROJECT_ID=your-project-id
```

```
FIREBASE_CLIENT_EMAIL=your-service-account-email
```

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Step 4: Email Configuration (Optional but Recommended)

**For Gmail (recommended for testing):**

```
SMTP_HOST=smtp.gmail.com
```

```
SMTP_PORT=587
```

```
SMTP_SECURE=false
```

```
SMTP_USER=your-email@gmail.com
```

```
SMTP_PASS=your-gmail-app-password
```

```
FROM_EMAIL=noreply@vider.no
```

## ✅ Checklist

- [ ] PostgreSQL database service added
- [ ] Redis cache service added
- [ ] All JWT variables added (4 variables)
- [ ] Application config added (12 variables)
- [ ] Firebase config added (3 variables)
- [ ] Email config added (6 variables) - Optional
- [ ] Redeploy triggered
- [ ] Check deployment logs
- [ ] Test health endpoint

## 🚀 After Adding Variables

1. Railway will automatically redeploy
2. Check logs for successful migration
3. Test: `https://your-domain.railway.app/health`
4. **Next**: Deploy frontend to Vercel (see FULL_STACK_DEPLOYMENT_GUIDE.md)

---

**Total Required Variables: 16 minimum (22 with email)**
**Services Required: PostgreSQL + Redis**