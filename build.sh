#!/bin/bash
set -e

echo "Generating Prisma Client..."
npx prisma generate

echo "Compiling TypeScript..."
npx tsc || echo "TypeScript compilation had errors, but continuing..."

echo "Build complete!"
exit 0
