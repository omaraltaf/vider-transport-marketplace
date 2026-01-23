#!/bin/bash

# Production Deployment Script for Vider Transport Marketplace
set -e

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    print_error "Please switch to 'main' or 'production' branch before deploying"
    exit 1
fi

print_status "Current branch: $CURRENT_BRANCH"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "You have uncommitted changes. Please commit or stash them before deploying."
    exit 1
fi

print_status "No uncommitted changes found"

# Run tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    print_error "Tests failed. Deployment aborted."
    exit 1
fi
print_status "All tests passed"

# Run TypeScript check
echo "🔍 Running TypeScript check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    print_error "TypeScript check failed. Deployment aborted."
    exit 1
fi
print_status "TypeScript check passed"

# Run linting
echo "🔧 Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    print_error "Linting failed. Deployment aborted."
    exit 1
fi
print_status "Linting passed"

# Security audit
echo "🔒 Running security audit..."
npm audit --audit-level high
if [ $? -ne 0 ]; then
    print_warning "Security vulnerabilities found. Please review before continuing."
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment aborted by user"
        exit 1
    fi
fi
print_status "Security audit completed"

# Build the application
echo "🏗️  Building application..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Build failed. Deployment aborted."
    exit 1
fi
print_status "Build completed successfully"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_warning ".env.production file not found"
    print_warning "Make sure to configure environment variables in your deployment platform"
fi

# Tag the release
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
TAG="production-$TIMESTAMP"

echo "🏷️  Creating release tag: $TAG"
git tag -a "$TAG" -m "Production deployment $TIMESTAMP"

# Push to repository
echo "📤 Pushing to repository..."
git push origin "$CURRENT_BRANCH"
git push origin "$TAG"

print_status "Code pushed to repository with tag: $TAG"

# Railway deployment (if using Railway)
if command -v railway &> /dev/null; then
    echo "🚂 Deploying to Railway..."
    railway up
    print_status "Railway deployment initiated"
else
    print_warning "Railway CLI not found. Manual deployment required."
fi

# Post-deployment checks
echo "🔍 Running post-deployment checks..."

# Wait a moment for deployment to complete
sleep 30

# Check if health endpoint is responding (update URL as needed)
HEALTH_URL="https://yourdomain.com/health"
if command -v curl &> /dev/null; then
    echo "Checking health endpoint: $HEALTH_URL"
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        print_status "Health check passed"
    else
        print_warning "Health check failed - please verify deployment manually"
    fi
else
    print_warning "curl not found - please check health endpoint manually: $HEALTH_URL"
fi

# Final success message
echo ""
echo "🎉 Production deployment completed successfully!"
echo ""
echo "📋 Post-deployment checklist:"
echo "   1. Verify application is running: $HEALTH_URL"
echo "   2. Test user authentication"
echo "   3. Test password reset functionality"
echo "   4. Check admin panel access"
echo "   5. Monitor logs for any errors"
echo "   6. Verify database migrations applied"
echo ""
echo "🏷️  Release tag: $TAG"
echo "📅 Deployment time: $(date)"
echo ""
print_status "Deployment script completed"