# Complete Beginner's Setup Guide

Welcome! This guide will walk you through everything step-by-step. No prior knowledge needed! 🚀

## What You're Building

You have a complete **Vider Transport Marketplace** application with:
- ✅ Backend API (Node.js + TypeScript)
- ✅ Frontend (React + TypeScript)
- ✅ Database (PostgreSQL)
- ✅ CI/CD Pipeline (GitHub Actions)
- ✅ Complete documentation

## Setup Overview

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: Push to GitHub (Required)                      │
│  ├─ Create GitHub repository                            │
│  ├─ Connect your local code                             │
│  └─ Push your code                                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Step 2: GitHub Actions Setup (Optional for now)        │
│  ├─ Workflows run automatically with defaults           │
│  ├─ Add custom secrets (optional)                       │
│  └─ Set up branch protection (recommended)              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Step 3: Local Development (When you want to code)      │
│  ├─ Install dependencies                                │
│  ├─ Set up database                                     │
│  ├─ Create .env file with secrets                       │
│  └─ Run the application                                 │
└─────────────────────────────────────────────────────────┘
```

## Step 1: Push Your Code to GitHub (START HERE!)

### 1.1 Create a GitHub Repository

1. **Go to GitHub:** https://github.com
2. **Sign in** (or create an account if you don't have one)
3. **Click the + icon** in the top right corner
4. **Select "New repository"**
5. **Fill in the details:**
   ```
   Repository name: vider-transport-marketplace
   Description: Peer-to-peer marketplace for Norwegian transport companies
   Visibility: Choose "Public" or "Private"
   
   ⚠️ IMPORTANT: Do NOT check any boxes!
   ❌ Don't add README
   ❌ Don't add .gitignore
   ❌ Don't add license
   ```
6. **Click "Create repository"**

### 1.2 Connect and Push Your Code

After creating the repository, GitHub will show you a page with commands. 

**Copy your repository URL** - it looks like:
```
https://github.com/YOUR_USERNAME/vider-transport-marketplace.git
```

**Open your terminal** and run these commands (replace YOUR_USERNAME with your actual GitHub username):

```bash
# Connect your local code to GitHub
git remote add origin https://github.com/YOUR_USERNAME/vider-transport-marketplace.git

# Push your code to GitHub
git push -u origin main
```

**If you get an authentication error:**
- GitHub will ask for your username and password
- For password, you need a **Personal Access Token** (not your GitHub password)
- See "Authentication Help" section below

### 1.3 Verify Upload

1. **Refresh your GitHub repository page**
2. **You should see all your files!** (201 files uploaded)
3. **Check that `.github/workflows` folder exists**
4. **Click on "Actions" tab** - you should see it's available

**🎉 Congratulations! Your code is now on GitHub!**

## Step 2: Understanding GitHub Actions (No Action Needed Yet!)

### What Happens Automatically

Once your code is on GitHub, the CI/CD pipeline is **already working**! Here's what happens:

```
When you push code or create a Pull Request:
  ↓
GitHub Actions automatically runs:
  ├─ Lint Workflow (checks code style)
  ├─ Test Workflow (runs all tests)
  └─ CI Workflow (comprehensive checks)
  ↓
All checks must pass ✅
  ↓
Code is safe to merge!
```

### Do You Need JWT Secrets for GitHub Actions?

**NO!** The workflows already have default test secrets:
- `JWT_SECRET: test-jwt-secret-key-for-ci`
- `JWT_REFRESH_SECRET: test-jwt-refresh-secret-key-for-ci`

These are **automatically used** for testing. You don't need to configure anything!

### When to Add Custom Secrets (Optional)

You only need to add secrets to GitHub if:
1. You want to use your own custom secrets for testing (optional)
2. You're deploying to production (later)

**For now, skip this step!** The defaults work perfectly.

## Step 3: Local Development Setup (When You Want to Code)

### 3.1 Prerequisites

Make sure you have installed:
- ✅ Node.js (version 20 or higher)
- ✅ PostgreSQL (version 15 or higher)
- ✅ Git

**Check your versions:**
```bash
node --version    # Should show v20.x.x or higher
npm --version     # Should show 10.x.x or higher
psql --version    # Should show 15.x or higher
git --version     # Should show 2.x.x or higher
```

### 3.2 Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3.3 Set Up Database

1. **Start PostgreSQL** (if not running)
   ```bash
   # On Mac with Homebrew:
   brew services start postgresql@15
   
   # On Linux:
   sudo systemctl start postgresql
   ```

2. **Create database:**
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database (in psql prompt)
   CREATE DATABASE vider_dev;
   
   # Exit psql
   \q
   ```

3. **Run migrations:**
   ```bash
   npm run migrate
   ```

### 3.4 Create .env File with Secrets

1. **Generate JWT secrets:**
   ```bash
   # Run this command TWICE to get two different secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Create `.env` file** in your project root:
   ```env
   # Database
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vider_dev
   
   # JWT Secrets (paste your generated secrets here)
   JWT_SECRET=paste-your-first-secret-here
   JWT_REFRESH_SECRET=paste-your-second-secret-here
   
   # Server
   NODE_ENV=development
   PORT=3000
   ```

3. **Save the file**

### 3.5 Run the Application

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Open your browser:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

**🎉 Your app is running!**

## Quick Reference: What Are These Secrets?

### JWT Secrets Explained Simply

Think of JWT secrets like a **secret stamp** that your app uses:

1. **User logs in** → App creates a token (like a temporary ID card)
2. **Token is stamped** with your secret (like a security hologram)
3. **User makes requests** → Sends the token
4. **App checks the stamp** → Verifies it's real using the secret

**Without the secret, anyone could create fake tokens!**

### Where Secrets Are Used

```
┌─────────────────────────────────────────────────────────┐
│  Local Development (.env file)                          │
│  ├─ You create this file                                │
│  ├─ Contains your generated secrets                     │
│  └─ Used when running app on your computer              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  GitHub Actions (Automatic)                             │
│  ├─ Uses default test secrets                           │
│  ├─ No configuration needed                             │
│  └─ Works automatically when you push code              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Production Server (Later)                              │
│  ├─ Different secrets from development                  │
│  ├─ Set as environment variables on server              │
│  └─ Never commit to Git                                 │
└─────────────────────────────────────────────────────────┘
```

## Authentication Help (If Needed)

### If Git Push Asks for Password

GitHub no longer accepts passwords for Git operations. You need a **Personal Access Token (PAT)**.

**Create a Personal Access Token:**

1. Go to GitHub → Click your profile picture → **Settings**
2. Scroll down → Click **Developer settings** (bottom left)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token (classic)**
5. Give it a name: "Vider Project"
6. Select scopes: Check **repo** (full control of private repositories)
7. Click **Generate token**
8. **Copy the token** (you won't see it again!)

**Use the token:**
- When Git asks for password, paste the token instead
- Username: your GitHub username
- Password: paste the token

**Save the token:**
```bash
# Tell Git to remember your credentials
git config --global credential.helper store
```

## Common Questions

### Q: Do I need to configure secrets right now?

**A:** Only if you want to run the app locally. For just pushing to GitHub, no secrets needed!

### Q: What if I skip the secrets step?

**A:** GitHub Actions will still work (uses defaults). You just can't run the app locally until you add secrets.

### Q: Can I use simple secrets like "secret123"?

**A:** For learning, yes. For production, absolutely not! Use the generated random secrets.

### Q: What if I accidentally commit my .env file?

**A:** Don't worry! It's in `.gitignore`, so Git won't track it. But if you did commit it:
1. Generate new secrets
2. Update your `.env` file
3. Remove the file from Git history (ask for help if needed)

### Q: How do I know if everything is working?

**A:** After pushing to GitHub:
1. Go to your repository
2. Click "Actions" tab
3. You should see workflows running or completed
4. Green checkmarks ✅ mean everything works!

## What to Do Next

### Immediate Next Steps:
1. ✅ Push your code to GitHub (Step 1)
2. ✅ Verify workflows are running (check Actions tab)
3. ⏳ Set up local development when you want to code (Step 3)

### Optional Enhancements:
- Set up branch protection rules (see `.github/BRANCH_PROTECTION.md`)
- Add status badges to README (see `GITHUB_SETUP.md`)
- Configure deployment (see `CI_CD_SETUP.md`)

## Getting Help

### Documentation Files:
- **JWT_SECRETS_GUIDE.md** - Detailed guide about JWT secrets
- **GITHUB_SETUP.md** - Complete GitHub setup instructions
- **CI_CD_SETUP.md** - Full CI/CD pipeline documentation
- **.github/QUICK_START.md** - 5-minute quick start guide

### If You're Stuck:
1. Read the error message carefully
2. Check the relevant documentation file
3. Search Google for the error message
4. Ask on Stack Overflow
5. Check GitHub Issues for similar problems

## Success Checklist

- [ ] Code pushed to GitHub
- [ ] Can see files on GitHub
- [ ] Actions tab is available
- [ ] Workflows are running (or completed)
- [ ] (Optional) Local development set up
- [ ] (Optional) App running locally

## You're Doing Great! 🎉

Remember:
- **Start simple** - Just push to GitHub first
- **Take it step by step** - Don't try to do everything at once
- **It's okay to not understand everything** - You'll learn as you go
- **The defaults work** - You don't need to configure everything immediately

**Your CI/CD pipeline is already protecting your code quality!**

---

**Need more help?** Check out the other documentation files or ask questions!
