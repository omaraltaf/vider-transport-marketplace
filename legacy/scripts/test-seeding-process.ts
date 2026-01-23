#!/usr/bin/env tsx

/**
 * Test script to verify the seeding process works correctly
 * This script tests the seed endpoint with the force flag
 */

import { config } from '../src/config/env';

async function testSeedingProcess() {
  console.log('🧪 Testing database seeding process...\n');

  try {
    // Get the base URL for the API
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const seedUrl = `${baseUrl}/api/seed`;

    console.log(`📡 Making request to: ${seedUrl}`);
    console.log(`🔑 Using JWT_SECRET: ${config.JWT_SECRET.substring(0, 8)}...`);

    // Make the seeding request with force flag
    const response = await fetch(seedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-seed-secret': config.JWT_SECRET,
      },
      body: JSON.stringify({ force: true }),
    });

    console.log(`📊 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Seeding failed with status ${response.status}:`);
      console.error(errorText);
      process.exit(1);
    }

    const result = await response.json();
    
    console.log('✅ Seeding completed successfully!');
    console.log('\n📈 Seeding Results:');
    console.log(`  Companies: ${result.data.companies}`);
    console.log(`  Users: ${result.data.users}`);
    console.log(`  Vehicles: ${result.data.vehicles}`);
    console.log(`  Drivers: ${result.data.drivers}`);
    console.log(`  Bookings: ${result.data.bookings}`);
    console.log(`  Ratings: ${result.data.ratings}`);
    console.log(`  Messages: ${result.data.messages}`);

    console.log('\n🔐 Test Accounts Created:');
    result.testAccounts.forEach((account: any) => {
      console.log(`  ${account.email} (${account.role})`);
    });

    console.log('\n🎉 All tests passed! Database seeding is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Make sure the server is running on the expected port.');
        console.error('   Try: npm run dev');
      } else if (error.message.includes('fetch')) {
        console.error('\n💡 Network error occurred. Check your connection and server status.');
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testSeedingProcess();