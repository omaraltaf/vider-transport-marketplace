# Vider Deployment Guide

This guide will help you deploy your Vider transport marketplace application to production.

## Overview

Your application consists of:
- **Backend**: Node.js/Express API (TypeScript)
- **Frontend**: React/Vite application (TypeScript)
- **Database**: PostgreSQL
- **File Storage**: Local uploads (needs cloud storage for production)

## Deployment Options

### Option 1: Vercel + Railway (Recommended for Beginners)

**Best for**: Quick deployment, automatic scaling, minimal DevOps

#### Step 1: Deploy Database (Railway)

1. Go to [Railway.app](https://railway.app) and sign up
2. Create a new project
3. Add PostgreSQL database
4. Copy the connection string (DATABASE_URL)

#### Step 2: Deploy Backend (Railway)

1. In your Railway project, click "New Service" → "GitHub Repo"
2. Connect your GitHub repository
3. Configure environment variables:
   ```
   DATABASE_URL=<from Railway PostgreSQL>
   JWT_SECRET=<generate a secure random string>
   JWT_REFRESH_SECRET=<generate another secure random string>
   FRONTEND_URL=https://your-app.vercel.app
   NODE_ENV=production
   PORT=3000
   ```
4. Add build command: `npm run build`
5. Add start command: `npm start`
6. Deploy!

#### Step 3: Deploy Frontend (Vercel)

1. Go to [Vercel.com](https://vercel.com) and sign up
2. Import your GitHub repository
3. Configure:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
5. Deploy!

**Cost**: Free tier available for both services

---

### Option 2: DigitalOcean App Platform (All-in-One)

**Best for**: Single platform management, predictable pricing

1. Go to [DigitalOcean](https://www.digitalocean.com)
2. Create an App
3. Connect your GitHub repository
4. Configure components:

**Database Component**:
- Type: PostgreSQL
- Plan: Basic ($15/month)

**Backend Component**:
- Type: Web Service
- Build Command: `npm run build`
- Run Command: `npm start`
- Environment Variables: (same as above)

**Frontend Component**:
- Type: Static Site
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`

**Cost**: ~$20-30/month

---

### Option 3: AWS (Most Scalable)

**Best for**: Enterprise needs, full control

- **Frontend**: S3 + CloudFront
- **Backend**: Elastic Beanstalk or ECS
- **Database**: RDS PostgreSQL
- **File Storage**: S3

**Cost**: Variable, ~$30-100/month depending on usage

---

## Pre-Deployment Checklist

### 1. Environment Variables

Create production environment variables:

```bash
# Backend (.env.production)
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=<64-character-random-string>
JWT_REFRESH_SECRET=<64-character-random-string>
FRONTEND_URL=https://your-domain.com
NODE_ENV=production
PORT=3000

# Email (if using)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
SMTP_FROM=noreply@yourdomain.com

# File uploads (use cloud storage)
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=eu-north-1
AWS_S3_BUCKET=vider-uploads
```

```bash
# Frontend (.env.production)
VITE_API_URL=https://api.yourdomain.com/api
```

### 2. Update CORS Settings

Update `src/index.ts` to allow your frontend domain:

```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
```

### 3. Database Migration

Run migrations on production database:

```bash
npx prisma migrate deploy
npx prisma db seed  # Optional: seed initial data
```

### 4. Build Scripts

Ensure your `package.json` has production build scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "postinstall": "prisma generate"
  }
}
```

### 5. File Upload Strategy

**Current**: Files stored locally in `uploads/` folder
**Production**: Use cloud storage (S3, Cloudinary, etc.)

You'll need to update file upload logic to use cloud storage.

---

## Step-by-Step: Quick Deploy with Vercel + Railway

### 1. Prepare Your Code

```bash
# Commit all changes
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Deploy Database (5 minutes)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Provision PostgreSQL"
4. Click on PostgreSQL → "Connect" → Copy the connection string
5. Save this as your `DATABASE_URL`

### 3. Deploy Backend (10 minutes)

1. In Railway, click "New" → "GitHub Repo"
2. Select your repository
3. Railway will auto-detect Node.js
4. Go to "Variables" tab and add:
   - `DATABASE_URL`: (from step 2)
   - `JWT_SECRET`: Generate with `openssl rand -base64 64`
   - `JWT_REFRESH_SECRET`: Generate with `openssl rand -base64 64`
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: `https://your-app.vercel.app` (we'll get this in step 4)
5. Go to "Settings" → Add custom start command: `npm start`
6. Click "Deploy"
7. Once deployed, copy your backend URL (e.g., `https://vider-backend.railway.app`)

### 4. Deploy Frontend (10 minutes)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variable:
   - `VITE_API_URL`: `https://vider-backend.railway.app/api` (from step 3)
6. Click "Deploy"
7. Once deployed, copy your frontend URL
8. Go back to Railway and update `FRONTEND_URL` variable with this URL

### 5. Run Database Migrations

```bash
# Set your production database URL
export DATABASE_URL="<your-railway-postgres-url>"

# Run migrations
npx prisma migrate deploy

# Optional: Seed with initial data
npx prisma db seed
```

### 6. Test Your Deployment

1. Visit your Vercel URL
2. Try registering a new account
3. Test creating a vehicle listing
4. Test the search functionality

---

## Custom Domain Setup

### For Vercel (Frontend)

1. Go to your project → "Settings" → "Domains"
2. Add your domain (e.g., `vider.no`)
3. Update DNS records as instructed
4. SSL certificate is automatic

### For Railway (Backend)

1. Go to your service → "Settings" → "Domains"
2. Add custom domain (e.g., `api.vider.no`)
3. Update DNS records
4. Update `FRONTEND_URL` in Railway and `VITE_API_URL` in Vercel

---

## Production Optimizations

### 1. Enable Compression

Already configured in your Express app with `compression` middleware.

### 2. Rate Limiting

Already configured in `src/middleware/rate-limit.middleware.ts`.

### 3. Security Headers

Add helmet middleware (already installed):

```typescript
import helmet from 'helmet';
app.use(helmet());
```

### 4. Logging

Consider adding production logging:
- [Sentry](https://sentry.io) for error tracking
- [LogRocket](https://logrocket.com) for session replay
- [Datadog](https://www.datadoghq.com) for monitoring

### 5. Database Connection Pooling

Update Prisma configuration for production:

```typescript
// src/db/client.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
```

---

## Monitoring & Maintenance

### Health Checks

Your app already has a health endpoint at `/api/health`.

Configure uptime monitoring:
- [UptimeRobot](https://uptimerobot.com) (Free)
- [Pingdom](https://www.pingdom.com)
- [Better Uptime](https://betteruptime.com)

### Database Backups

**Railway**: Automatic daily backups on paid plans
**DigitalOcean**: Automatic daily backups included
**AWS RDS**: Configure automated backups

### SSL Certificates

All recommended platforms provide automatic SSL certificates via Let's Encrypt.

---

## Troubleshooting

### Backend won't start

1. Check Railway logs: Click on your service → "Deployments" → View logs
2. Verify all environment variables are set
3. Ensure `DATABASE_URL` is correct
4. Check that migrations ran successfully

### Frontend can't connect to backend

1. Verify `VITE_API_URL` is correct in Vercel
2. Check CORS settings in backend
3. Ensure backend is running (check Railway)
4. Check browser console for errors

### Database connection errors

1. Verify `DATABASE_URL` format
2. Check if database is running (Railway dashboard)
3. Ensure IP whitelist allows connections (if applicable)
4. Test connection locally with the production URL

### File uploads not working

Production needs cloud storage. Quick fix:
1. Sign up for [Cloudinary](https://cloudinary.com) (free tier)
2. Install: `npm install cloudinary multer-storage-cloudinary`
3. Update upload middleware to use Cloudinary

---

## Cost Estimate

### Free Tier (Good for MVP/Testing)
- Railway: Free tier (500 hours/month)
- Vercel: Free tier (unlimited)
- **Total**: $0/month

### Starter Production (Good for launch)
- Railway: $5/month (database) + $5/month (backend)
- Vercel: Free tier
- **Total**: ~$10/month

### Growing Business
- Railway: $20/month (database) + $10/month (backend)
- Vercel: Pro $20/month
- Cloudinary: $89/month (for file storage)
- **Total**: ~$140/month

---

## Next Steps

1. Choose your deployment platform
2. Set up accounts and billing
3. Follow the step-by-step guide above
4. Configure custom domain (optional)
5. Set up monitoring
6. Test thoroughly
7. Launch! 🚀

## Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment

Good luck with your launch! 🎉
