# GitHub Repository Setup Guide

Your local Git repository is initialized and ready! Follow these steps to push it to GitHub.

## Step 1: Create a New Repository on GitHub

1. Go to [GitHub](https://github.com)
2. Click the **+** icon in the top right corner
3. Select **New repository**
4. Fill in the details:
   - **Repository name:** `vider-transport-marketplace` (or your preferred name)
   - **Description:** "Peer-to-peer marketplace platform for Norwegian B2B transport and logistics"
   - **Visibility:** Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **Create repository**

## Step 2: Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these commands in your terminal:

### Option A: If you see the "Quick setup" page

Copy the repository URL (it will look like `https://github.com/YOUR_USERNAME/vider-transport-marketplace.git`)

Then run these commands:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/vider-transport-marketplace.git

# Verify the remote was added
git remote -v

# Push your code to GitHub
git push -u origin main
```

### Option B: Using the commands GitHub provides

GitHub will show you commands like this:

```bash
git remote add origin https://github.com/YOUR_USERNAME/vider-transport-marketplace.git
git branch -M main
git push -u origin main
```

Just copy and paste those commands into your terminal.

## Step 3: Verify the Upload

1. Refresh your GitHub repository page
2. You should see all your files uploaded
3. Check that the `.github/workflows` folder is visible
4. The GitHub Actions tab should now be available

## Step 4: Configure GitHub Actions (Optional but Recommended)

### Add Repository Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets (optional, defaults are provided for testing):

```
Name: JWT_SECRET
Value: your-production-jwt-secret-key-here

Name: JWT_REFRESH_SECRET
Value: your-production-jwt-refresh-secret-key-here
```

For deployment, also add:
```
Name: VITE_API_URL
Value: https://api.yourdomain.com

Name: PRODUCTION_URL
Value: https://yourdomain.com
```

### Set Up Branch Protection Rules

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Enable these options:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
5. In "Status checks that are required", search and select:
   - `quality-checks`
   - `lint-backend`
   - `lint-frontend`
   - `test-backend`
   - `build-backend`
   - `build-frontend`
6. Enable:
   - ✅ Require conversation resolution before merging
7. Click **Create**

Repeat for `develop` branch with fewer checks.

## Step 5: Test Your CI/CD Pipeline

1. Create a new branch:
   ```bash
   git checkout -b test-ci-pipeline
   ```

2. Make a small change (e.g., add a line to README.md)

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify CI/CD pipeline"
   git push origin test-ci-pipeline
   ```

4. Go to GitHub and create a Pull Request

5. Watch the workflows run in the **Actions** tab

6. All checks should pass ✅

## Troubleshooting

### Authentication Issues

If you get authentication errors when pushing:

#### Using HTTPS (Recommended)
You'll need a Personal Access Token (PAT):

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Give it a name like "Vider Project"
4. Select scopes: `repo` (full control of private repositories)
5. Click **Generate token**
6. Copy the token (you won't see it again!)
7. When pushing, use the token as your password

#### Using SSH (Alternative)
1. Generate SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
2. Add to SSH agent:
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```
3. Copy public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
4. Add to GitHub: Settings → SSH and GPG keys → New SSH key
5. Change remote URL:
   ```bash
   git remote set-url origin git@github.com:YOUR_USERNAME/vider-transport-marketplace.git
   ```

### Workflows Not Running

If workflows don't run automatically:
1. Check that GitHub Actions is enabled: Settings → Actions → General
2. Ensure workflows are in `.github/workflows/` directory
3. Check workflow syntax is valid (YAML)

### Permission Errors

If you see permission errors:
1. Go to Settings → Actions → General
2. Under "Workflow permissions", select "Read and write permissions"
3. Click Save

## Next Steps

After successfully pushing to GitHub:

1. ✅ Repository is on GitHub
2. ⏳ Configure secrets (see Step 4)
3. ⏳ Set up branch protection (see Step 4)
4. ⏳ Test CI/CD pipeline (see Step 5)
5. ⏳ Add status badges to README
6. ⏳ Configure deployment

## Quick Reference Commands

```bash
# Check current status
git status

# View commit history
git log --oneline

# Create a new branch
git checkout -b feature-name

# Switch branches
git checkout main

# Pull latest changes
git pull origin main

# Push changes
git push origin branch-name

# View remote repositories
git remote -v
```

## Additional Resources

- [GitHub Docs - Creating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [GitHub Docs - About remote repositories](https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CI/CD Setup Guide](./CI_CD_SETUP.md)
- [Quick Start Guide](./.github/QUICK_START.md)

## Support

If you encounter any issues:
1. Check this guide first
2. Review the error message carefully
3. Search GitHub documentation
4. Check Stack Overflow
5. Open an issue in the repository

---

**Your repository is ready to go! 🚀**

Once you push to GitHub, your CI/CD pipeline will automatically start protecting your code quality.
