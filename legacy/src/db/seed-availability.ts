import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding availability blocks...');

  // Get existing data
  const companies = await prisma.company.findMany();
  const vehicles = await prisma.vehicleListing.findMany();
  const drivers = await prisma.driverListing.findMany();
  const users = await prisma.user.findMany({ where: { role: 'COMPANY_ADMIN' } });

  if (companies.length === 0 || vehicles.length === 0 || users.length === 0) {
    console.log('⚠️  No existing data found. Please run the main seed first: npm run db:seed');
    return;
  }

  const company1Admin = users.find(u => u.companyId === companies[0]?.id);
  const company2Admin = users.find(u => u.companyId === companies[1]?.id);

  if (!company1Admin || !company2Admin) {
    console.log('⚠️  Could not find company admins');
    return;
  }

  // Create availability blocks
  console.log('Creating availability blocks...');
  
  if (vehicles.length > 0) {
    // Manual block for first vehicle - maintenance period
    await prisma.availabilityBlock.create({
      data: {
        listingId: vehicles[0].id,
        listingType: 'vehicle',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // 16 days from now
        reason: 'Scheduled maintenance',
        isRecurring: false,
        createdBy: company1Admin.id,
      },
    });
    console.log('  ✓ Created maintenance block for vehicle 1');
  }

  if (vehicles.length > 1) {
    // Manual block for second vehicle - holiday period
    await prisma.availabilityBlock.create({
      data: {
        listingId: vehicles[1].id,
        listingType: 'vehicle',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // 37 days from now
        reason: 'Company holiday - Christmas break',
        isRecurring: false,
        createdBy: company2Admin.id,
      },
    });
    console.log('  ✓ Created holiday block for vehicle 2');
  }

  if (drivers.length > 0) {
    // Manual block for first driver - vacation
    await prisma.availabilityBlock.create({
      data: {
        listingId: drivers[0].id,
        listingType: 'driver',
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
        endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from now
        reason: 'Annual vacation',
        isRecurring: false,
        createdBy: company1Admin.id,
      },
    });
    console.log('  ✓ Created vacation block for driver 1');
  }

  console.log('✓ Availability blocks created');

  // Create recurring blocks
  console.log('Creating recurring blocks...');
  
  if (vehicles.length > 2) {
    // Recurring block for third vehicle - weekends unavailable
    const recurringBlock1 = await prisma.recurringBlock.create({
      data: {
        listingId: vehicles[2].id,
        listingType: 'vehicle',
        daysOfWeek: [0, 6], // Sunday and Saturday
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Next 90 days
        reason: 'Weekend maintenance schedule',
        createdBy: company1Admin.id,
      },
    });

    // Create instances for the recurring block (next 4 weekends as examples)
    const weekendDates = [];
    const today = new Date();
    for (let i = 0; i < 28; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendDates.push(new Date(date));
      }
    }

    for (const date of weekendDates) {
      await prisma.availabilityBlock.create({
        data: {
          listingId: vehicles[2].id,
          listingType: 'vehicle',
          startDate: new Date(date.setHours(0, 0, 0, 0)),
          endDate: new Date(date.setHours(23, 59, 59, 999)),
          reason: 'Weekend maintenance schedule',
          isRecurring: true,
          recurringBlockId: recurringBlock1.id,
          createdBy: company1Admin.id,
        },
      });
    }
    console.log(`  ✓ Created recurring weekend blocks for vehicle 3 (${weekendDates.length} instances)`);
  }

  if (drivers.length > 1) {
    // Recurring block for second driver - Mondays unavailable
    const recurringBlock2 = await prisma.recurringBlock.create({
      data: {
        listingId: drivers[1].id,
        listingType: 'driver',
        daysOfWeek: [1], // Monday
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Next 60 days
        reason: 'Regular training day',
        createdBy: company2Admin.id,
      },
    });

    // Create instances for Mondays (next 8 Mondays as examples)
    const mondayDates = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      if (date.getDay() === 1) {
        mondayDates.push(new Date(date));
      }
    }

    for (const date of mondayDates) {
      await prisma.availabilityBlock.create({
        data: {
          listingId: drivers[1].id,
          listingType: 'driver',
          startDate: new Date(date.setHours(0, 0, 0, 0)),
          endDate: new Date(date.setHours(23, 59, 59, 999)),
          reason: 'Regular training day',
          isRecurring: true,
          recurringBlockId: recurringBlock2.id,
          createdBy: company2Admin.id,
        },
      });
    }
    console.log(`  ✓ Created recurring Monday blocks for driver 2 (${mondayDates.length} instances)`);
  }

  console.log('✓ Recurring blocks created');

  // Display summary
  const blockCount = await prisma.availabilityBlock.count();
  const recurringCount = await prisma.recurringBlock.count();
  
  console.log('');
  console.log('✅ Availability data seeded successfully!');
  console.log(`   - ${blockCount} availability blocks created`);
  console.log(`   - ${recurringCount} recurring patterns created`);
}

main()
  .catch((e) => {
    console.error('Error seeding availability data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
