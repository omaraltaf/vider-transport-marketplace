const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createPlatformAdmin() {
  console.log('🔧 Creating platform administrator...');

  try {
    // Check if platform admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@vider.no' }
    });

    if (existingAdmin) {
      console.log('✅ Platform admin already exists');
      console.log('   Email: admin@vider.no');
      console.log('   Role: PLATFORM_ADMIN');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 12);

    // Find or create a platform admin company
    let platformCompany = await prisma.company.findFirst({
      where: { 
        OR: [
          { name: 'Vider Platform Administration' },
          { organizationNumber: '999999999' }
        ]
      }
    });

    if (!platformCompany) {
      // Create platform admin company with unique org number
      platformCompany = await prisma.company.create({
        data: {
          name: 'Vider Platform Administration',
          organizationNumber: '999888777', // Different org number to avoid conflicts
          businessAddress: 'Platform HQ, Storgata 1',
          city: 'Oslo',
          postalCode: '0001',
          fylke: 'Oslo',
          kommune: 'Oslo',
          vatRegistered: true,
          description: 'Platform administration and management',
          verified: true,
          verifiedAt: new Date(),
        },
      });
      console.log('✅ Created platform administration company');
    } else {
      console.log('✅ Using existing platform company:', platformCompany.name);
    }

    // Create platform admin user
    const platformAdmin = await prisma.user.create({
      data: {
        email: 'admin@vider.no',
        passwordHash,
        role: 'PLATFORM_ADMIN',
        companyId: platformCompany.id,
        firstName: 'Platform',
        lastName: 'Administrator',
        phone: '+47 12345678',
        emailVerified: true,
      },
    });

    console.log('✅ Platform administrator created successfully!');
    console.log('');
    console.log('🔑 Platform Administrator Account:');
    console.log('   Email: admin@vider.no');
    console.log('   Password: password123');
    console.log('   Role: PLATFORM_ADMIN');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating platform admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
if (require.main === module) {
  createPlatformAdmin()
    .then(() => {
      console.log('🎉 Platform admin setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Platform admin setup failed:', error);
      process.exit(1);
    });
}

module.exports = createPlatformAdmin;