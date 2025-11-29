# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Vider Transport Marketplace platform.

## Workflows Overview

### 1. CI Workflow (`ci.yml`)

**Purpose:** Comprehensive quality checks for all code changes

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

**Jobs:**
- Lint backend code
- Lint frontend code
- Run backend tests with PostgreSQL
- Build backend
- Build frontend
- TypeScript type checking

**Duration:** ~5-8 minutes

### 2. Lint Workflow (`lint.yml`)

**Purpose:** Fast code quality checks

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

**Jobs:**
- Backend ESLint checks
- Frontend ESLint checks

**Duration:** ~2-3 minutes

### 3. Test Workflow (`test.yml`)

**Purpose:** Run comprehensive test suite

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

**Jobs:**
- Backend unit tests
- Backend integration tests
- Property-based tests
- Coverage reporting

**Duration:** ~4-6 minutes

### 4. Build and Deploy Workflow (`build-deploy.yml`)

**Purpose:** Build artifacts and deploy to production

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

**Jobs:**
- Build backend
- Build frontend
- Deploy to production (requires configuration)

**Duration:** ~5-10 minutes (excluding deployment)

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Code Push/PR                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Parallel Execution                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Lint   │  │   Test   │  │    CI    │             │
│  │ Workflow │  │ Workflow │  │ Workflow │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              All Checks Must Pass                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Merge to Main Branch                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│           Build and Deploy Workflow                      │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Build Backend│  │Build Frontend│                    │
│  └──────────────┘  └──────────────┘                    │
│                          │                               │
│                          ▼                               │
│                  ┌──────────────┐                       │
│                  │    Deploy    │                       │
│                  └──────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

## Environment Setup

### Required Secrets

Configure these in **Settings → Secrets and variables → Actions**:

#### For Testing
- `JWT_SECRET` (optional, defaults to test value)
- `JWT_REFRESH_SECRET` (optional, defaults to test value)

#### For Deployment
- `VITE_API_URL` - Production API URL
- `PRODUCTION_URL` - Production environment URL
- `DEPLOY_HOST` - Server hostname (if using SSH)
- `DEPLOY_USER` - Server username (if using SSH)
- `DEPLOY_KEY` - SSH private key (if using SSH)
- `CODECOV_TOKEN` - Codecov token (optional)

### Environment Variables

Workflows automatically set these variables:

```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vider_test
JWT_SECRET: test-jwt-secret-key-for-ci
JWT_REFRESH_SECRET: test-jwt-refresh-secret-key-for-ci
NODE_ENV: test
```

## Services

### PostgreSQL Database

All test workflows include a PostgreSQL 15 service:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: vider_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

## Caching Strategy

Workflows use npm caching to speed up builds:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

This caches `node_modules` based on `package-lock.json` hash.

## Artifacts

### Backend Artifacts
- **Name:** `backend-dist`
- **Path:** `dist/`
- **Retention:** 7 days

### Frontend Artifacts
- **Name:** `frontend-dist`
- **Path:** `frontend/dist/`
- **Retention:** 7 days

## Deployment Configuration

The deployment job is currently configured as a placeholder. To enable deployment:

1. **Choose your deployment method:**
   - SSH deployment to VPS
   - Cloud provider (AWS, Azure, GCP)
   - Container registry (Docker Hub, ECR)
   - Platform as a Service (Heroku, Railway, Render)

2. **Uncomment and configure the relevant deployment steps** in `build-deploy.yml`

3. **Add required secrets** to your repository

4. **Test deployment** in a staging environment first

### Example: SSH Deployment

```yaml
- name: Deploy to server via SSH
  uses: appleboy/scp-action@v0.1.7
  with:
    host: ${{ secrets.DEPLOY_HOST }}
    username: ${{ secrets.DEPLOY_USER }}
    key: ${{ secrets.DEPLOY_KEY }}
    source: "dist/,frontend/dist/,prisma/"
    target: "/var/www/vider"

- name: Run database migrations
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.DEPLOY_HOST }}
    username: ${{ secrets.DEPLOY_USER }}
    key: ${{ secrets.DEPLOY_KEY }}
    script: |
      cd /var/www/vider
      npm ci --production
      npx prisma migrate deploy
      pm2 restart vider
```

## Monitoring

### Workflow Status

View workflow runs:
- Go to **Actions** tab in GitHub
- Select a workflow to see run history
- Click on a run to see detailed logs

### Status Badges

Add to README.md:

```markdown
[![CI](https://github.com/USERNAME/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/ci.yml)
[![Lint](https://github.com/USERNAME/REPO/actions/workflows/lint.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/lint.yml)
[![Test](https://github.com/USERNAME/REPO/actions/workflows/test.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/test.yml)
```

### Notifications

Configure workflow notifications:
1. Go to **Settings → Notifications**
2. Enable "Actions" notifications
3. Choose notification preferences

## Troubleshooting

### Common Issues

#### 1. Tests Failing in CI

**Symptom:** Tests pass locally but fail in CI

**Solutions:**
- Check environment variables are set correctly
- Verify PostgreSQL service is healthy
- Ensure database migrations run successfully
- Check for timezone or locale differences

#### 2. Build Failures

**Symptom:** Build step fails

**Solutions:**
- Verify all dependencies are in `package.json`
- Check TypeScript configuration
- Ensure Prisma client is generated
- Review build logs for specific errors

#### 3. Deployment Failures

**Symptom:** Deployment step fails

**Solutions:**
- Verify all secrets are configured
- Check server connectivity
- Review deployment logs
- Test SSH connection manually

#### 4. Slow Workflows

**Symptom:** Workflows take too long

**Solutions:**
- Review caching configuration
- Parallelize independent jobs
- Optimize test suite
- Use matrix strategy for multiple versions

### Debug Mode

Enable debug logging:

1. Go to **Settings → Secrets and variables → Actions**
2. Add repository variable: `ACTIONS_STEP_DEBUG` = `true`
3. Add repository variable: `ACTIONS_RUNNER_DEBUG` = `true`

## Best Practices

### 1. Keep Workflows Fast
- Use caching effectively
- Run jobs in parallel when possible
- Optimize test suite for speed

### 2. Fail Fast
- Run quick checks (linting) before slow ones (tests)
- Use `fail-fast: true` in matrix strategies

### 3. Security
- Never commit secrets to workflows
- Use GitHub Secrets for sensitive data
- Limit workflow permissions with `permissions:`

### 4. Maintainability
- Keep workflows DRY (Don't Repeat Yourself)
- Use reusable workflows for common tasks
- Document all custom steps

### 5. Reliability
- Pin action versions (e.g., `@v4` not `@latest`)
- Test workflow changes in feature branches
- Monitor workflow success rates

## Workflow Optimization

### Current Performance

| Workflow | Average Duration | Optimization Potential |
|----------|-----------------|------------------------|
| Lint     | 2-3 minutes     | Low                    |
| Test     | 4-6 minutes     | Medium                 |
| CI       | 5-8 minutes     | Medium                 |
| Deploy   | 5-10 minutes    | High (depends on target) |

### Optimization Strategies

1. **Caching:**
   - npm dependencies ✅ (implemented)
   - Prisma client generation (consider)
   - Build outputs (consider)

2. **Parallelization:**
   - Backend and frontend linting ✅ (implemented)
   - Multiple test suites (consider)
   - Multi-platform builds (if needed)

3. **Conditional Execution:**
   - Skip frontend build if only backend changed
   - Skip backend tests if only frontend changed
   - Use path filters in workflow triggers

## Maintenance

### Regular Tasks

- [ ] Review workflow execution times monthly
- [ ] Update action versions quarterly
- [ ] Review and optimize caching strategy
- [ ] Monitor workflow success rates
- [ ] Update Node.js version as needed

### Version Updates

When updating dependencies:
1. Update in `package.json`
2. Test locally
3. Create PR and verify CI passes
4. Monitor first production deployment

## Support

For issues with workflows:
1. Check workflow logs in Actions tab
2. Review this documentation
3. Check GitHub Actions documentation
4. Open an issue in the repository

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Branch Protection Rules](../.github/BRANCH_PROTECTION.md)
