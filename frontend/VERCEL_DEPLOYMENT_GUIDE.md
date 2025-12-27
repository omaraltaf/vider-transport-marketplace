# 🎨 Frontend Deployment Guide (Vercel)

## 🚀 Quick Vercel Deployment

### Step 1: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. **Import Project** → **GitHub** → Select your repository
3. **Framework Preset**: Vite
4. **Root Directory**: `frontend`
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`

### Step 2: Environment Variables

Add these in Vercel → Settings → Environment Variables:

**Copy-paste each variable:**

```
VITE_API_BASE_URL=https://your-railway-backend.railway.app/api
```

```
VITE_BACKEND_URL=https://your-railway-backend.railway.app
```

```
VITE_FRONTEND_URL=https://vider-transport-marketplace.vercel.app
```

```
VITE_ENVIRONMENT=production
```

```
VITE_REFRESH_INTERVAL=30000
```

```
VITE_NOTIFICATION_TIMEOUT=5000
```

```
VITE_AUTO_REFRESH=true
```

```
VITE_MOCK_DATA=false
```

```
VITE_CURRENCY=NOK
```

### Step 3: Update Backend URL

**IMPORTANT**: Replace `your-railway-backend.railway.app` with your actual Railway backend URL from the Railway dashboard.

### Step 4: Deploy

1. Click **Deploy** in Vercel
2. Wait for build to complete
3. Test your frontend URL

## ✅ Checklist

- [ ] Vercel project connected to GitHub
- [ ] Framework preset: Vite
- [ ] Root directory: frontend  
- [ ] Build command: npm run build
- [ ] Output directory: dist
- [ ] All 9 environment variables added
- [ ] Backend URL updated with actual Railway URL
- [ ] Deployment successful
- [ ] Frontend loads correctly
- [ ] API calls work

## 🔄 After Frontend Deployment

1. **Get your Vercel URL** (e.g., `https://vider-transport-marketplace.vercel.app`)
2. **Update Railway backend** `FRONTEND_URL` environment variable
3. **Update backend CORS** to allow your Vercel domain
4. **Test full integration**

## 🧪 Testing

Visit your Vercel URL and test:
- [ ] Website loads
- [ ] Login works
- [ ] Data displays
- [ ] All features functional

---

**Frontend deployment is complete when all tests pass!**