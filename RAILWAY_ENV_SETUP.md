# Railway Environment Variables Setup

## Required Environment Variables

Copy these into your Railway project settings:

### 1. Database
```
DATABASE_URL=<automatically set by Railway PostgreSQL service>
```

### 2. Authentication
Generate JWT secrets using this command in your terminal:
```bash
openssl rand -base64 64
```

Then set:
```
JWT_SECRET=<paste the generated secret here>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

### 3. Frontend URL
```
FRONTEND_URL=https://vider-transport-marketplace.vercel.app
```

### 4. Application Settings
```
NODE_ENV=production
PORT=3000
```

### 5. Platform Configuration
```
PLATFORM_COMMISSION_RATE=10
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
DEFAULT_CURRENCY=NOK
```

### 6. File Storage
```
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### 7. Email (Optional - for now)
```
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```
Leave these empty for now. The app will log emails instead of sending them.

## How to Add These in Railway

1. Go to https://railway.app
2. Open your project
3. Click on your backend service
4. Go to the "Variables" tab
5. Click "New Variable" for each one above
6. After adding all variables, Railway will automatically redeploy

## Generate JWT Secrets

Run this command twice to generate two different secrets:

```bash
openssl rand -base64 64
```

Use the first output for `JWT_SECRET`.

## Verify Setup

After Railway redeploys:
1. Check the deployment logs for any errors
2. Visit your Vercel frontend
3. The CORS errors should be gone
4. Test the API connection

## Troubleshooting

If you still see CORS errors:
- Make sure `FRONTEND_URL` exactly matches your Vercel URL (no trailing slash)
- Check Railway logs for startup errors
- Verify all required variables are set
