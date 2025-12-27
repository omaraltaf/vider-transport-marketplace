# 🚀 Full-Stack Deployment Guide - Vider Platform

This is a **complete full-stack application** that requires deploying multiple components:

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React/Vite)  │────│  (Express.js)   │────│  (PostgreSQL)   │
│   Vercel        │    │   Railway       │    │   Railway       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Caching)     │
                       │   Railway       │
                       └─────────────────┘
```

## 🎯 Deployment Strategy

### 1. **Backend API** → Railway
- Express.js server with REST API
- Database migrations and seeding
- File uploads and business logic
- Authentication and authorization

### 2. **Frontend** → Vercel  
- React SPA with Vite build
- Static asset hosting
- CDN distribution
- Automatic deployments from Git

### 3. **Database** → Railway PostgreSQL
- Primary data storage
- Automatic backups
- Connection pooling

### 4. **Redis** → Railway Redis
- Session caching
- Rate limiting
- Performance optimization

---

## 🔧 Step 1: Backend Deployment (Railway)

### A. Add Services to Railway Project

1. **PostgreSQL Database**
   - In Railway dashboard: **+ New** → **Database** → **Add PostgreSQL**

2. **Redis Cache**  
   - In Railway dashboard: **+ New** → **Database** → **Add Redis**

### B. Backend Environment Variables

Add these in Railway Variables tab:

```bash
# Database (Auto-provided by Railway)
DATABASE_URL=postgresql://...

# Redis (Auto-provided by Railway)  
REDIS_URL=redis://...

# JWT Configuration
JWT_SECRET=nA0gZ6/7A270dekoIjznuKWgQ7HqMaebD9V9pdeaMpg=
JWT_REFRESH_SECRET=f32I6jFsMwj0pW8Mgs0fqaU1FC5KLWsxlNLjP7MgBv4=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://vider-transport-marketplace.vercel.app

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=noreply@vider.no

# Platform Configuration
PLATFORM_COMMISSION_RATE=5
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
DEFAULT_CURRENCY=NOK
MIN_BOOKING_AMOUNT=500
MAX_BOOKING_AMOUNT=100000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT_MINUTES=60
MAX_LOGIN_ATTEMPTS=5
PASSWORD_MIN_LENGTH=8
```

---

## 🎨 Step 2: Frontend Deployment (Vercel)

### A. Deploy Frontend to Vercel

1. **Connect GitHub Repository**
   ```bash
   # In Vercel dashboard
   1. Import Project → GitHub → Select your repository
   2. Framework Preset: Vite
   3. Root Directory: frontend
   4. Build Command: npm run build
   5. Output Directory: dist
   ```

2. **Environment Variables for Frontend**
   
   Add these in Vercel dashboard → Settings → Environment Variables:

   ```bash
   # API Configuration (Update with your Railway backend URL)
   VITE_API_BASE_URL=https://your-railway-backend.railway.app/api
   VITE_BACKEND_URL=https://your-railway-backend.railway.app
   VITE_FRONTEND_URL=https://vider-transport-marketplace.vercel.app
   VITE_ENVIRONMENT=production

   # UI Configuration
   VITE_REFRESH_INTERVAL=30000
   VITE_NOTIFICATION_TIMEOUT=5000
   VITE_AUTO_REFRESH=true
   VITE_MOCK_DATA=false
   VITE_CURRENCY=NOK
   ```

### B. Update Backend CORS Configuration

Update your backend to allow the Vercel frontend URL:

```typescript
// In your backend CORS configuration
const corsOptions = {
  origin: [
    'https://vider-transport-marketplace.vercel.app',
    'http://localhost:5173' // For development
  ],
  credentials: true
};
```

---

## 🔄 Step 3: Update Cross-Service Configuration

### A. Update Frontend Environment

Update `frontend/.env.production` with your actual Railway backend URL:

```bash
VITE_API_BASE_URL=https://your-actual-railway-domain.railway.app/api
VITE_BACKEND_URL=https://your-actual-railway-domain.railway.app
```

### B. Update Backend Environment

Update Railway backend `FRONTEND_URL` with your actual Vercel URL:

```bash
FRONTEND_URL=https://your-actual-vercel-domain.vercel.app
```

---

## 📋 Deployment Checklist

### Backend (Railway)
- [ ] PostgreSQL database service added
- [ ] Redis cache service added  
- [ ] All environment variables configured (22 variables)
- [ ] Backend deployed successfully
- [ ] Database migrations completed
- [ ] Health endpoint responding: `/health`
- [ ] API endpoints responding: `/api/auth/health`

### Frontend (Vercel)
- [ ] GitHub repository connected
- [ ] Build configuration set (Vite, frontend/, dist/)
- [ ] Environment variables configured (7 variables)
- [ ] Frontend deployed successfully
- [ ] Static assets loading correctly
- [ ] API calls working to backend

### Integration
- [ ] CORS configured for Vercel domain
- [ ] Frontend can authenticate with backend
- [ ] File uploads working
- [ ] Real-time features working (if using WebSocket)

---

## 🧪 Testing the Full Stack

### 1. Test Backend API
```bash
# Health check
curl https://your-railway-backend.railway.app/health

# API health
curl https://your-railway-backend.railway.app/api/auth/health
```

### 2. Test Frontend
```bash
# Visit your Vercel URL
https://your-vercel-frontend.vercel.app

# Test login functionality
# Test API integration
```

### 3. Test Integration
- [ ] Login from frontend works
- [ ] Data loads from backend
- [ ] File uploads work
- [ ] All features functional

---

## 🚨 Common Issues & Solutions

### Issue: CORS Errors
**Solution**: Update backend CORS to include Vercel domain

### Issue: API Calls Failing
**Solution**: Check `VITE_API_BASE_URL` in Vercel environment variables

### Issue: Authentication Not Working
**Solution**: Ensure JWT secrets match between environments

### Issue: File Uploads Failing  
**Solution**: Check Railway file upload limits and paths

---

## 🎉 Success Indicators

### Backend Success:
- ✅ Railway shows "Deployed" status
- ✅ PostgreSQL and Redis connected
- ✅ Health endpoints respond
- ✅ Database migrations completed

### Frontend Success:
- ✅ Vercel shows "Deployed" status  
- ✅ Website loads correctly
- ✅ API calls work
- ✅ Authentication functional

### Full Integration Success:
- ✅ Users can register/login
- ✅ Data displays correctly
- ✅ All features work end-to-end
- ✅ Performance is good

---

## 📞 Next Steps

1. **Deploy Backend First** (Railway with PostgreSQL + Redis)
2. **Get Backend URL** from Railway deployment
3. **Update Frontend Environment** with backend URL
4. **Deploy Frontend** to Vercel
5. **Update Backend CORS** with frontend URL
6. **Test Full Integration**

**Need the specific Railway backend URL?** Check your Railway dashboard after backend deployment completes.