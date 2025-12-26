import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedProduction() {
  console.log('🌱 Seeding production database...');

  try {
    // Check if we're in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️  Warning: Not in production environment');
    }

    // Hash password for all accounts
    const passwordHash = await bcrypt.hash('admin123!', 12);

    // 1. Create Platform Admin Company
    console.log('Creating platform administration company...');
    const platformAdminCompany = await prisma.company.upsert({
      where: { organizationNumber: '999999999' },
      update: {},
      create: {
        name: 'Vider Platform Administration',
        organizationNumber: '999999999',
        businessAddress: 'Platform HQ, Storgata 1',
        city: 'Oslo',
        postalCode: '0001',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
        description: 'Platform administration and management',
        verified: true,
        verifiedAt: new Date(),
        status: 'ACTIVE',
      },
    });

    // 2. Create Platform Admin User
    console.log('Creating platform administrator...');
    await prisma.user.upsert({
      where: { email: 'admin@vider.no' },
      update: {},
      create: {
        email: 'admin@vider.no',
        passwordHash,
        role: 'PLATFORM_ADMIN',
        companyId: platformAdminCompany.id,
        firstName: 'Platform',
        lastName: 'Administrator',
        phone: '+47 12345678',
        emailVerified: true,
      },
    });

    // 3. Create Initial Platform Configuration
    console.log('Setting up platform configuration...');
    await prisma.platformConfig.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        commissionRate: 5.0,
        taxRate: 25.0,
        bookingTimeoutHours: 24,
        defaultCurrency: 'NOK',
        minBookingAmount: 500,
        maxBookingAmount: 100000,
        sessionTimeoutMinutes: 60,
        driverRatingsEnabled: true,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        cacheTtlSeconds: 300,
        apiRateLimitPerMinute: 100,
        autoApprovalEnabled: false,
        hourlyBookings: true,
        instantBooking: false,
        isActive: true,
        maintenanceMode: false,
        maxBookingDuration: 30,
        minBookingAdvance: 2,
        recurringBookings: true,
        version: 1,
        withoutDriverListings: true,
      },
    });

    // 4. Create Sample Company (Optional - only if no companies exist)
    const existingCompanies = await prisma.company.count({
      where: {
        NOT: {
          organizationNumber: '999999999'
        }
      }
    });

    if (existingCompanies === 0) {
      console.log('Creating sample company...');
      const sampleCompany = await prisma.company.create({
        data: {
          name: 'Demo Transport AS',
          organizationNumber: '123456789',
          businessAddress: 'Transportveien 10',
          city: 'Oslo',
          postalCode: '0150',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
          description: 'Demo transport company for testing',
          verified: true,
          verifiedAt: new Date(),
          status: 'ACTIVE',
        },
      });

      // Create sample company admin
      await prisma.user.create({
        data: {
          email: 'demo@transport.no',
          passwordHash,
          role: 'COMPANY_ADMIN',
          companyId: sampleCompany.id,
          firstName: 'Demo',
          lastName: 'Admin',
          phone: '+47 98765432',
          emailVerified: true,
        },
      });

      console.log('✅ Sample company created');
    }

    console.log('✅ Production database seeded successfully!');
    console.log('');
    console.log('🔑 Platform Administrator Account:');
    console.log('   Email: admin@vider.no');
    console.log('   Password: admin123!');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password immediately after first login!');
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedProduction()
    .then(() => {
      console.log('🎉 Production seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Production seeding failed:', error);
      process.exit(1);
    });
}

export default seedProduction;