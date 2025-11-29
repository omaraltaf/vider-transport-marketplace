# Branch Protection Rules Configuration

This document describes the recommended branch protection rules for the Vider Transport Marketplace repository.

## Main Branch Protection

Configure the following rules for the `main` branch:

### Required Status Checks
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

**Required checks:**
- `quality-checks` (from CI workflow)
- `lint-backend` (from Lint workflow)
- `lint-frontend` (from Lint workflow)
- `test-backend` (from Test workflow)
- `build-backend` (from Build and Deploy workflow)
- `build-frontend` (from Build and Deploy workflow)

### Pull Request Requirements
- ✅ Require a pull request before merging
- ✅ Require approvals: **1** (minimum)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (if CODEOWNERS file exists)

### Additional Protections
- ✅ Require conversation resolution before merging
- ✅ Require signed commits (optional but recommended)
- ✅ Include administrators (enforce rules for admins too)
- ✅ Restrict who can push to matching branches (optional)
- ✅ Allow force pushes: **Disabled**
- ✅ Allow deletions: **Disabled**

## Develop Branch Protection

Configure the following rules for the `develop` branch:

### Required Status Checks
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

**Required checks:**
- `quality-checks` (from CI workflow)
- `lint-backend` (from Lint workflow)
- `lint-frontend` (from Lint workflow)
- `test-backend` (from Test workflow)

### Pull Request Requirements
- ✅ Require a pull request before merging
- ✅ Require approvals: **1** (minimum)
- ✅ Dismiss stale pull request approvals when new commits are pushed

### Additional Protections
- ✅ Require conversation resolution before merging
- ✅ Allow force pushes: **Disabled**
- ✅ Allow deletions: **Disabled**

## How to Configure Branch Protection Rules

### Via GitHub Web Interface

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Branches**
3. Click **Add rule** or edit existing rule
4. Enter branch name pattern (e.g., `main` or `develop`)
5. Configure the protection rules as described above
6. Click **Create** or **Save changes**

### Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Protect main branch
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["quality-checks","lint-backend","lint-frontend","test-backend","build-backend","build-frontend"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  --field restrictions=null \
  --field required_conversation_resolution=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Protect develop branch
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["quality-checks","lint-backend","lint-frontend","test-backend"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  --field restrictions=null \
  --field required_conversation_resolution=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

## Workflow Triggers

### CI Workflow (`ci.yml`)
- Runs on push to `main` and `develop` branches
- Runs on pull requests targeting `main` and `develop`
- Performs comprehensive quality checks including linting, testing, and building

### Lint Workflow (`lint.yml`)
- Runs on push to `main` and `develop` branches
- Runs on pull requests targeting `main` and `develop`
- Checks code style and quality for both backend and frontend

### Test Workflow (`test.yml`)
- Runs on push to `main` and `develop` branches
- Runs on pull requests targeting `main` and `develop`
- Executes all backend tests with PostgreSQL database

### Build and Deploy Workflow (`build-deploy.yml`)
- Runs on push to `main` branch only
- Can be manually triggered via workflow_dispatch
- Builds both backend and frontend
- Deploys to production (requires configuration)

## Required Secrets

Configure the following secrets in your repository settings:

### Required for All Workflows
- `JWT_SECRET` - JWT signing secret (auto-set in workflow for tests)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (auto-set in workflow for tests)

### Required for Deployment
- `VITE_API_URL` - Frontend API URL for production
- `PRODUCTION_URL` - Production environment URL
- `DEPLOY_HOST` - Deployment server hostname (if using SSH)
- `DEPLOY_USER` - Deployment server username (if using SSH)
- `DEPLOY_KEY` - SSH private key for deployment (if using SSH)

### Optional
- `CODECOV_TOKEN` - Codecov integration token for coverage reports

## Environment Variables

The workflows use the following environment variables:

### Test Environment
- `DATABASE_URL` - PostgreSQL connection string for tests
- `NODE_ENV=test` - Node environment
- `JWT_SECRET` - Test JWT secret
- `JWT_REFRESH_SECRET` - Test refresh token secret

### Build Environment
- `VITE_API_URL` - API URL for frontend build

## Monitoring and Notifications

### GitHub Actions Status Badge

Add this badge to your README.md:

```markdown
[![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml)
```

### Notifications

Configure notifications in your repository settings:
- **Settings** → **Notifications**
- Enable notifications for failed workflows
- Configure Slack/Discord webhooks if needed

## Troubleshooting

### Common Issues

1. **Tests failing in CI but passing locally**
   - Ensure DATABASE_URL is correctly set
   - Check that all environment variables are configured
   - Verify PostgreSQL service is healthy

2. **Build failures**
   - Check Node.js version matches (20.x)
   - Ensure all dependencies are in package.json
   - Verify TypeScript configuration

3. **Deployment issues**
   - Verify all deployment secrets are configured
   - Check server connectivity
   - Review deployment logs

## Best Practices

1. **Always create feature branches** from `develop`
2. **Never commit directly** to `main` or `develop`
3. **Keep pull requests small** and focused
4. **Write descriptive commit messages**
5. **Ensure all tests pass** before requesting review
6. **Resolve all conversations** before merging
7. **Keep dependencies up to date** with security patches
8. **Review CI logs** when workflows fail

## Maintenance

### Regular Tasks

- Review and update workflow configurations quarterly
- Update Node.js version as LTS releases occur
- Review and update branch protection rules as team grows
- Monitor workflow execution times and optimize if needed
- Update dependencies regularly for security patches

### Workflow Updates

When updating workflows:
1. Test changes in a feature branch first
2. Review workflow logs for any issues
3. Update this documentation if rules change
4. Communicate changes to the team
