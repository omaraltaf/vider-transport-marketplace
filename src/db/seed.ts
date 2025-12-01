import { PrismaClient, Role, VehicleType, FuelType, ListingStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create platform configuration
  console.log('Creating platform configuration...');
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
  console.log('✓ Platform configuration created');

  // Create companies
  console.log('Creating companies...');
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
  console.log('✓ Companies created');

  // Create users
  console.log('Creating users...');
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

  const company1Admin = await prisma.user.create({
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

  const company2Admin = await prisma.user.create({
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
  console.log('✓ Users created');

  // Create vehicle listings
  console.log('Creating vehicle listings...');
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
      withDriverHourlyRate: 350,
      withDriverDailyRate: 2500,
      withoutDriver: true,
      photos: ['/uploads/truck1.jpg', '/uploads/truck1-2.jpg'],
      tags: ['tail-lift', 'GPS-tracking'],
      status: ListingStatus.ACTIVE,
    },
  });

  const vehicle2 = await prisma.vehicleListing.create({
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
      withDriverHourlyRate: 400,
      withDriverDailyRate: 2800,
      withoutDriver: false,
      photos: ['/uploads/truck2.jpg'],
      tags: ['refrigerated', 'ADR-certified', 'tail-lift'],
      status: ListingStatus.ACTIVE,
    },
  });

  const vehicle3 = await prisma.vehicleListing.create({
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
      withDriverHourlyRate: 300,
      withDriverDailyRate: 2200,
      withoutDriver: true,
      photos: ['/uploads/van1.jpg'],
      tags: ['electric', 'zero-emission'],
      status: ListingStatus.ACTIVE,
    },
  });

  const vehicle4 = await prisma.vehicleListing.create({
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
      withDriverHourlyRate: 450,
      withDriverDailyRate: 3200,
      withoutDriver: true,
      photos: ['/uploads/trailer1.jpg'],
      tags: ['long-haul', 'heavy-duty'],
      status: ListingStatus.ACTIVE,
    },
  });
  console.log('✓ Vehicle listings created');

  // Create driver listings
  console.log('Creating driver listings...');
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
      licenseDocumentPath: '/uploads/licenses/erik-license.pdf',
      aggregatedRating: 4.7,
      totalRatings: 15,
      status: ListingStatus.ACTIVE,
    },
  });

  const driver2 = await prisma.driverListing.create({
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
      licenseDocumentPath: '/uploads/licenses/ingrid-license.pdf',
      aggregatedRating: 4.9,
      totalRatings: 10,
      status: ListingStatus.ACTIVE,
    },
  });

  const driver3 = await prisma.driverListing.create({
    data: {
      companyId: company3.id,
      name: 'Thomas Berg',
      licenseClass: 'C',
      languages: ['Norwegian'],
      backgroundSummary: '5 years of local delivery experience',
      hourlyRate: 400,
      dailyRate: 2800,
      verified: false,
      licenseDocumentPath: '/uploads/licenses/thomas-license.pdf',
      aggregatedRating: 4.3,
      totalRatings: 6,
      status: ListingStatus.ACTIVE,
    },
  });
  console.log('✓ Driver listings created');

  // Create sample bookings
  console.log('Creating sample bookings...');
  const booking1 = await prisma.booking.create({
    data: {
      bookingNumber: 'VDR-2024-001',
      renterCompanyId: company3.id,
      providerCompanyId: company1.id,
      vehicleListingId: vehicle1.id,
      driverListingId: driver1.id,
      status: BookingStatus.COMPLETED,
      startDate: new Date('2024-01-15T08:00:00Z'),
      endDate: new Date('2024-01-15T18:00:00Z'),
      durationHours: 10,
      providerRate: 8500,
      platformCommission: 425,
      platformCommissionRate: 5,
      taxes: 2231.25,
      taxRate: 25,
      total: 11156.25,
      contractPdfPath: '/uploads/contracts/VDR-2024-001.pdf',
      respondedAt: new Date('2024-01-14T10:00:00Z'),
      expiresAt: new Date('2024-01-16T08:00:00Z'),
      completedAt: new Date('2024-01-15T18:30:00Z'),
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      bookingNumber: 'VDR-2024-002',
      renterCompanyId: company3.id,
      providerCompanyId: company2.id,
      vehicleListingId: vehicle2.id,
      driverListingId: driver2.id,
      status: BookingStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      durationDays: 2,
      providerRate: 13000,
      platformCommission: 650,
      platformCommissionRate: 5,
      taxes: 3412.5,
      taxRate: 25,
      total: 17062.5,
      contractPdfPath: '/uploads/contracts/VDR-2024-002.pdf',
      respondedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  const booking3 = await prisma.booking.create({
    data: {
      bookingNumber: 'VDR-2024-003',
      renterCompanyId: company2.id,
      providerCompanyId: company1.id,
      vehicleListingId: vehicle3.id,
      status: BookingStatus.PENDING,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      durationDays: 1,
      providerRate: 4000,
      platformCommission: 200,
      platformCommissionRate: 5,
      taxes: 1050,
      taxRate: 25,
      total: 5250,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  console.log('✓ Bookings created');

  // Create rating for completed booking
  console.log('Creating ratings...');
  const rating1 = await prisma.rating.create({
    data: {
      bookingId: booking1.id,
      renterCompanyId: company3.id,
      providerCompanyId: company1.id,
      driverListingId: driver1.id,
      companyStars: 5,
      companyReview: 'Excellent service, very professional and on time!',
      driverStars: 5,
      driverReview: 'Erik was fantastic - careful driver and very helpful.',
      providerResponse: 'Thank you for the kind words! We look forward to working with you again.',
      providerRespondedAt: new Date('2024-01-16T09:00:00Z'),
    },
  });
  console.log('✓ Ratings created');

  // Create message thread for active booking
  console.log('Creating message threads...');
  const thread1 = await prisma.messageThread.create({
    data: {
      bookingId: booking2.id,
      participants: [company3User.id, company2Admin.id],
    },
  });

  await prisma.message.createMany({
    data: [
      {
        threadId: thread1.id,
        senderId: company3User.id,
        content: 'Hi, what time can we pick up the vehicle tomorrow?',
        readBy: [company3User.id, company2Admin.id],
      },
      {
        threadId: thread1.id,
        senderId: company2Admin.id,
        content: 'Hello! The vehicle will be ready for pickup at 7:00 AM. Our address is Bryggen 5, Bergen.',
        readBy: [company2Admin.id],
      },
    ],
  });
  console.log('✓ Message threads created');

  // Create transactions
  console.log('Creating transactions...');
  await prisma.transaction.createMany({
    data: [
      {
        bookingId: booking1.id,
        type: 'BOOKING_PAYMENT',
        amount: 11156.25,
        status: 'COMPLETED',
      },
      {
        bookingId: booking1.id,
        type: 'COMMISSION',
        amount: 425,
        status: 'COMPLETED',
      },
      {
        bookingId: booking2.id,
        type: 'BOOKING_PAYMENT',
        amount: 17062.5,
        status: 'PENDING',
      },
    ],
  });
  console.log('✓ Transactions created');

  console.log('');
  console.log('✅ Database seeded successfully!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Platform Admin: admin@vider.no / password123');
  console.log('  Company Admin (Oslo): admin@oslotransport.no / password123');
  console.log('  Company Admin (Bergen): admin@bergenlogistics.no / password123');
  console.log('  Company User (Trondheim): user@trondheimfleet.no / password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
