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
      
      try {
        // Delete in correct order to respect foreign key constraints
        // Level 1: Leaf nodes (no dependencies)
        console.log('  Deleting leaf nodes...');
        
        try {
          const messageCount = await prisma.message.count();
          await prisma.message.deleteMany();
          console.log(`    ✓ Deleted ${messageCount} messages`);
        } catch (error) {
          console.error('    ❌ Failed to delete messages:', error);
          throw new Error(`Foreign key constraint violation: Messages may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const transactionCount = await prisma.transaction.count();
          await prisma.transaction.deleteMany();
          console.log(`    ✓ Deleted ${transactionCount} transactions`);
        } catch (error) {
          console.error('    ❌ Failed to delete transactions:', error);
          throw new Error(`Foreign key constraint violation: Transactions may be referenced by bookings or other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const ratingCount = await prisma.rating.count();
          await prisma.rating.deleteMany();
          console.log(`    ✓ Deleted ${ratingCount} ratings`);
        } catch (error) {
          console.error('    ❌ Failed to delete ratings:', error);
          throw new Error(`Foreign key constraint violation: Ratings may be referenced by bookings or companies. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const disputeCount = await prisma.dispute.count();
          await prisma.dispute.deleteMany();
          console.log(`    ✓ Deleted ${disputeCount} disputes`);
        } catch (error) {
          console.error('    ❌ Failed to delete disputes:', error);
          throw new Error(`Foreign key constraint violation: Disputes may be referenced by bookings. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const availabilityBlockCount = await prisma.availabilityBlock.count();
          await prisma.availabilityBlock.deleteMany(); // Must be before RecurringBlock
          console.log(`    ✓ Deleted ${availabilityBlockCount} availability blocks`);
        } catch (error) {
          console.error('    ❌ Failed to delete availability blocks:', error);
          throw new Error(`Foreign key constraint violation: Availability blocks may be referenced by recurring blocks or listings. ${error instanceof Error ? error.message : ''}`);
        }

        // Delete other leaf nodes with error handling
        try {
          const auditLogCount = await prisma.auditLog.count();
          await prisma.auditLog.deleteMany();
          console.log(`    ✓ Deleted ${auditLogCount} audit logs`);
        } catch (error) {
          console.error('    ❌ Failed to delete audit logs:', error);
          throw new Error(`Foreign key constraint violation: Audit logs may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const notificationCount = await prisma.notification.count();
          await prisma.notification.deleteMany();
          console.log(`    ✓ Deleted ${notificationCount} notifications`);
        } catch (error) {
          console.error('    ❌ Failed to delete notifications:', error);
          throw new Error(`Foreign key constraint violation: Notifications may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const notificationPreferencesCount = await prisma.notificationPreferences.count();
          await prisma.notificationPreferences.deleteMany();
          console.log(`    ✓ Deleted ${notificationPreferencesCount} notification preferences`);
        } catch (error) {
          console.error('    ❌ Failed to delete notification preferences:', error);
          throw new Error(`Foreign key constraint violation: Notification preferences may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const securityEventCount = await prisma.securityEvent.count();
          await prisma.securityEvent.deleteMany();
          console.log(`    ✓ Deleted ${securityEventCount} security events`);
        } catch (error) {
          console.error('    ❌ Failed to delete security events:', error);
          throw new Error(`Foreign key constraint violation: Security events may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const securityAlertCount = await prisma.securityAlert.count();
          await prisma.securityAlert.deleteMany();
          console.log(`    ✓ Deleted ${securityAlertCount} security alerts`);
        } catch (error) {
          console.error('    ❌ Failed to delete security alerts:', error);
          throw new Error(`Foreign key constraint violation: Security alerts may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const scheduledReportCount = await prisma.scheduledReport.count();
          await prisma.scheduledReport.deleteMany();
          console.log(`    ✓ Deleted ${scheduledReportCount} scheduled reports`);
        } catch (error) {
          console.error('    ❌ Failed to delete scheduled reports:', error);
          throw new Error(`Foreign key constraint violation: Scheduled reports may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const analyticsSnapshotsCount = await prisma.analyticsSnapshots.count();
          await prisma.analyticsSnapshots.deleteMany();
          console.log(`    ✓ Deleted ${analyticsSnapshotsCount} analytics snapshots`);
        } catch (error) {
          console.error('    ❌ Failed to delete analytics snapshots:', error);
          throw new Error(`Foreign key constraint violation: Analytics snapshots may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const contentFlagsCount = await prisma.contentFlags.count();
          await prisma.contentFlags.deleteMany();
          console.log(`    ✓ Deleted ${contentFlagsCount} content flags`);
        } catch (error) {
          console.error('    ❌ Failed to delete content flags:', error);
          throw new Error(`Foreign key constraint violation: Content flags may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const geographicRestrictionCount = await prisma.geographicRestriction.count();
          await prisma.geographicRestriction.deleteMany();
          console.log(`    ✓ Deleted ${geographicRestrictionCount} geographic restrictions`);
        } catch (error) {
          console.error('    ❌ Failed to delete geographic restrictions:', error);
          throw new Error(`Foreign key constraint violation: Geographic restrictions may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const paymentMethodConfigCount = await prisma.paymentMethodConfig.count();
          await prisma.paymentMethodConfig.deleteMany();
          console.log(`    ✓ Deleted ${paymentMethodConfigCount} payment method configs`);
        } catch (error) {
          console.error('    ❌ Failed to delete payment method configs:', error);
          throw new Error(`Foreign key constraint violation: Payment method configs may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const configurationHistoryCount = await prisma.configurationHistory.count();
          await prisma.configurationHistory.deleteMany();
          console.log(`    ✓ Deleted ${configurationHistoryCount} configuration history`);
        } catch (error) {
          console.error('    ❌ Failed to delete configuration history:', error);
          throw new Error(`Foreign key constraint violation: Configuration history may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }
        
        // Level 2: Entities with Level 1 dependencies
        console.log('  Deleting level 2 entities...');
        
        try {
          const messageThreadCount = await prisma.messageThread.count();
          await prisma.messageThread.deleteMany();
          console.log(`    ✓ Deleted ${messageThreadCount} message threads`);
        } catch (error) {
          console.error('    ❌ Failed to delete message threads:', error);
          throw new Error(`Foreign key constraint violation: Message threads may be referenced by messages or bookings. Ensure all messages are deleted first. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const recurringBlockCount = await prisma.recurringBlock.count();
          await prisma.recurringBlock.deleteMany(); // After AvailabilityBlock
          console.log(`    ✓ Deleted ${recurringBlockCount} recurring blocks`);
        } catch (error) {
          console.error('    ❌ Failed to delete recurring blocks:', error);
          throw new Error(`Foreign key constraint violation: Recurring blocks may be referenced by availability blocks or listings. Ensure availability blocks are deleted first. ${error instanceof Error ? error.message : ''}`);
        }
        
        // Level 3: Entities with Level 2 dependencies
        console.log('  Deleting bookings...');
        try {
          const bookingCount = await prisma.booking.count();
          await prisma.booking.deleteMany();
          console.log(`    ✓ Deleted ${bookingCount} bookings`);
        } catch (error) {
          console.error('    ❌ Failed to delete bookings:', error);
          throw new Error(`Foreign key constraint violation: Bookings may be referenced by ratings, transactions, disputes, or message threads. Ensure all dependent entities are deleted first. ${error instanceof Error ? error.message : ''}`);
        }
        
        // Level 4: Entities with Level 3 dependencies
        console.log('  Deleting listings...');
        try {
          const driverListingCount = await prisma.driverListing.count();
          await prisma.driverListing.deleteMany();
          console.log(`    ✓ Deleted ${driverListingCount} driver listings`);
        } catch (error) {
          console.error('    ❌ Failed to delete driver listings:', error);
          throw new Error(`Foreign key constraint violation: Driver listings may be referenced by bookings or ratings. Ensure all bookings are deleted first. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const vehicleListingCount = await prisma.vehicleListing.count();
          await prisma.vehicleListing.deleteMany();
          console.log(`    ✓ Deleted ${vehicleListingCount} vehicle listings`);
        } catch (error) {
          console.error('    ❌ Failed to delete vehicle listings:', error);
          throw new Error(`Foreign key constraint violation: Vehicle listings may be referenced by bookings, availability blocks, or recurring blocks. Ensure all dependent entities are deleted first. ${error instanceof Error ? error.message : ''}`);
        }
        
        // Level 5: Entities with Level 4 dependencies
        console.log('  Deleting users...');
        try {
          const platformConfigsCount = await prisma.platformConfigs.count();
          await prisma.platformConfigs.deleteMany(); // Before User (references updatedBy)
          console.log(`    ✓ Deleted ${platformConfigsCount} platform configs`);
        } catch (error) {
          console.error('    ❌ Failed to delete platform configs:', error);
          throw new Error(`Foreign key constraint violation: Platform configs may be referenced by users (updatedBy field). ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const userCount = await prisma.user.count();
          await prisma.user.deleteMany();
          console.log(`    ✓ Deleted ${userCount} users`);
        } catch (error) {
          console.error('    ❌ Failed to delete users:', error);
          throw new Error(`Foreign key constraint violation: Users may be referenced by listings, bookings, messages, or audit logs. Ensure all dependent entities are deleted first. ${error instanceof Error ? error.message : ''}`);
        }
        
        // Level 6: Root entities
        console.log('  Deleting root entities...');
        try {
          const companyCount = await prisma.company.count();
          await prisma.company.deleteMany();
          console.log(`    ✓ Deleted ${companyCount} companies`);
        } catch (error) {
          console.error('    ❌ Failed to delete companies:', error);
          throw new Error(`Foreign key constraint violation: Companies may be referenced by users, listings, or bookings. Ensure all dependent entities are deleted first. ${error instanceof Error ? error.message : ''}`);
        }

        try {
          const platformConfigCount = await prisma.platformConfig.count();
          await prisma.platformConfig.deleteMany();
          console.log(`    ✓ Deleted ${platformConfigCount} platform config entries`);
        } catch (error) {
          console.error('    ❌ Failed to delete platform config:', error);
          throw new Error(`Foreign key constraint violation: Platform config may be referenced by other entities. ${error instanceof Error ? error.message : ''}`);
        }
        
        console.log('✓ Existing data cleared successfully');
      } catch (error) {
        console.error('❌ Error during data deletion:', error);
        throw new Error(`Failed to clear existing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('🌱 Starting database seed...');

    // Create platform configuration
    console.log('  Creating platform configuration...');
    try {
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
      console.log('    ✓ Platform configuration created successfully');
    } catch (error) {
      console.error('    ❌ Failed to create platform configuration:', error);
      throw new Error(`Failed to create platform configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Create companies
    console.log('  Creating companies...');
    let company1, company2, company3;
    
    try {
      company1 = await prisma.company.create({
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
      console.log('    ✓ Created Oslo Transport AS');
    } catch (error) {
      console.error('    ❌ Failed to create Oslo Transport AS:', error);
      throw new Error(`Failed to create company 'Oslo Transport AS': ${error instanceof Error ? error.message : 'Unknown error'}. Check for duplicate organization numbers or invalid data.`);
    }

    try {
      company2 = await prisma.company.create({
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
      console.log('    ✓ Created Bergen Logistics');
    } catch (error) {
      console.error('    ❌ Failed to create Bergen Logistics:', error);
      throw new Error(`Failed to create company 'Bergen Logistics': ${error instanceof Error ? error.message : 'Unknown error'}. Check for duplicate organization numbers or invalid data.`);
    }

    try {
      company3 = await prisma.company.create({
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
      console.log('    ✓ Created Trondheim Fleet Services');
    } catch (error) {
      console.error('    ❌ Failed to create Trondheim Fleet Services:', error);
      throw new Error(`Failed to create company 'Trondheim Fleet Services': ${error instanceof Error ? error.message : 'Unknown error'}. Check for duplicate organization numbers or invalid data.`);
    }

    // Create users
    console.log('  Creating users...');
    let hashedPassword, platformAdmin, company3User;
    
    try {
      hashedPassword = await bcrypt.hash('password123', 12);
      console.log('    ✓ Password hashed successfully');
    } catch (error) {
      console.error('    ❌ Failed to hash password:', error);
      throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      platformAdmin = await prisma.user.create({
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
      console.log('    ✓ Created platform admin user');
    } catch (error) {
      console.error('    ❌ Failed to create platform admin user:', error);
      throw new Error(`Failed to create platform admin user: ${error instanceof Error ? error.message : 'Unknown error'}. Check for duplicate email addresses or invalid company reference.`);
    }

    try {
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
      console.log('    ✓ Created Oslo Transport admin user');
    } catch (error) {
      console.error('    ❌ Failed to create Oslo Transport admin user:', error);
      throw new Error(`Failed to create Oslo Transport admin user: ${error instanceof Error ? error.message : 'Unknown error'}. Check for duplicate email addresses or invalid company reference.`);
    }

    try {
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
      console.log('    ✓ Created Bergen Logistics admin user');
    } catch (error) {
      console.error('    ❌ Failed to create Bergen Logistics admin user:', error);
      throw new Error(`Failed to create Bergen Logistics admin user: ${error instanceof Error ? error.message : 'Unknown error'}. Check for duplicate email addresses or invalid company reference.`);
    }

    try {
      company3User = await prisma.user.create({
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
      console.log('    ✓ Created Trondheim Fleet user');
    } catch (error) {
      console.error('    ❌ Failed to create Trondheim Fleet user:', error);
      throw new Error(`Failed to create Trondheim Fleet user: ${error instanceof Error ? error.message : 'Unknown error'}. Check for duplicate email addresses or invalid company reference.`);
    }

    // Create vehicle listings
    console.log('  Creating vehicle listings...');
    let vehicle1, vehicle2;
    
    try {
      vehicle1 = await prisma.vehicleListing.create({
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
      console.log('    ✓ Created Mercedes-Benz Actros listing');
    } catch (error) {
      console.error('    ❌ Failed to create Mercedes-Benz Actros listing:', error);
      throw new Error(`Failed to create vehicle listing 'Mercedes-Benz Actros': ${error instanceof Error ? error.message : 'Unknown error'}. Check company reference and vehicle data validity.`);
    }

    try {
      vehicle2 = await prisma.vehicleListing.create({
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
      console.log('    ✓ Created refrigerated truck listing');
    } catch (error) {
      console.error('    ❌ Failed to create refrigerated truck listing:', error);
      throw new Error(`Failed to create vehicle listing 'Refrigerated truck': ${error instanceof Error ? error.message : 'Unknown error'}. Check company reference and vehicle data validity.`);
    }

    try {
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
      console.log('    ✓ Created electric van listing');
    } catch (error) {
      console.error('    ❌ Failed to create electric van listing:', error);
      throw new Error(`Failed to create vehicle listing 'Electric van': ${error instanceof Error ? error.message : 'Unknown error'}. Check company reference and vehicle data validity.`);
    }

    try {
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
      console.log('    ✓ Created heavy-duty trailer listing');
    } catch (error) {
      console.error('    ❌ Failed to create heavy-duty trailer listing:', error);
      throw new Error(`Failed to create vehicle listing 'Heavy-duty trailer': ${error instanceof Error ? error.message : 'Unknown error'}. Check company reference and vehicle data validity.`);
    }

    // Create driver listings
    console.log('  Creating driver listings...');
    let driver1;
    
    try {
      driver1 = await prisma.driverListing.create({
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
      console.log('    ✓ Created Erik Andersen driver listing');
    } catch (error) {
      console.error('    ❌ Failed to create Erik Andersen driver listing:', error);
      throw new Error(`Failed to create driver listing 'Erik Andersen': ${error instanceof Error ? error.message : 'Unknown error'}. Check company and verifier user references.`);
    }

    try {
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
      console.log('    ✓ Created Ingrid Sørensen driver listing');
    } catch (error) {
      console.error('    ❌ Failed to create Ingrid Sørensen driver listing:', error);
      throw new Error(`Failed to create driver listing 'Ingrid Sørensen': ${error instanceof Error ? error.message : 'Unknown error'}. Check company and verifier user references.`);
    }

    try {
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
      console.log('    ✓ Created Thomas Berg driver listing');
    } catch (error) {
      console.error('    ❌ Failed to create Thomas Berg driver listing:', error);
      throw new Error(`Failed to create driver listing 'Thomas Berg': ${error instanceof Error ? error.message : 'Unknown error'}. Check company reference.`);
    }

    // Create sample bookings
    console.log('  Creating sample bookings...');
    let booking1;
    
    try {
      booking1 = await prisma.booking.create({
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
      console.log('    ✓ Created completed booking VDR-2024-001');
    } catch (error) {
      console.error('    ❌ Failed to create booking VDR-2024-001:', error);
      throw new Error(`Failed to create booking 'VDR-2024-001': ${error instanceof Error ? error.message : 'Unknown error'}. Check company, vehicle, and driver references.`);
    }

    try {
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
      console.log('    ✓ Created active booking VDR-2024-002');
    } catch (error) {
      console.error('    ❌ Failed to create booking VDR-2024-002:', error);
      throw new Error(`Failed to create booking 'VDR-2024-002': ${error instanceof Error ? error.message : 'Unknown error'}. Check company and vehicle references.`);
    }

    try {
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
      console.log('    ✓ Created pending booking VDR-2024-003');
    } catch (error) {
      console.error('    ❌ Failed to create booking VDR-2024-003:', error);
      throw new Error(`Failed to create booking 'VDR-2024-003': ${error instanceof Error ? error.message : 'Unknown error'}. Check company and vehicle references.`);
    }

    // Create rating
    console.log('  Creating sample rating...');
    try {
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
      console.log('    ✓ Created rating for booking VDR-2024-001');
    } catch (error) {
      console.error('    ❌ Failed to create rating:', error);
      throw new Error(`Failed to create rating: ${error instanceof Error ? error.message : 'Unknown error'}. Check booking, company, and driver references.`);
    }

    // Create message thread
    console.log('  Creating sample messages...');
    let thread1;
    
    try {
      thread1 = await prisma.messageThread.create({
        data: {
          bookingId: booking1.id,
          participants: [company3User.id, platformAdmin.id],
        },
      });
      console.log('    ✓ Created message thread');
    } catch (error) {
      console.error('    ❌ Failed to create message thread:', error);
      throw new Error(`Failed to create message thread: ${error instanceof Error ? error.message : 'Unknown error'}. Check booking and user references.`);
    }

    try {
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
      console.log('    ✓ Created sample messages');
    } catch (error) {
      console.error('    ❌ Failed to create messages:', error);
      throw new Error(`Failed to create messages: ${error instanceof Error ? error.message : 'Unknown error'}. Check thread and user references.`);
    }

    console.log('✅ Database seeded successfully!');

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
    console.error('❌ Seed error:', error);
    
    // Categorize error types for better debugging
    let errorCode = 'SEED_FAILED';
    let errorMessage = 'Failed to seed database';
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('foreign key constraint') || errorMsg.includes('constraint violation')) {
        errorCode = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
        errorMessage = `Foreign key constraint violation: ${error.message}`;
      } else if (errorMsg.includes('unique constraint') || errorMsg.includes('duplicate')) {
        errorCode = 'DUPLICATE_DATA_ERROR';
        errorMessage = `Duplicate data error: ${error.message}`;
      } else if (errorMsg.includes('invalid') || errorMsg.includes('validation')) {
        errorCode = 'DATA_VALIDATION_ERROR';
        errorMessage = `Data validation error: ${error.message}`;
      } else if (errorMsg.includes('connection') || errorMsg.includes('timeout')) {
        errorCode = 'DATABASE_CONNECTION_ERROR';
        errorMessage = `Database connection error: ${error.message}`;
      } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
        errorCode = 'DATABASE_PERMISSION_ERROR';
        errorMessage = `Database permission error: ${error.message}`;
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(500).json({
      error: {
        code: errorCode,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        suggestion: getSeedingErrorSuggestion(errorCode),
      },
    });
  }
});

/**
 * Provides helpful suggestions based on seeding error types
 */
function getSeedingErrorSuggestion(errorCode: string): string {
  switch (errorCode) {
    case 'FOREIGN_KEY_CONSTRAINT_VIOLATION':
      return 'Check that all referenced entities exist and deletion order is correct. Ensure child records are deleted before parent records.';
    case 'DUPLICATE_DATA_ERROR':
      return 'Check for duplicate email addresses, organization numbers, or other unique fields. Use force=true to clear existing data first.';
    case 'DATA_VALIDATION_ERROR':
      return 'Verify that all required fields are provided and data types match the schema. Check enum values and field constraints.';
    case 'DATABASE_CONNECTION_ERROR':
      return 'Verify database connection string and ensure the database server is running and accessible.';
    case 'DATABASE_PERMISSION_ERROR':
      return 'Check database user permissions. Ensure the user has CREATE, INSERT, UPDATE, and DELETE permissions on all tables.';
    default:
      return 'Check the error message above for specific details. Ensure database schema is up to date and all dependencies are properly configured.';
  }
}

/**
 * POST /api/seed/platform-admin
 * Create platform administrator account
 * Protected by a secret key
 */
router.post('/platform-admin', async (req: Request, res: Response): Promise<void> => {
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

    console.log('🔧 Creating platform administrator...');

    // Check if platform admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@vider.no' }
    });

    if (existingAdmin) {
      res.status(200).json({
        message: 'Platform admin already exists',
        account: {
          email: 'admin@vider.no',
          role: 'PLATFORM_ADMIN',
          status: 'existing'
        }
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 12);

    // Find an existing company to use for platform admin
    const existingCompany = await prisma.company.findFirst();
    
    if (!existingCompany) {
      res.status(400).json({
        error: {
          code: 'NO_COMPANIES_FOUND',
          message: 'No companies found. Please seed the database first.',
        },
      });
      return;
    }

    // Create platform admin user
    const platformAdmin = await prisma.user.create({
      data: {
        email: 'admin@vider.no',
        passwordHash,
        role: 'PLATFORM_ADMIN',
        companyId: existingCompany.id,
        firstName: 'Platform',
        lastName: 'Administrator',
        phone: '+47 12345678',
        emailVerified: true,
      },
    });

    console.log('✅ Platform administrator created successfully!');

    res.status(201).json({
      message: 'Platform administrator created successfully!',
      account: {
        email: 'admin@vider.no',
        password: 'password123',
        role: 'PLATFORM_ADMIN',
        status: 'created'
      },
      warning: 'IMPORTANT: Change the default password after first login!'
    });

  } catch (error) {
    console.error('❌ Error creating platform admin:', error);
    
    res.status(500).json({
      error: {
        code: 'ADMIN_CREATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create platform admin',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
