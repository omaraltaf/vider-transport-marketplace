# CI/CD Quick Start Guide

Get your CI/CD pipeline up and running in 5 minutes!

## Step 1: Enable GitHub Actions (Already Done ✅)

GitHub Actions is enabled by default. No action needed.

## Step 2: Configure Secrets (2 minutes)

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add these secrets (optional, defaults provided for testing):

```
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
```

For deployment, also add:
```
VITE_API_URL=https://api.yourdomain.com
PRODUCTION_URL=https://yourdomain.com
```

## Step 3: Set Up Branch Protection (3 minutes)

1. Go to **Settings → Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Check these boxes:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
5. In "Status checks that are required", search and select:
   - `quality-checks`
   - `lint-backend`
   - `lint-frontend`
   - `test-backend`
   - `build-backend`
   - `build-frontend`
6. Check:
   - ✅ Require conversation resolution before merging
7. Click **Create**

Repeat for `develop` branch (select fewer checks: quality-checks, lint-backend, lint-frontend, test-backend)

## Step 4: Test the Pipeline (1 minute)

1. Create a new branch:
   ```bash
   git checkout -b test-ci-pipeline
   ```

2. Make a small change (e.g., add a comment to README.md)

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify CI/CD pipeline"
   git push origin test-ci-pipeline
   ```

4. Create a Pull Request on GitHub

5. Watch the workflows run in the **Actions** tab

6. All checks should pass ✅

## Step 5: Configure Deployment (Optional)

See `CI_CD_SETUP.md` for detailed deployment configuration options:
- SSH deployment to VPS
- Docker deployment
- Cloud platforms (AWS, Azure, GCP)

## What Happens Now?

### On Every Push/PR to main or develop:
- ✅ Code is automatically linted
- ✅ All tests run with PostgreSQL database
- ✅ TypeScript is type-checked
- ✅ Backend and frontend are built

### On Push to main:
- ✅ Production artifacts are built
- ✅ Deployment workflow runs (configure in build-deploy.yml)

### Branch Protection Ensures:
- ❌ No direct pushes to main/develop
- ✅ All PRs require approval
- ✅ All checks must pass before merge
- ✅ Conversations must be resolved

## Workflow Status Badges

Add these to your README.md:

```markdown
[![CI](https://github.com/USERNAME/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/ci.yml)
[![Lint](https://github.com/USERNAME/REPO/actions/workflows/lint.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/lint.yml)
[![Test](https://github.com/USERNAME/REPO/actions/workflows/test.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/test.yml)
```

Replace `USERNAME` and `REPO` with your GitHub username and repository name.

## Common Commands

```bash
# Run linting locally
npm run lint
cd frontend && npm run lint

# Run tests locally
npm test

# Build locally
npm run build
cd frontend && npm run build

# Type check locally
npx tsc --noEmit
cd frontend && npx tsc -b --noEmit
```

## Troubleshooting

### Workflows not running?
- Check that GitHub Actions is enabled in Settings → Actions

### Tests failing in CI but passing locally?
- Ensure you're using the same Node.js version (20)
- Check environment variables match

### Can't merge PR?
- Ensure all required checks pass
- Resolve all conversations
- Get required approvals

## Need Help?

- 📖 Full documentation: `CI_CD_SETUP.md`
- 🔧 Workflow details: `.github/workflows/README.md`
- 🛡️ Branch protection: `.github/BRANCH_PROTECTION.md`
- 🐛 Open an issue using the bug report template

## Next Steps

1. ✅ Configure secrets
2. ✅ Set up branch protection
3. ✅ Test with a PR
4. ⏳ Configure deployment
5. ⏳ Add status badges to README
6. ⏳ Train team on workflow

## Success! 🎉

Your CI/CD pipeline is now active and protecting your codebase!
