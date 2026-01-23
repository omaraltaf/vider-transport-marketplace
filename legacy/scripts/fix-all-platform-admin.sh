#!/bin/bash

# Fix all platform admin components to use proper API calls

echo "Fixing platform admin components..."

# Replace localStorage.getItem('adminToken') with token
find frontend/src/components/platform-admin -name "*.tsx" -type f -exec sed -i '' 's/localStorage\.getItem('\''adminToken'\'')/token/g' {} \;
find frontend/src/components/platform-admin -name "*.tsx" -type f -exec sed -i '' 's/localStorage\.getItem('\''token'\'')/token/g' {} \;
find frontend/src/components/platform-admin -name "*.tsx" -type f -exec sed -i '' 's/localStorage\.getItem("adminToken")/token/g' {} \;
find frontend/src/components/platform-admin -name "*.tsx" -type f -exec sed -i '' 's/localStorage\.getItem("token")/token/g' {} \;

echo "Fixed localStorage.getItem calls"
echo "Done!"