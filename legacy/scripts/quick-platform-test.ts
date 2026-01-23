#!/usr/bin/env ts-node

/**
 * Quick Platform Test Script
 * Performs basic smoke tests to verify platform functionality
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  results.push({ test, status, message, details });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} ${test}: ${message}`);
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
}

async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    addResult('Database Connection', 'PASS', 'Successfully connected to database');
  } catch (error) {
    addResult('Database Connection', 'FAIL', 'Failed to connect to database', error);
  }
}

async function testUserAuthentication() {
  try {
    const platformAdmin = await prisma.user.findFirst({
      where: { role: 'PLATFORM_ADMIN' }
    });
    
    if (!platformAdmin) {
      addResult('User Authentication', 'FAIL', 'No platform admin found');
      return;
    }

    const isValidPassword = await bcrypt.compare('password123', platformAdmin.passwordHash);
    if (isValidPassword) {
      addResult('User Authentication', 'PASS', 'Platform admin authentication works');
    } else {
      addResult('User Authentication', 'FAIL', 'Platform admin password verification failed');
    }
  } catch (error) {
    addResult('User Authentication', 'FAIL', 'Authentication test failed', error);
  }
}

async function testCurrencyConsistency() {
  try {
    const vehicleCurrencies = await prisma.vehicleListing.groupBy({
      by: ['currency'],
      _count: true
    });
    
    const driverCurrencies = await prisma.driverListing.groupBy({
      by: ['currency'],
      _count: true
    });
    
    const bookingCurrencies = await prisma.booking.groupBy({
      by: ['currency'],
      _count: true
    });

    const allNOK = vehicleCurrencies.every(c => c.currency === 'NOK') &&
                   driverCurrencies.every(c => c.currency === 'NOK') &&
                   bookingCurrencies.every(c => c.currency === 'NOK');

    if (allNOK) {
      addResult('Currency Consistency', 'PASS', 'All records use NOK currency');
    } else {
      addResult('Currency Consistency', 'FAIL', 'Mixed currencies found', {
        vehicles: vehicleCurrencies,
        drivers: driverCurrencies,
        bookings: bookingCurrencies
      });
    }
  } catch (error) {
    addResult('Currency Consistency', 'FAIL', 'Currency consistency test failed', error);
  }
}

async function testDataIntegrity() {
  try {
    const stats = {
      companies: await prisma.company.count(),
      users: await prisma.user.count(),
      vehicles: await prisma.vehicleListing.count(),
      drivers: await prisma.driverListing.count(),
      bookings: await prisma.booking.count(),
      transactions: await prisma.transaction.count()
    };

    const hasMinimumData = stats.companies >= 3 && 
                          stats.users >= 4 && 
                          stats.vehicles >= 3 && 
                          stats.drivers >= 3 && 
                          stats.bookings >= 2;

    if (hasMinimumData) {
      addResult('Data Integrity', 'PASS', 'Sufficient test data available', stats);
    } else {
      addResult('Data Integrity', 'WARN', 'Limited test data available', stats);
    }
  } catch (error) {
    addResult('Data Integrity', 'FAIL', 'Data integrity test failed', error);
  }
}

async function testBookingCalculations() {
  try {
    const bookings = await prisma.booking.findMany({
      take: 5,
      include: {
        vehicleListing: true,
        driverListing: true
      }
    });

    let calculationErrors = 0;
    
    for (const booking of bookings) {
      // Verify commission calculation
      const expectedCommission = booking.providerRate * (booking.platformCommissionRate / 100);
      const commissionDiff = Math.abs(booking.platformCommission - expectedCommission);
      
      // Verify tax calculation
      const subtotal = booking.providerRate + booking.platformCommission;
      const expectedTax = subtotal * (booking.taxRate / 100);
      const taxDiff = Math.abs(booking.taxes - expectedTax);
      
      // Verify total calculation
      const expectedTotal = subtotal + booking.taxes;
      const totalDiff = Math.abs(booking.total - expectedTotal);
      
      if (commissionDiff > 0.01 || taxDiff > 0.01 || totalDiff > 0.01) {
        calculationErrors++;
      }
    }

    if (calculationErrors === 0) {
      addResult('Booking Calculations', 'PASS', `All ${bookings.length} booking calculations are correct`);
    } else {
      addResult('Booking Calculations', 'FAIL', `${calculationErrors} booking calculation errors found`);
    }
  } catch (error) {
    addResult('Booking Calculations', 'FAIL', 'Booking calculation test failed', error);
  }
}

async function testPlatformConfiguration() {
  try {
    const config = await prisma.platformConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      addResult('Platform Configuration', 'FAIL', 'No active platform configuration found');
      return;
    }

    const configChecks = {
      hasCommissionRate: config.commissionRate > 0,
      hasTaxRate: config.taxRate > 0,
      hasDefaultCurrency: config.defaultCurrency === 'NOK',
      hasBookingTimeout: config.bookingTimeoutHours > 0
    };

    const allChecksPass = Object.values(configChecks).every(check => check);

    if (allChecksPass) {
      addResult('Platform Configuration', 'PASS', 'Platform configuration is valid', {
        commissionRate: config.commissionRate,
        taxRate: config.taxRate,
        defaultCurrency: config.defaultCurrency,
        bookingTimeoutHours: config.bookingTimeoutHours
      });
    } else {
      addResult('Platform Configuration', 'FAIL', 'Platform configuration issues found', configChecks);
    }
  } catch (error) {
    addResult('Platform Configuration', 'FAIL', 'Platform configuration test failed', error);
  }
}

async function testReferentialIntegrity() {
  try {
    // Test basic relationship queries to ensure foreign keys work
    const bookingsWithCompanies = await prisma.booking.findMany({
      include: {
        renterCompany: true,
        providerCompany: true
      },
      take: 1
    });

    const vehiclesWithCompany = await prisma.vehicleListing.findMany({
      include: {
        company: true
      },
      take: 1
    });

    const driversWithCompany = await prisma.driverListing.findMany({
      include: {
        company: true
      },
      take: 1
    });

    const hasValidRelationships = bookingsWithCompanies.length > 0 && 
                                 bookingsWithCompanies[0].renterCompany &&
                                 bookingsWithCompanies[0].providerCompany &&
                                 vehiclesWithCompany.length > 0 &&
                                 vehiclesWithCompany[0].company &&
                                 driversWithCompany.length > 0 &&
                                 driversWithCompany[0].company;

    if (hasValidRelationships) {
      addResult('Referential Integrity', 'PASS', 'All foreign key relationships are working correctly');
    } else {
      addResult('Referential Integrity', 'WARN', 'Some relationships may not be properly configured');
    }
  } catch (error) {
    addResult('Referential Integrity', 'FAIL', 'Referential integrity test failed', error);
  }
}

async function main() {
  console.log('🧪 Starting Quick Platform Test...\n');

  await testDatabaseConnection();
  await testUserAuthentication();
  await testCurrencyConsistency();
  await testDataIntegrity();
  await testBookingCalculations();
  await testPlatformConfiguration();
  await testReferentialIntegrity();

  console.log('\n📊 Test Summary:');
  console.log('================');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;

  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);
  console.log(`📋 Total: ${results.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All critical tests passed! Platform is ready for comprehensive testing.');
  } else {
    console.log('\n⚠️  Some tests failed. Please address the issues before proceeding with comprehensive testing.');
  }

  console.log('\n🚀 Next Steps:');
  console.log('1. Run the currency fix script if needed: npm run fix-currency');
  console.log('2. Start the backend server: npm run dev');
  console.log('3. Start the frontend server: cd frontend && npm run dev');
  console.log('4. Begin comprehensive testing using COMPREHENSIVE_TESTING_PLAN.md');

  return failCount === 0;
}

main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });