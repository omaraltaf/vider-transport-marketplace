# CI/CD Pipeline Setup Guide

This document provides a comprehensive guide to the CI/CD pipeline for the Vider Transport Marketplace platform.

## Overview

The CI/CD pipeline is implemented using GitHub Actions and consists of four main workflows:

1. **Lint Workflow** - Code quality checks
2. **Test Workflow** - Automated testing with PostgreSQL
3. **CI Workflow** - Comprehensive quality checks
4. **Build and Deploy Workflow** - Production deployment

## Quick Start

### 1. Enable GitHub Actions

GitHub Actions is enabled by default for all repositories. No additional setup is required.

### 2. Configure Secrets

Navigate to **Settings → Secrets and variables → Actions** and add the following secrets:

#### Required for Testing (Optional - defaults provided)
```
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
```

#### Required for Deployment
```
VITE_API_URL=https://api.yourdomain.com
PRODUCTION_URL=https://yourdomain.com
```

#### Optional for SSH Deployment
```
DEPLOY_HOST=your-server.com
DEPLOY_USER=deploy
DEPLOY_KEY=<your-ssh-private-key>
```

#### Optional for Coverage Reports
```
CODECOV_TOKEN=<your-codecov-token>
```

### 3. Configure Branch Protection Rules

See [Branch Protection Configuration](.github/BRANCH_PROTECTION.md) for detailed instructions.

**Quick setup via GitHub UI:**

1. Go to **Settings → Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
5. Select required status checks:
   - `quality-checks`
   - `lint-backend`
   - `lint-frontend`
   - `test-backend`
   - `build-backend`
   - `build-frontend`
6. Click **Create**

Repeat for `develop` branch with fewer required checks.

## Workflow Details

### Lint Workflow

**File:** `.github/workflows/lint.yml`

**Purpose:** Fast code quality checks using ESLint

**Runs on:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Jobs:**
- `lint-backend` - Lints backend TypeScript code
- `lint-frontend` - Lints frontend React/TypeScript code

**Duration:** ~2-3 minutes

**Configuration:**
```yaml
# Backend linting uses .eslintrc.json
# Frontend linting uses eslint.config.js
```

### Test Workflow

**File:** `.github/workflows/test.yml`

**Purpose:** Run comprehensive test suite with database

**Runs on:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Jobs:**
- `test-backend` - Runs all backend tests including:
  - Unit tests
  - Integration tests
  - Property-based tests
  - Service tests

**Services:**
- PostgreSQL 15 database

**Duration:** ~4-6 minutes

**Environment Variables:**
```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vider_test
JWT_SECRET: test-jwt-secret-key-for-ci
JWT_REFRESH_SECRET: test-jwt-refresh-secret-key-for-ci
NODE_ENV: test
```

### CI Workflow

**File:** `.github/workflows/ci.yml`

**Purpose:** Comprehensive quality checks combining linting, testing, and building

**Runs on:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Jobs:**
- `quality-checks` - Runs all quality checks in sequence:
  1. Lint backend
  2. Lint frontend
  3. Generate Prisma client
  4. Run database migrations
  5. Run backend tests
  6. Build backend
  7. Build frontend
  8. TypeScript type checking

**Duration:** ~5-8 minutes

### Build and Deploy Workflow

**File:** `.github/workflows/build-deploy.yml`

**Purpose:** Build production artifacts and deploy

**Runs on:**
- Push to `main` branch only
- Manual trigger via workflow_dispatch

**Jobs:**
1. `build-backend` - Builds backend TypeScript to JavaScript
2. `build-frontend` - Builds frontend React app
3. `deploy` - Deploys to production (requires configuration)

**Artifacts:**
- Backend: `dist/` directory (7 days retention)
- Frontend: `frontend/dist/` directory (7 days retention)

**Duration:** ~5-10 minutes (excluding deployment)

## Deployment Configuration

The deployment job is currently a placeholder. To enable deployment:

### Option 1: SSH Deployment to VPS

1. Generate SSH key pair:
```bash
ssh-keygen -t ed25519 -C "github-actions" -f deploy_key
```

2. Add public key to server:
```bash
ssh-copy-id -i deploy_key.pub user@your-server.com
```

3. Add private key to GitHub Secrets as `DEPLOY_KEY`

4. Uncomment SSH deployment steps in `build-deploy.yml`:
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

### Option 2: Docker Deployment

1. Add Dockerfile to project root:
```dockerfile
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/package*.json ./
COPY --from=frontend-build /app/dist ./frontend/dist
COPY prisma ./prisma
EXPOSE 3000
CMD ["npm", "start"]
```

2. Add Docker build and push steps to workflow:
```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: your-registry/vider:latest
```

### Option 3: Cloud Platform Deployment

#### AWS Elastic Beanstalk
```yaml
- name: Deploy to AWS
  uses: einaregilsson/beanstalk-deploy@v21
  with:
    aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    application_name: vider
    environment_name: vider-prod
    version_label: ${{ github.sha }}
    region: eu-north-1
    deployment_package: deploy.zip
```

#### Azure App Service
```yaml
- name: Deploy to Azure
  uses: azure/webapps-deploy@v2
  with:
    app-name: vider-prod
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
    package: .
```

#### Google Cloud Run
```yaml
- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v1
  with:
    service: vider
    region: europe-north1
    image: gcr.io/${{ secrets.GCP_PROJECT_ID }}/vider:${{ github.sha }}
```

## Monitoring and Notifications

### Status Badges

Add these badges to your README.md:

```markdown
[![CI](https://github.com/USERNAME/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/ci.yml)
[![Lint](https://github.com/USERNAME/REPO/actions/workflows/lint.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/lint.yml)
[![Test](https://github.com/USERNAME/REPO/actions/workflows/test.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/test.yml)
[![Deploy](https://github.com/USERNAME/REPO/actions/workflows/build-deploy.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/build-deploy.yml)
```

### Slack Notifications

Add Slack notifications to workflows:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Build failed: ${{ github.workflow }} on ${{ github.ref }}"
      }
```

### Email Notifications

Configure in **Settings → Notifications**:
- Enable "Actions" notifications
- Choose email preferences

## Troubleshooting

### Common Issues

#### 1. Tests Fail in CI but Pass Locally

**Cause:** Environment differences

**Solution:**
```bash
# Run tests with CI environment variables locally
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vider_test \
JWT_SECRET=test-jwt-secret-key-for-ci \
JWT_REFRESH_SECRET=test-jwt-refresh-secret-key-for-ci \
NODE_ENV=test \
npm test
```

#### 2. PostgreSQL Connection Errors

**Cause:** Database service not ready

**Solution:** Workflow already includes health checks:
```yaml
options: >-
  --health-cmd pg_isready
  --health-interval 10s
  --health-timeout 5s
  --health-retries 5
```

#### 3. Build Failures

**Cause:** Missing dependencies or TypeScript errors

**Solution:**
```bash
# Verify locally
npm ci
npx prisma generate
npm run build
```

#### 4. Deployment Failures

**Cause:** Missing secrets or incorrect configuration

**Solution:**
- Verify all secrets are configured
- Test SSH connection manually
- Check deployment logs in Actions tab

### Debug Mode

Enable detailed logging:

1. Add repository variables:
   - `ACTIONS_STEP_DEBUG` = `true`
   - `ACTIONS_RUNNER_DEBUG` = `true`

2. Re-run workflow to see detailed logs

## Performance Optimization

### Current Performance Metrics

| Workflow | Duration | Optimization Status |
|----------|----------|---------------------|
| Lint     | 2-3 min  | ✅ Optimized        |
| Test     | 4-6 min  | ⚠️ Can improve      |
| CI       | 5-8 min  | ⚠️ Can improve      |
| Deploy   | 5-10 min | ⚠️ Depends on target|

### Optimization Strategies

1. **Caching** (✅ Implemented)
   - npm dependencies cached
   - Based on package-lock.json hash

2. **Parallelization** (✅ Implemented)
   - Backend and frontend jobs run in parallel
   - Independent workflows run concurrently

3. **Conditional Execution** (🔄 Future improvement)
   ```yaml
   - name: Run backend tests
     if: contains(github.event.head_commit.modified, 'src/')
   ```

4. **Matrix Strategy** (🔄 Future improvement)
   ```yaml
   strategy:
     matrix:
       node-version: [18, 20]
   ```

## Security Best Practices

### 1. Secrets Management

✅ **Do:**
- Store all sensitive data in GitHub Secrets
- Use environment-specific secrets
- Rotate secrets regularly

❌ **Don't:**
- Commit secrets to repository
- Log secrets in workflow output
- Share secrets between environments

### 2. Workflow Permissions

Limit workflow permissions:
```yaml
permissions:
  contents: read
  pull-requests: write
```

### 3. Dependency Security

- Use Dependabot for automated updates
- Review dependency changes in PRs
- Run security audits:
```yaml
- name: Security audit
  run: npm audit --audit-level=moderate
```

## Maintenance

### Regular Tasks

- [ ] Review workflow execution times monthly
- [ ] Update action versions quarterly
- [ ] Review and update secrets
- [ ] Monitor workflow success rates
- [ ] Update Node.js version as needed
- [ ] Review and optimize caching strategy

### Updating Workflows

1. Create feature branch
2. Modify workflow files
3. Test in PR
4. Review workflow logs
5. Merge to main
6. Monitor first production run

## Cost Optimization

### GitHub Actions Usage

- **Free tier:** 2,000 minutes/month for private repos
- **Public repos:** Unlimited minutes

### Reducing Usage

1. **Skip redundant workflows:**
   ```yaml
   if: github.event_name == 'push' && github.ref == 'refs/heads/main'
   ```

2. **Use self-hosted runners** for high-volume projects

3. **Optimize test suite** to run faster

4. **Cache aggressively** to reduce build times

## Support and Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Branch Protection](.github/BRANCH_PROTECTION.md)
- [Workflow README](.github/workflows/README.md)

### Getting Help
- Check workflow logs in Actions tab
- Review this documentation
- Open an issue in the repository
- Contact the DevOps team

## Checklist for New Projects

- [ ] Enable GitHub Actions
- [ ] Configure required secrets
- [ ] Set up branch protection rules
- [ ] Test all workflows in feature branch
- [ ] Configure deployment target
- [ ] Set up monitoring and notifications
- [ ] Add status badges to README
- [ ] Document custom deployment steps
- [ ] Train team on CI/CD process
- [ ] Schedule regular maintenance reviews

## Conclusion

The CI/CD pipeline is now fully configured and ready to use. All code changes will automatically go through linting, testing, and building before being deployed to production. Branch protection rules ensure that only high-quality code is merged.

For questions or issues, refer to the documentation links above or contact the DevOps team.
