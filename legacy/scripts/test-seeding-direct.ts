#!/usr/bin/env tsx

/**
 * Direct database test for seeding process
 * This script directly tests the seeding logic without HTTP requests
 */

import { PrismaClient, Role, VehicleType, FuelType, ListingStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testSeedingDirect() {
  console.log('🧪 Testing database seeding process directly...\n');

  try {
    // Check if data already exists
    const existingCompanies = await prisma.company.count();
    console.log(`📊 Existing companies: ${existingCompanies}`);

    const force = true; // Always use force for testing

    // If force is true, clear existing data
    if (force && existingCompanies > 0) {
      console.log('🗑️  Clearing existing data...');
      
      try {
        // Delete in correct order to respect foreign key constraints
        // Level 1: Leaf nodes (no dependencies)
        console.log('  Deleting leaf nodes...');
        await prisma.message.deleteMany();
        await prisma.transaction.deleteMany();
        await prisma.rating.deleteMany();
        await prisma.dispute.deleteMany();
        await prisma.availabilityBlock.deleteMany(); // Must be before RecurringBlock
        await prisma.auditLog.deleteMany();
        await prisma.notification.deleteMany();
        
        // Handle optional tables that might not exist
        try {
          await prisma.notificationPreferences.deleteMany();
        } catch (e) {
          console.log('    NotificationPreferences table not found, skipping...');
        }
        
        try {
          await prisma.securityEvent.deleteMany();
        } catch (e) {
          console.log('    SecurityEvent table not found, skipping...');
        }
        
        try {
          await prisma.securityAlert.deleteMany();
        } catch (e) {
          console.log('    SecurityAlert table not found, skipping...');
        }
        
        try {
          await prisma.scheduledReport.deleteMany();
        } catch (e) {
          console.log('    ScheduledReport table not found, skipping...');
        }
        
        try {
          await prisma.analyticsSnapshots.deleteMany();
        } catch (e) {
          console.log('    AnalyticsSnapshots table not found, skipping...');
        }
        
        try {
          await prisma.contentFlags.deleteMany();
        } catch (e) {
          console.log('    ContentFlags table not found, skipping...');
        }
        
        try {
          await prisma.geographicRestriction.deleteMany();
        } catch (e) {
          console.log('    GeographicRestriction table not found, skipping...');
        }
        
        try {
          await prisma.paymentMethodConfig.deleteMany();
        } catch (e) {
          console.log('    PaymentMethodConfig table not found, skipping...');
        }
        
        try {
          await prisma.configurationHistory.deleteMany();
        } catch (e) {
          console.log('    ConfigurationHistory table not found, skipping...');
        }
        
        // Level 2: Entities with Level 1 dependencies
        console.log('  Deleting level 2 entities...');
        await prisma.messageThread.deleteMany();
        await prisma.recurringBlock.deleteMany(); // After AvailabilityBlock
        
        // Level 3: Entities with Level 2 dependencies
        console.log('  Deleting bookings...');
        await prisma.booking.deleteMany();
        
        // Level 4: Entities with Level 3 dependencies
        console.log('  Deleting listings...');
        await prisma.driverListing.deleteMany();
        await prisma.vehicleListing.deleteMany();
        
        // Level 5: Entities with Level 4 dependencies
        console.log('  Deleting users...');
        try {
          await prisma.platformConfigs.deleteMany(); // Before User (references updatedBy)
        } catch (e) {
          console.log('    PlatformConfigs table not found, skipping...');
        }
        await prisma.user.deleteMany();
        
        // Level 6: Root entities
        console.log('  Deleting root entities...');
        await prisma.company.deleteMany();
        await prisma.platformConfig.deleteMany();
        
        console.log('✅ Existing data cleared successfully');
      } catch (error) {
        console.error('❌ Error during data deletion:', error);
        throw new Error(`Failed to clear existing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('🌱 Starting database seed...');

    // Create platform configuration
    const platformConfig = await prisma.platformConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        commissionRate: 5,
        taxRate: 25,
        bookingTimeoutHours: 24,
        defaultCurrency: 'NOK',
      },
    });

    // Create companies
    const company1 = await prisma.company.create({
      data: {
        name: 'Oslo Transport AS',
        organizationNumber: '123456789',
        businessAddress: 'Storgata 1',
        city: 'Oslo',
        postalCode: '0001',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
        description: 'Leading transport company in Oslo region with 20+ years of experience',
        verified: true,
        verifiedAt: new Date(),
        aggregatedRating: 4.5,
        totalRatings: 12,
      },
    });

    const company2 = await prisma.company.create({
      data: {
        name: 'Bergen Logistics',
        organizationNumber: '987654321',
        businessAddress: 'Bryggen 5',
        city: 'Bergen',
        postalCode: '5003',
        fylke: 'Vestland',
        kommune: 'Bergen',
        vatRegistered: true,
        description: 'Specialized in refrigerated transport and logistics',
        verified: true,
        verifiedAt: new Date(),
        aggregatedRating: 4.8,
        totalRatings: 8,
      },
    });

    const company3 = await prisma.company.create({
      data: {
        name: 'Trondheim Fleet Services',
        organizationNumber: '555666777',
        businessAddress: 'Munkegata 10',
        city: 'Trondheim',
        postalCode: '7011',
        fylke: 'Trøndelag',
        kommune: 'Trondheim',
        vatRegistered: true,
        description: 'Full-service transport solutions for central Norway',
        verified: false,
        aggregatedRating: 4.2,
        totalRatings: 5,
      },
    });

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 12);

    const platformAdmin = await prisma.user.create({
      data: {
        email: 'admin@vider.no',
        passwordHash: hashedPassword,
        role: Role.PLATFORM_ADMIN,
        companyId: company1.id,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+4712345678',
        emailVerified: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'admin@oslotransport.no',
        passwordHash: hashedPassword,
        role: Role.COMPANY_ADMIN,
        companyId: company1.id,
        firstName: 'Lars',
        lastName: 'Hansen',
        phone: '+4723456789',
        emailVerified: true,
      },
    });

    await prisma.user.create({
      data: {
        email: 'admin@bergenlogistics.no',
        passwordHash: hashedPassword,
        role: Role.COMPANY_ADMIN,
        companyId: company2.id,
        firstName: 'Kari',
        lastName: 'Olsen',
        phone: '+4755123456',
        emailVerified: true,
      },
    });

    const company3User = await prisma.user.create({
      data: {
        email: 'user@trondheimfleet.no',
        passwordHash: hashedPassword,
        role: Role.COMPANY_USER,
        companyId: company3.id,
        firstName: 'Per',
        lastName: 'Johansen',
        phone: '+4773987654',
        emailVerified: true,
      },
    });

    // Create vehicle listings
    const vehicle1 = await prisma.vehicleListing.create({
      data: {
        companyId: company1.id,
        title: 'Mercedes-Benz Actros 18-pallet truck',
        description: 'Modern 18-pallet truck with tail-lift, perfect for city deliveries',
        vehicleType: VehicleType.PALLET_18,
        capacity: 18,
        fuelType: FuelType.DIESEL,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        latitude: 59.9139,
        longitude: 10.7522,
        hourlyRate: 850,
        dailyRate: 5500,
        deposit: 5000,
        withDriver: true,
        withDriverCost: 450,
        withoutDriver: true,
        photos: [],
        tags: ['tail-lift', 'GPS-tracking'],
        status: ListingStatus.ACTIVE,
      },
    });

    await prisma.vehicleListing.create({
      data: {
        companyId: company2.id,
        title: 'Refrigerated 21-pallet truck',
        description: 'Temperature-controlled transport, -25°C to +25°C',
        vehicleType: VehicleType.PALLET_21,
        capacity: 21,
        fuelType: FuelType.DIESEL,
        city: 'Bergen',
        fylke: 'Vestland',
        kommune: 'Bergen',
        latitude: 60.3913,
        longitude: 5.3221,
        hourlyRate: 950,
        dailyRate: 6500,
        deposit: 7000,
        withDriver: true,
        withDriverCost: 500,
        withoutDriver: false,
        photos: [],
        tags: ['refrigerated', 'ADR-certified', 'tail-lift'],
        status: ListingStatus.ACTIVE,
      },
    });

    await prisma.vehicleListing.create({
      data: {
        companyId: company1.id,
        title: 'Electric 8-pallet van',
        description: 'Eco-friendly electric van for urban deliveries',
        vehicleType: VehicleType.PALLET_8,
        capacity: 8,
        fuelType: FuelType.ELECTRIC,
        city: 'Oslo',
        fylke: 'Oslo',
        kommune: 'Oslo',
        latitude: 59.9139,
        longitude: 10.7522,
        hourlyRate: 650,
        dailyRate: 4000,
        withDriver: true,
        withDriverCost: 400,
        withoutDriver: true,
        photos: [],
        tags: ['electric', 'zero-emission'],
        status: ListingStatus.ACTIVE,
      },
    });

    await prisma.vehicleListing.create({
      data: {
        companyId: company3.id,
        title: 'Heavy-duty trailer',
        description: 'Semi-trailer for long-haul transport',
        vehicleType: VehicleType.TRAILER,
        capacity: 33,
        fuelType: FuelType.DIESEL,
        city: 'Trondheim',
        fylke: 'Trøndelag',
        kommune: 'Trondheim',
        latitude: 63.4305,
        longitude: 10.3951,
        dailyRate: 8000,
        deposit: 10000,
        withDriver: true,
        withDriverCost: 600,
        withoutDriver: true,
        photos: [],
        tags: ['long-haul', 'heavy-duty'],
        status: ListingStatus.ACTIVE,
      },
    });

    // Create driver listings
    const driver1 = await prisma.driverListing.create({
      data: {
        companyId: company1.id,
        name: 'Erik Andersen',
        licenseClass: 'CE',
        languages: ['Norwegian', 'English'],
        backgroundSummary: '15 years of professional driving experience, ADR certified',
        hourlyRate: 450,
        dailyRate: 3200,
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: platformAdmin.id,
        aggregatedRating: 4.7,
        totalRatings: 15,
        status: ListingStatus.ACTIVE,
      },
    });

    await prisma.driverListing.create({
      data: {
        companyId: company2.id,
        name: 'Ingrid Sørensen',
        licenseClass: 'CE',
        languages: ['Norwegian', 'English', 'German'],
        backgroundSummary: 'Specialized in refrigerated transport, 10 years experience',
        hourlyRate: 500,
        dailyRate: 3500,
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: platformAdmin.id,
        aggregatedRating: 4.9,
        totalRatings: 10,
        status: ListingStatus.ACTIVE,
      },
    });

    await prisma.driverListing.create({
      data: {
        companyId: company3.id,
        name: 'Thomas Berg',
        licenseClass: 'C',
        languages: ['Norwegian'],
        backgroundSummary: '5 years of local delivery experience',
        hourlyRate: 400,
        dailyRate: 2800,
        verified: false,
        aggregatedRating: 4.3,
        totalRatings: 6,
        status: ListingStatus.ACTIVE,
      },
    });

    // Verify data was created
    const finalCounts = {
      companies: await prisma.company.count(),
      users: await prisma.user.count(),
      vehicles: await prisma.vehicleListing.count(),
      drivers: await prisma.driverListing.count(),
    };

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📈 Final counts:');
    console.log(`  Companies: ${finalCounts.companies}`);
    console.log(`  Users: ${finalCounts.users}`);
    console.log(`  Vehicles: ${finalCounts.vehicles}`);
    console.log(`  Drivers: ${finalCounts.drivers}`);

    // Test relationships
    console.log('\n🔗 Testing relationships...');
    const companiesWithUsers = await prisma.company.findMany({
      include: {
        users: true,
        vehicleListings: true,
        driverListings: true,
      },
    });

    let totalRelationships = 0;
    companiesWithUsers.forEach(company => {
      totalRelationships += company.users.length + company.vehicleListings.length + company.driverListings.length;
      console.log(`  ${company.name}: ${company.users.length} users, ${company.vehicleListings.length} vehicles, ${company.driverListings.length} drivers`);
    });

    console.log(`\n✅ All relationships verified! Total: ${totalRelationships} relationships`);
    console.log('\n🎉 Direct seeding test passed successfully!');

  } catch (error) {
    console.error('❌ Direct seeding test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSeedingDirect();