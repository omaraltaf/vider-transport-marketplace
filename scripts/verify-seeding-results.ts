#!/usr/bin/env tsx

/**
 * Verification script to check if seeding results are correct
 * This script verifies that all expected data and relationships exist
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeedingResults() {
  console.log('🔍 Verifying seeding results...\n');

  try {
    // Check basic counts
    const counts = {
      companies: await prisma.company.count(),
      users: await prisma.user.count(),
      vehicleListings: await prisma.vehicleListing.count(),
      driverListings: await prisma.driverListing.count(),
      platformConfigs: await prisma.platformConfig.count(),
    };

    console.log('📊 Entity counts:');
    Object.entries(counts).forEach(([entity, count]) => {
      console.log(`  ${entity}: ${count}`);
    });

    // Verify expected counts
    const expectedCounts = {
      companies: 3,
      users: 4,
      vehicleListings: 4,
      driverListings: 3,
      platformConfigs: 1,
    };

    let allCountsCorrect = true;
    console.log('\n✅ Count verification:');
    Object.entries(expectedCounts).forEach(([entity, expected]) => {
      const actual = counts[entity as keyof typeof counts];
      const isCorrect = actual === expected;
      allCountsCorrect = allCountsCorrect && isCorrect;
      console.log(`  ${entity}: ${actual}/${expected} ${isCorrect ? '✅' : '❌'}`);
    });

    if (!allCountsCorrect) {
      throw new Error('Entity counts do not match expected values');
    }

    // Verify relationships
    console.log('\n🔗 Relationship verification:');
    
    // Check company-user relationships
    const companiesWithUsers = await prisma.company.findMany({
      include: { users: true },
    });
    
    let totalUsers = 0;
    companiesWithUsers.forEach(company => {
      totalUsers += company.users.length;
      console.log(`  ${company.name}: ${company.users.length} users`);
    });
    
    if (totalUsers !== counts.users) {
      throw new Error(`User relationship mismatch: ${totalUsers} in relationships vs ${counts.users} total users`);
    }

    // Check company-listing relationships
    const companiesWithListings = await prisma.company.findMany({
      include: {
        vehicleListings: true,
        driverListings: true,
      },
    });
    
    let totalVehicles = 0;
    let totalDrivers = 0;
    companiesWithListings.forEach(company => {
      totalVehicles += company.vehicleListings.length;
      totalDrivers += company.driverListings.length;
      console.log(`  ${company.name}: ${company.vehicleListings.length} vehicles, ${company.driverListings.length} drivers`);
    });
    
    if (totalVehicles !== counts.vehicleListings) {
      throw new Error(`Vehicle listing relationship mismatch: ${totalVehicles} in relationships vs ${counts.vehicleListings} total`);
    }
    
    if (totalDrivers !== counts.driverListings) {
      throw new Error(`Driver listing relationship mismatch: ${totalDrivers} in relationships vs ${counts.driverListings} total`);
    }

    // Verify test accounts exist
    console.log('\n👤 Test account verification:');
    const testEmails = [
      'admin@vider.no',
      'admin@oslotransport.no',
      'admin@bergenlogistics.no',
      'user@trondheimfleet.no',
    ];

    for (const email of testEmails) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { company: true },
      });
      
      if (!user) {
        throw new Error(`Test account not found: ${email}`);
      }
      
      console.log(`  ✅ ${email} (${user.role}) - ${user.company.name}`);
    }

    // Verify listings have proper data
    console.log('\n🚛 Listing data verification:');
    const vehicleListings = await prisma.vehicleListing.findMany({
      include: { company: true },
    });
    
    vehicleListings.forEach(listing => {
      const hasRequiredFields = listing.title && listing.description && listing.city && listing.fylke;
      console.log(`  ✅ ${listing.title} - ${listing.company.name} (${hasRequiredFields ? 'complete' : 'incomplete'})`);
      
      if (!hasRequiredFields) {
        throw new Error(`Vehicle listing missing required fields: ${listing.id}`);
      }
    });

    const driverListings = await prisma.driverListing.findMany({
      include: { company: true },
    });
    
    driverListings.forEach(listing => {
      const hasRequiredFields = listing.name && listing.licenseClass && listing.languages.length > 0;
      console.log(`  ✅ ${listing.name} - ${listing.company.name} (${hasRequiredFields ? 'complete' : 'incomplete'})`);
      
      if (!hasRequiredFields) {
        throw new Error(`Driver listing missing required fields: ${listing.id}`);
      }
    });

    // Verify platform configuration
    console.log('\n⚙️  Platform configuration verification:');
    const platformConfig = await prisma.platformConfig.findFirst();
    
    if (!platformConfig) {
      throw new Error('Platform configuration not found');
    }
    
    const requiredConfigFields = {
      commissionRate: platformConfig.commissionRate,
      taxRate: platformConfig.taxRate,
      bookingTimeoutHours: platformConfig.bookingTimeoutHours,
      defaultCurrency: platformConfig.defaultCurrency,
    };
    
    Object.entries(requiredConfigFields).forEach(([field, value]) => {
      console.log(`  ✅ ${field}: ${value}`);
    });

    console.log('\n🎉 All verification checks passed!');
    console.log('✅ Database seeding is working correctly and all data is properly structured.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifySeedingResults();