#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔄 Running database migrations...');

try {
  // Run migrations without regenerating client
  execSync('npx prisma migrate deploy', { 
    stdio: 'inherit',
    env: { ...process.env, PRISMA_GENERATE_SKIP: 'true' }
  });
  
  console.log('✅ Migrations completed successfully');
  console.log('🚀 Starting application...');
  
  // Start the application
  require('../dist/index.js');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}