#!/usr/bin/env node

/**
 * Simple script to test database connection
 * Run with: node test-db-connection.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Try to connect
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database query successful!');
    console.log('PostgreSQL version:', result[0].version);
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found. Run migrations with: npm run migrate');
    } else {
      console.log(`✅ Found ${tables.length} tables in database`);
    }
    
    await prisma.$disconnect();
    console.log('\n✅ All checks passed! You can now run the tests.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.log('\n📝 Please check:');
    console.log('1. PostgreSQL is running');
    console.log('2. DATABASE_URL in .env is correct');
    console.log('3. Database "vider_dev" exists');
    console.log('4. Credentials are valid');
    console.log('\nSee DATABASE_SETUP_INSTRUCTIONS.md for help');
    process.exit(1);
  }
}

testConnection();
