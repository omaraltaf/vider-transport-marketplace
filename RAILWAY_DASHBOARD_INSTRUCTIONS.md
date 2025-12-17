# 📋 Railway Dashboard - Step-by-Step Instructions

**Goal**: Change the builder from Nixpacks to Dockerfile

## Visual Guide

### Step 1: Access Your Service
```
https://railway.app
  └─ Login
      └─ Select "Vider Transport Marketplace" project
          └─ Click on your backend service (the one that's crashing)
```

### Step 2: Navigate to Settings
```
Top Navigation Bar:
[Deployments] [Metrics] [Variables] [Settings] [Logs]
                                      ^^^^^^^^
                                   Click here
```

### Step 3: Find Build Configuration

Scroll down on the Settings page until you see:

```
┌─────────────────────────────────────────┐
│ Build                                    │
├─────────────────────────────────────────┤
│                                          │
│ Builder: [Nixpacks ▼]  ← CHANGE THIS   │
│                                          │
│ Change to: [Dockerfile ▼]               │
│                                          │
│ Dockerfile Path: [Dockerfile]           │
│                                          │
│ [Save Changes]                           │
└─────────────────────────────────────────┘
```

### Step 4: What to Look For

The setting might be labeled as:
- "Builder"
- "Build Method"
- "Build Provider"
- "Buildpack"

Current value will show:
- ❌ "Nixpacks" (wrong)
- ❌ "Auto" (might default to Nixpacks)

Change it to:
- ✅ "Dockerfile"
- ✅ "Docker"

### Step 5: Additional Settings to Check

While in Settings, also verify:

```
┌─────────────────────────────────────────┐
│ Deploy                                   │
├─────────────────────────────────────────┤
│                                          │
│ Start Command: [Leave empty]            │
│   ↑ Should be empty - Dockerfile        │
│     handles this with CMD                │
│                                          │
│ Build Command: [Leave empty]            │
│   ↑ Should be empty - Dockerfile        │
│     handles this                         │
└─────────────────────────────────────────┘
```

### Step 6: Save and Redeploy

After changing the builder:

1. **Click "Save" or "Update"** at the bottom of the Settings page

2. **Go to Deployments tab**:
   ```
   [Deployments] [Metrics] [Variables] [Settings] [Logs]
    ^^^^^^^^^^^
    Click here
   ```

3. **Trigger new deployment**:
   - Option A: Click "Redeploy" button on latest deployment
   - Option B: Click "Deploy" button to create new deployment
   - Option C: Wait for automatic deployment (may take a few minutes)

### Step 7: Monitor the Build

Click on the new deployment to watch logs in real-time.

#### What You Should See (Correct):
```
[Build]
Building with Dockerfile...
Step 1/15 : FROM node:20-alpine AS base
 ---> Running in abc123...
Step 2/15 : RUN apk add --no-cache openssl
 ---> Running in def456...
...
npm run build:production
Compiling TypeScript...
✓ Compilation successful
=== Checking dist/ contents ===
-rw-r--r-- app.js
-rw-r--r-- index.js
...
Docker image built successfully

[Deploy]
Starting container...
✓ Database connected successfully
🚀 Vider Platform API running on port 3000
📝 Environment: production
```

#### What You'll See If Still Wrong:
```
[Build]
Building with Nixpacks...
npm ci
npm start
Error: Cannot find module './app.ts'
```

## Troubleshooting

### If You Can't Find the Builder Setting

1. **Check Service Type**: Make sure you're looking at the backend service, not the database
2. **Check Railway Version**: Railway UI might look different, look for any "Build" or "Docker" related settings
3. **Try Railway CLI**: Use `railway up` command as alternative

### If Builder Setting Doesn't Exist

Some Railway projects might not show this setting if:
- It's auto-detected from `railway.json` (should work)
- The project is too old (might need to recreate service)

In this case, try:
1. Delete the service
2. Create a new service
3. Connect it to your GitHub repo
4. It should auto-detect the Dockerfile

### If Changes Don't Take Effect

1. **Clear Railway cache**: In Settings, look for "Clear Build Cache" button
2. **Force rebuild**: Delete the latest deployment and create a new one
3. **Check railway.json**: Ensure it's in the root of your repo

## Quick Checklist

Before you leave the Railway dashboard, verify:

- [ ] Builder is set to "Dockerfile" (not Nixpacks)
- [ ] Dockerfile Path is "Dockerfile"
- [ ] Start Command is empty (or removed)
- [ ] Build Command is empty (or removed)
- [ ] Changes are saved
- [ ] New deployment is triggered
- [ ] Build logs show "Building with Dockerfile"

## What to Report Back

Once you've made the changes, let me know:

1. ✅ Did you find the Builder setting?
2. ✅ Did you change it to Dockerfile?
3. ✅ Did you save and trigger redeploy?
4. ✅ What do the build logs show now?

---

**Next**: Watch the deployment and share the logs with me so I can confirm it's working correctly.
