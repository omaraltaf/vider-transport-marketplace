import { Router, Request, Response } from 'express';
import { PrismaClient, Role, VehicleType, FuelType, ListingStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { config } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/seed
 * One-time endpoint to seed the production database
 * Protected by a secret key
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for secret key in header
    const secretKey = req.headers['x-seed-secret'];
    
    if (!secretKey || secretKey !== config.JWT_SECRET) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid seed secret',
        },
      });
      return;
    }

    // Check if force flag is set
    const force = req.body.force === true;
    
    // Check if data already exists
    const existingCompanies = await prisma.company.count();
    if (existingCompanies > 0 && !force) {
      res.status(400).json({
        error: {
          code: 'ALREADY_SEEDED',
          message: 'Database already contains data. Add {"force": true} to the request body to clear and re-seed.',
        },
      });
      return;
    }

    // If force is true, clear existing data
    if (force && existingCompanies > 0) {
      console.log('🗑️  Clearing existing data...');
      
      // Delete in correct order to respect foreign key constraints
      await prisma.message.deleteMany();
      await prisma.messageThread.deleteMany();
      await prisma.transaction.deleteMany();
      await prisma.rating.deleteMany();
      await prisma.booking.deleteMany();
      await prisma.driverListing.deleteMany();
      await prisma.vehicleListing.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.auditLog.deleteMany();
      await prisma.user.deleteMany();
      await prisma.company.deleteMany();
      await prisma.platformConfig.deleteMany();
      
      console.log('✓ Existing data cleared');
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

    // Create sample bookings
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
        respondedAt: new Date('2024-01-14T10:00:00Z'),
        expiresAt: new Date('2024-01-16T08:00:00Z'),
        completedAt: new Date('2024-01-15T18:30:00Z'),
      },
    });

    await prisma.booking.create({
      data: {
        bookingNumber: 'VDR-2024-002',
        renterCompanyId: company3.id,
        providerCompanyId: company2.id,
        vehicleListingId: vehicle2.id,
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
        respondedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.booking.create({
      data: {
        bookingNumber: 'VDR-2024-003',
        renterCompanyId: company2.id,
        providerCompanyId: company1.id,
        vehicleListingId: vehicle1.id,
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

    // Create rating
    await prisma.rating.create({
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

    // Create message thread
    const thread1 = await prisma.messageThread.create({
      data: {
        bookingId: booking1.id,
        participants: [company3User.id, platformAdmin.id],
      },
    });

    await prisma.message.createMany({
      data: [
        {
          threadId: thread1.id,
          senderId: company3User.id,
          content: 'Hi, what time can we pick up the vehicle tomorrow?',
          readBy: [company3User.id],
        },
        {
          threadId: thread1.id,
          senderId: platformAdmin.id,
          content: 'Hello! The vehicle will be ready for pickup at 7:00 AM.',
          readBy: [platformAdmin.id],
        },
      ],
    });

    res.status(200).json({
      message: 'Database seeded successfully!',
      data: {
        companies: 3,
        users: 4,
        vehicles: 4,
        drivers: 3,
        bookings: 3,
        ratings: 1,
        messages: 2,
      },
      testAccounts: [
        { email: 'admin@vider.no', password: 'password123', role: 'PLATFORM_ADMIN' },
        { email: 'admin@oslotransport.no', password: 'password123', role: 'COMPANY_ADMIN' },
        { email: 'admin@bergenlogistics.no', password: 'password123', role: 'COMPANY_ADMIN' },
        { email: 'user@trondheimfleet.no', password: 'password123', role: 'COMPANY_USER' },
      ],
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      error: {
        code: 'SEED_FAILED',
        message: error instanceof Error ? error.message : 'Failed to seed database',
      },
    });
  }
});

export default router;
