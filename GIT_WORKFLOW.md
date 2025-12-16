# Git Workflow for Production Deployment

## Branch Strategy

### Main Branches
- **`main`**: Development branch - all feature development happens here
- **`production`**: Production branch - only production-ready code
- **`staging`**: Staging branch - for testing before production (optional)

### Feature Branches
- **`feature/feature-name`**: New features
- **`fix/bug-description`**: Bug fixes
- **`hotfix/critical-fix`**: Critical production fixes

## Deployment Workflow

### 1. Development to Main
```bash
# Create feature branch
git checkout -b feature/new-feature
git push -u origin feature/new-feature

# Work on feature, commit changes
git add .
git commit -m "feat: implement new feature"
git push origin feature/new-feature

# Create pull request to main
# After review and approval, merge to main
```

### 2. Main to Production
```bash
# Switch to main and pull latest
git checkout main
git pull origin main

# Create production branch or switch to existing
git checkout -b production  # First time
# OR
git checkout production     # Existing branch
git merge main

# Push to production branch
git push origin production
```

### 3. Automated Deployment
- GitHub Actions will automatically deploy when code is pushed to `production` branch
- Railway will automatically deploy from the connected branch

## Pre-Deployment Commands

### 1. Prepare Repository
```bash
# Ensure all changes are committed
git status

# Run local tests
npm test

# Build locally to verify
npm run build

# Check for security vulnerabilities
npm audit

# Commit final changes
git add .
git commit -m "feat: production-ready deployment with password functionality"
```

### 2. Update Version (Optional)
```bash
# Update package.json version
npm version patch  # or minor/major
git push origin main --tags
```

### 3. Deploy to Production
```bash
# Use the deployment script
./scripts/deploy-production.sh

# OR manual deployment
git checkout production
git merge main
git push origin production
```

## Environment Setup Commands

### 1. Generate Production Secrets
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate other secrets as needed
openssl rand -base64 32
```

### 2. Database Migration Commands
```bash
# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed initial data (if needed)
npm run db:seed
```

## Quick Deployment Commands

### Railway Deployment
```bash
# 1. Commit and push changes
git add .
git commit -m "feat: ready for production deployment"
git push origin main

# 2. Merge to production branch
git checkout production
git merge main
git push origin production

# 3. Railway auto-deploys from production branch
# Monitor deployment in Railway dashboard
```

### Manual Verification
```bash
# Check deployment status
curl https://your-domain.com/health

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Check admin panel (in browser)
open https://your-domain.com/admin
```

## Rollback Procedure

### Quick Rollback
```bash
# Find last working commit
git log --oneline

# Reset production branch to working commit
git checkout production
git reset --hard <working-commit-hash>
git push origin production --force

# Railway will automatically redeploy
```

### Database Rollback
```bash
# If database migration needs rollback
# Create migration to undo changes
npx prisma migrate dev --name rollback_feature_name

# Apply rollback migration
npx prisma migrate deploy
```

## Monitoring Commands

### Check Application Health
```bash
# Health endpoint
curl https://your-domain.com/health

# Check specific functionality
curl https://your-domain.com/api/platform-admin/users/statistics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### View Logs
```bash
# Railway logs (if using Railway CLI)
railway logs

# Or check Railway dashboard for logs
```

## Hotfix Workflow

### Critical Production Fix
```bash
# Create hotfix branch from production
git checkout production
git checkout -b hotfix/critical-fix

# Make minimal fix
git add .
git commit -m "hotfix: fix critical production issue"

# Push and create PR
git push origin hotfix/critical-fix

# After approval, merge to both production and main
git checkout production
git merge hotfix/critical-fix
git push origin production

git checkout main
git merge hotfix/critical-fix
git push origin main

# Delete hotfix branch
git branch -d hotfix/critical-fix
git push origin --delete hotfix/critical-fix
```

## Repository Setup for New Team Members

### Initial Setup
```bash
# Clone repository
git clone https://github.com/yourusername/vider-app.git
cd vider-app

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with local development values

# Setup database
npx prisma migrate dev
npx prisma generate
npm run db:seed

# Start development server
npm run dev
```

### Production Access Setup
```bash
# Install Railway CLI (if using Railway)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link
```

## Current Status

### ✅ Production Ready Features
- User authentication and authorization
- Password functionality (creation, reset, temporary passwords)
- Platform admin dashboard
- User management system
- Company management
- Database migrations
- Security measures
- Error handling and logging

### 🚀 Ready for Deployment
The application is **production-ready** and can be deployed immediately using the commands above.

### 📋 Post-Deployment Tasks
1. Configure custom domain
2. Set up monitoring and alerts
3. Configure backup strategy
4. Set up SSL certificates (automatic with Railway)
5. Create initial admin user
6. Test all functionality in production

---

## Quick Start for Production Deployment

```bash
# 1. Final preparation
git add .
git commit -m "feat: production deployment ready"
git push origin main

# 2. Deploy to production
./scripts/deploy-production.sh

# 3. Verify deployment
curl https://your-domain.com/health

# 4. Access admin panel
open https://your-domain.com/admin
```

**The application is now ready for production deployment!** 🚀