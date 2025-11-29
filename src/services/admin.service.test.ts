import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, Role, VehicleType, FuelType, ListingStatus } from '@prisma/client';
import { adminService } from './admin.service';
import { listingService } from './listing.service';
import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('AdminService', () => {
  let testCompanyId: string;
  let testAdminUserId: string;
  let testProviderCompanyId: string;

  beforeEach(async () => {
    // Create test admin user and company with unique org numbers
    const timestamp = Date.now();
    const adminCompany = await prisma.company.create({
      data: {
        name: 'Admin Company',
        organizationNumber: `999${timestamp}`,
        businessAddress: 'Admin Street 1',
        city: 'Oslo',
        postalCode: '0001',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
      },
    });

    testCompanyId = adminCompany.id;

    const adminUser = await prisma.user.create({
      data: {
        email: `admin-${timestamp}@test.com`,
        passwordHash: await bcrypt.hash('password123', 12),
        role: Role.PLATFORM_ADMIN,
        companyId: testCompanyId,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+4712345678',
        emailVerified: true,
      },
    });

    testAdminUserId = adminUser.id;

    // Create test provider company
    const providerCompany = await prisma.company.create({
      data: {
        name: 'Provider Company',
        organizationNumber: `888${timestamp}`,
        businessAddress: 'Provider Street 1',
        city: 'Bergen',
        postalCode: '5001',
        fylke: 'Vestland',
        kommune: 'Bergen',
        vatRegistered: true,
      },
    });

    testProviderCompanyId = providerCompany.id;
  });

  afterEach(async () => {
    // Clean up in reverse order of dependencies
    await prisma.auditLog.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.messageThread.deleteMany({});
    await prisma.rating.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.vehicleListing.deleteMany({});
    await prisma.driverListing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.platformConfig.deleteMany({});
  });

  describe('Entity Management', () => {
    it('should search and list users', async () => {
      const result = await adminService.searchUsers({ page: 1, pageSize: 10 });

      expect(result.items).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should search and list companies', async () => {
      const result = await adminService.searchCompanies({ page: 1, pageSize: 10 });

      expect(result.items).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should verify a company', async () => {
      const company = await adminService.verifyCompany(testProviderCompanyId, testAdminUserId);

      expect(company.verified).toBe(true);
      expect(company.verifiedAt).toBeDefined();
      expect(company.verifiedBy).toBe(testAdminUserId);
    });

    it('should verify a driver listing', async () => {
      // Create a driver listing with license document
      const driverListing = await prisma.driverListing.create({
        data: {
          companyId: testProviderCompanyId,
          name: 'Test Driver',
          licenseClass: 'C',
          languages: ['Norwegian', 'English'],
          hourlyRate: 500,
          currency: 'NOK',
          licenseDocumentPath: '/uploads/licenses/test-license.pdf',
          status: ListingStatus.ACTIVE,
        },
      });

      const verified = await adminService.verifyDriver(driverListing.id, testAdminUserId);

      expect(verified.verified).toBe(true);
      expect(verified.verifiedAt).toBeDefined();
      expect(verified.verifiedBy).toBe(testAdminUserId);
    });

    it('should suspend a vehicle listing', async () => {
      // Create a vehicle listing
      const vehicleListing = await prisma.vehicleListing.create({
        data: {
          companyId: testProviderCompanyId,
          title: 'Test Vehicle',
          description: 'Test Description',
          vehicleType: VehicleType.PALLET_18,
          capacity: 18,
          fuelType: FuelType.DIESEL,
          city: 'Bergen',
          fylke: 'Vestland',
          kommune: 'Bergen',
          hourlyRate: 800,
          currency: 'NOK',
          withDriver: false,
          withoutDriver: true,
          photos: [],
          tags: [],
          status: ListingStatus.ACTIVE,
        },
      });

      const suspended = await adminService.suspendListing(
        vehicleListing.id,
        'vehicle',
        'Policy violation',
        testAdminUserId
      );

      expect(suspended.status).toBe(ListingStatus.SUSPENDED);
    });

    it('should remove a vehicle listing', async () => {
      // Create a vehicle listing
      const vehicleListing = await prisma.vehicleListing.create({
        data: {
          companyId: testProviderCompanyId,
          title: 'Test Vehicle',
          description: 'Test Description',
          vehicleType: VehicleType.PALLET_18,
          capacity: 18,
          fuelType: FuelType.DIESEL,
          city: 'Bergen',
          fylke: 'Vestland',
          kommune: 'Bergen',
          hourlyRate: 800,
          currency: 'NOK',
          withDriver: false,
          withoutDriver: true,
          photos: [],
          tags: [],
          status: ListingStatus.ACTIVE,
        },
      });

      await adminService.removeListing(
        vehicleListing.id,
        'vehicle',
        'Fraudulent listing',
        testAdminUserId
      );

      const removed = await prisma.vehicleListing.findUnique({
        where: { id: vehicleListing.id },
      });

      expect(removed?.status).toBe(ListingStatus.REMOVED);
    });
  });

  describe('Platform Configuration', () => {
    it('should update platform configuration', async () => {
      const config = await adminService.updatePlatformConfig(
        {
          commissionRate: 7,
          taxRate: 25,
          bookingTimeoutHours: 48,
        },
        testAdminUserId
      );

      expect(config.commissionRate).toBe(7);
      expect(config.taxRate).toBe(25);
      expect(config.bookingTimeoutHours).toBe(48);
    });

    it('should get platform configuration', async () => {
      const config = await adminService.getPlatformConfig();

      expect(config).toBeDefined();
      expect(config.commissionRate).toBeDefined();
      expect(config.taxRate).toBeDefined();
      expect(config.bookingTimeoutHours).toBeDefined();
    });
  });

  describe('Analytics', () => {
    it('should get analytics report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const analytics = await adminService.getAnalytics(startDate, endDate);

      expect(analytics).toBeDefined();
      expect(analytics.totalRevenue).toBeDefined();
      expect(analytics.activeListings).toBeDefined();
      expect(analytics.bookings).toBeDefined();
      expect(analytics.topRatedProviders).toBeDefined();
    });
  });

  describe('Dispute Resolution', () => {
    it('should create a dispute for a booking', async () => {
      // Create a booking
      const booking = await prisma.booking.create({
        data: {
          bookingNumber: `BK-${Date.now()}`,
          renterCompanyId: testCompanyId,
          providerCompanyId: testProviderCompanyId,
          status: 'COMPLETED',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          durationDays: 1,
          providerRate: 1000,
          platformCommission: 50,
          platformCommissionRate: 5,
          taxes: 262.5,
          taxRate: 25,
          total: 1312.5,
          currency: 'NOK',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const dispute = await adminService.createDispute({
        bookingId: booking.id,
        raisedBy: testAdminUserId,
        reason: 'Vehicle was damaged',
        description: 'The vehicle had significant damage upon delivery',
      });

      expect(dispute).toBeDefined();
      expect(dispute.bookingId).toBe(booking.id);
      expect(dispute.status).toBe('OPEN');

      // Verify booking status changed to DISPUTED
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
      });
      expect(updatedBooking?.status).toBe('DISPUTED');

      // Cleanup
      await prisma.dispute.delete({ where: { id: dispute.id } });
      await prisma.booking.delete({ where: { id: booking.id } });
    });

    it('should resolve a dispute with refund', async () => {
      // Create a booking and dispute
      const booking = await prisma.booking.create({
        data: {
          bookingNumber: `BK-${Date.now()}`,
          renterCompanyId: testCompanyId,
          providerCompanyId: testProviderCompanyId,
          status: 'DISPUTED',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          durationDays: 1,
          providerRate: 1000,
          platformCommission: 50,
          platformCommissionRate: 5,
          taxes: 262.5,
          taxRate: 25,
          total: 1312.5,
          currency: 'NOK',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const dispute = await prisma.dispute.create({
        data: {
          bookingId: booking.id,
          raisedBy: testAdminUserId,
          reason: 'Service issue',
          status: 'OPEN',
        },
      });

      const resolved = await adminService.resolveDispute(
        dispute.id,
        {
          resolution: 'Partial refund issued',
          refundAmount: 500,
          notes: 'Customer compensated for inconvenience',
        },
        testAdminUserId
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolution).toBe('Partial refund issued');
      expect(resolved.refundAmount).toBe(500);

      // Verify refund transaction was created
      const refundTransaction = await prisma.transaction.findFirst({
        where: {
          bookingId: booking.id,
          type: 'REFUND',
        },
      });

      expect(refundTransaction).toBeDefined();
      expect(refundTransaction?.amount).toBe(500);

      // Cleanup
      await prisma.transaction.deleteMany({ where: { bookingId: booking.id } });
      await prisma.dispute.delete({ where: { id: dispute.id } });
      await prisma.booking.delete({ where: { id: booking.id } });
    });

    it('should search disputes', async () => {
      const result = await adminService.searchDisputes({ page: 1, pageSize: 10 });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
  });

  describe('Transaction Reporting', () => {
    it('should get filtered transaction report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const report = await adminService.getTransactionReport({
        startDate,
        endDate,
        page: 1,
        pageSize: 50,
      });

      expect(report).toBeDefined();
      expect(report.items).toBeDefined();
      expect(report.page).toBe(1);
      expect(report.pageSize).toBe(50);
    });

    it('should filter transactions by type', async () => {
      const report = await adminService.getTransactionReport({
        transactionType: 'COMMISSION',
        page: 1,
        pageSize: 50,
      });

      expect(report).toBeDefined();
      expect(report.items).toBeDefined();
    });

    it('should filter transactions by company', async () => {
      const report = await adminService.getTransactionReport({
        companyId: testProviderCompanyId,
        page: 1,
        pageSize: 50,
      });

      expect(report).toBeDefined();
      expect(report.items).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should retrieve audit logs', async () => {
      // Perform an action that creates an audit log
      await adminService.verifyCompany(testProviderCompanyId, testAdminUserId);

      const logs = await adminService.getAuditLog({
        adminUserId: testAdminUserId,
        page: 1,
        pageSize: 10,
      });

      expect(logs.items.length).toBeGreaterThan(0);
      expect(logs.items[0].action).toBe('VERIFY_COMPANY');
      expect(logs.items[0].adminUserId).toBe(testAdminUserId);
    });
  });

  /**
   * Property 27: Listing suspension removes from search
   * **Feature: vider-transport-marketplace, Property 27: Listing suspension removes from search**
   * **Validates: Requirements 13.3**
   * 
   * For any listing that is suspended by a Platform Admin, the listing must not appear 
   * in any search results until the suspension is lifted.
   */
  describe('Property 27: Listing suspension removes from search', () => {
    it('should not return suspended vehicle listings in search results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 5, maxLength: 50 }),
            description: fc.string({ minLength: 10, maxLength: 200 }),
            capacity: fc.integer({ min: 1, max: 30 }),
            hourlyRate: fc.float({ min: 100, max: 2000 }),
          }),
          async (listingData) => {
            // Create a vehicle listing
            const vehicleListing = await prisma.vehicleListing.create({
              data: {
                companyId: testProviderCompanyId,
                title: listingData.title,
                description: listingData.description,
                vehicleType: VehicleType.PALLET_18,
                capacity: listingData.capacity,
                fuelType: FuelType.DIESEL,
                city: 'Bergen',
                fylke: 'Vestland',
                kommune: 'Bergen',
                hourlyRate: listingData.hourlyRate,
                currency: 'NOK',
                withDriver: false,
                withoutDriver: true,
                photos: [],
                tags: [],
                status: ListingStatus.ACTIVE,
              },
            });

            try {
              // Verify listing appears in search before suspension
              const searchBeforeSuspension = await listingService.searchListings({
                listingType: 'vehicle',
                page: 1,
                pageSize: 100,
              });

              const foundBeforeSuspension = searchBeforeSuspension.vehicleListings.some(
                (l) => l.id === vehicleListing.id
              );

              // Suspend the listing
              await adminService.suspendListing(
                vehicleListing.id,
                'vehicle',
                'Test suspension',
                testAdminUserId
              );

              // Search again after suspension
              const searchAfterSuspension = await listingService.searchListings({
                listingType: 'vehicle',
                page: 1,
                pageSize: 100,
              });

              const foundAfterSuspension = searchAfterSuspension.vehicleListings.some(
                (l) => l.id === vehicleListing.id
              );

              // Property: Suspended listings must not appear in search results
              // The listing should be found before suspension and not found after suspension
              expect(foundBeforeSuspension).toBe(true);
              expect(foundAfterSuspension).toBe(false);
            } finally {
              // Cleanup
              await prisma.vehicleListing.delete({ where: { id: vehicleListing.id } });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not return suspended driver listings in search results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 5, maxLength: 50 }),
            licenseClass: fc.constantFrom('B', 'C', 'C1', 'CE', 'D'),
            hourlyRate: fc.float({ min: 200, max: 1000 }),
          }),
          async (listingData) => {
            // Create a driver listing with license document and verify it
            const driverListing = await prisma.driverListing.create({
              data: {
                companyId: testProviderCompanyId,
                name: listingData.name,
                licenseClass: listingData.licenseClass,
                languages: ['Norwegian'],
                hourlyRate: listingData.hourlyRate,
                currency: 'NOK',
                licenseDocumentPath: '/uploads/licenses/test.pdf',
                verified: true,
                verifiedAt: new Date(),
                verifiedBy: testAdminUserId,
                status: ListingStatus.ACTIVE,
              },
            });

            try {
              // Verify listing appears in search before suspension
              const searchBeforeSuspension = await listingService.searchListings({
                listingType: 'driver',
                page: 1,
                pageSize: 100,
              });

              const foundBeforeSuspension = searchBeforeSuspension.driverListings.some(
                (l) => l.id === driverListing.id
              );

              // Suspend the listing
              await adminService.suspendListing(
                driverListing.id,
                'driver',
                'Test suspension',
                testAdminUserId
              );

              // Search again after suspension
              const searchAfterSuspension = await listingService.searchListings({
                listingType: 'driver',
                page: 1,
                pageSize: 100,
              });

              const foundAfterSuspension = searchAfterSuspension.driverListings.some(
                (l) => l.id === driverListing.id
              );

              // Property: Suspended listings must not appear in search results
              // The listing should be found before suspension and not found after suspension
              expect(foundBeforeSuspension).toBe(true);
              expect(foundAfterSuspension).toBe(false);
            } finally {
              // Cleanup
              await prisma.driverListing.delete({ where: { id: driverListing.id } });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 29: Dispute status transition
   * **Feature: vider-transport-marketplace, Property 29: Dispute status transition**
   * **Validates: Requirements 15.1**
   * 
   * For any booking where a dispute is raised, the system must transition the booking 
   * status to Disputed and notify the Platform Admin.
   */
  describe('Property 29: Dispute status transition', () => {
    it('should transition booking to DISPUTED status when dispute is raised', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            reason: fc.string({ minLength: 10, maxLength: 100 }),
            description: fc.option(fc.string({ minLength: 20, maxLength: 500 }), { nil: undefined }),
          }),
          async (disputeData) => {
            // Create a booking in COMPLETED status
            const booking = await prisma.booking.create({
              data: {
                bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                renterCompanyId: testCompanyId,
                providerCompanyId: testProviderCompanyId,
                status: 'COMPLETED',
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                durationDays: 1,
                providerRate: 1000,
                platformCommission: 50,
                platformCommissionRate: 5,
                taxes: 262.5,
                taxRate: 25,
                total: 1312.5,
                currency: 'NOK',
                expiresAt: new Date(Date.now() + 86400000),
              },
            });

            try {
              // Raise a dispute
              const dispute = await adminService.createDispute({
                bookingId: booking.id,
                raisedBy: testAdminUserId,
                reason: disputeData.reason,
                description: disputeData.description,
              });

              // Fetch the updated booking
              const updatedBooking = await prisma.booking.findUnique({
                where: { id: booking.id },
              });

              // Property: Booking status must be DISPUTED after dispute is raised
              expect(dispute).toBeDefined();
              expect(dispute.bookingId).toBe(booking.id);
              expect(dispute.status).toBe('OPEN');
              expect(updatedBooking?.status).toBe('DISPUTED');
            } finally {
              // Cleanup
              await prisma.dispute.deleteMany({ where: { bookingId: booking.id } });
              await prisma.booking.delete({ where: { id: booking.id } });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent duplicate disputes for the same booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            reason1: fc.string({ minLength: 10, maxLength: 100 }),
            reason2: fc.string({ minLength: 10, maxLength: 100 }),
          }),
          async (disputeData) => {
            // Create a booking
            const booking = await prisma.booking.create({
              data: {
                bookingNumber: `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                renterCompanyId: testCompanyId,
                providerCompanyId: testProviderCompanyId,
                status: 'COMPLETED',
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                durationDays: 1,
                providerRate: 1000,
                platformCommission: 50,
                platformCommissionRate: 5,
                taxes: 262.5,
                taxRate: 25,
                total: 1312.5,
                currency: 'NOK',
                expiresAt: new Date(Date.now() + 86400000),
              },
            });

            try {
              // Raise first dispute
              await adminService.createDispute({
                bookingId: booking.id,
                raisedBy: testAdminUserId,
                reason: disputeData.reason1,
              });

              // Attempt to raise second dispute for same booking
              let errorThrown = false;
              try {
                await adminService.createDispute({
                  bookingId: booking.id,
                  raisedBy: testAdminUserId,
                  reason: disputeData.reason2,
                });
              } catch (error: any) {
                errorThrown = true;
                expect(error.message).toBe('DISPUTE_ALREADY_EXISTS');
              }

              // Property: Second dispute creation must fail
              expect(errorThrown).toBe(true);
            } finally {
              // Cleanup
              await prisma.dispute.deleteMany({ where: { bookingId: booking.id } });
              await prisma.booking.delete({ where: { id: booking.id } });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 35: Admin action audit logging
   * **Feature: vider-transport-marketplace, Property 35: Admin action audit logging**
   * **Validates: Requirements 20.3**
   * 
   * For any administrative action performed by a Platform Admin, the system must create 
   * an audit log entry with timestamp, admin ID, action type, entity type, entity ID, 
   * and changes made.
   */
  describe('Property 35: Admin action audit logging', () => {
    it('should create audit log for all admin actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'verifyCompany',
            'verifyDriver',
            'suspendListing',
            'removeListing',
            'updateConfig'
          ),
          async (actionType) => {
            // Clear existing audit logs for this test
            await prisma.auditLog.deleteMany({ where: { adminUserId: testAdminUserId } });

            let entityId: string;
            let entityType: string;
            let expectedAction: string;

            // Perform different admin actions based on the action type
            if (actionType === 'verifyCompany') {
              // Create a new company to verify
              const company = await prisma.company.create({
                data: {
                  name: 'Test Company ' + Date.now(),
                  organizationNumber: String(Math.floor(Math.random() * 1000000000)),
                  businessAddress: 'Test Street',
                  city: 'Oslo',
                  postalCode: '0001',
                  fylke: 'Oslo',
                  kommune: 'Oslo',
                  vatRegistered: true,
                },
              });
              entityId = company.id;
              entityType = 'Company';
              expectedAction = 'VERIFY_COMPANY';

              await adminService.verifyCompany(company.id, testAdminUserId);

              // Cleanup
              await prisma.company.delete({ where: { id: company.id } });
            } else if (actionType === 'verifyDriver') {
              // Create a driver listing to verify
              const driver = await prisma.driverListing.create({
                data: {
                  companyId: testProviderCompanyId,
                  name: 'Test Driver ' + Date.now(),
                  licenseClass: 'C',
                  languages: ['Norwegian'],
                  hourlyRate: 500,
                  currency: 'NOK',
                  licenseDocumentPath: '/uploads/test.pdf',
                  status: ListingStatus.ACTIVE,
                },
              });
              entityId = driver.id;
              entityType = 'DriverListing';
              expectedAction = 'VERIFY_DRIVER';

              await adminService.verifyDriver(driver.id, testAdminUserId);

              // Cleanup
              await prisma.driverListing.delete({ where: { id: driver.id } });
            } else if (actionType === 'suspendListing') {
              // Create a vehicle listing to suspend
              const vehicle = await prisma.vehicleListing.create({
                data: {
                  companyId: testProviderCompanyId,
                  title: 'Test Vehicle ' + Date.now(),
                  description: 'Test',
                  vehicleType: VehicleType.PALLET_18,
                  capacity: 18,
                  fuelType: FuelType.DIESEL,
                  city: 'Bergen',
                  fylke: 'Vestland',
                  kommune: 'Bergen',
                  hourlyRate: 800,
                  currency: 'NOK',
                  withDriver: false,
                  withoutDriver: true,
                  photos: [],
                  tags: [],
                  status: ListingStatus.ACTIVE,
                },
              });
              entityId = vehicle.id;
              entityType = 'VehicleListing';
              expectedAction = 'SUSPEND_LISTING';

              await adminService.suspendListing(vehicle.id, 'vehicle', 'Test reason', testAdminUserId);

              // Cleanup
              await prisma.vehicleListing.delete({ where: { id: vehicle.id } });
            } else if (actionType === 'removeListing') {
              // Create a vehicle listing to remove
              const vehicle = await prisma.vehicleListing.create({
                data: {
                  companyId: testProviderCompanyId,
                  title: 'Test Vehicle ' + Date.now(),
                  description: 'Test',
                  vehicleType: VehicleType.PALLET_18,
                  capacity: 18,
                  fuelType: FuelType.DIESEL,
                  city: 'Bergen',
                  fylke: 'Vestland',
                  kommune: 'Bergen',
                  hourlyRate: 800,
                  currency: 'NOK',
                  withDriver: false,
                  withoutDriver: true,
                  photos: [],
                  tags: [],
                  status: ListingStatus.ACTIVE,
                },
              });
              entityId = vehicle.id;
              entityType = 'VehicleListing';
              expectedAction = 'REMOVE_LISTING';

              await adminService.removeListing(vehicle.id, 'vehicle', 'Test reason', testAdminUserId);

              // Cleanup
              await prisma.vehicleListing.delete({ where: { id: vehicle.id } });
            } else {
              // updateConfig
              entityType = 'PlatformConfig';
              expectedAction = 'UPDATE_PLATFORM_CONFIG';

              const config = await adminService.updatePlatformConfig(
                { commissionRate: 5 + Math.random() * 5 },
                testAdminUserId
              );
              entityId = 'config'; // Config doesn't have a specific ID in our implementation
            }

            // Retrieve audit logs
            const logs = await adminService.getAuditLog({
              adminUserId: testAdminUserId,
              page: 1,
              pageSize: 10,
            });

            // Property: An audit log entry must exist for the action
            expect(logs.items.length).toBeGreaterThan(0);

            const relevantLog = logs.items.find((log) => log.action === expectedAction);
            expect(relevantLog).toBeDefined();

            // Verify all required fields are present
            expect(relevantLog!.adminUserId).toBe(testAdminUserId);
            expect(relevantLog!.action).toBe(expectedAction);
            expect(relevantLog!.entityType).toBe(entityType);
            expect(relevantLog!.entityId).toBeDefined();
            expect(relevantLog!.createdAt).toBeDefined();
            expect(relevantLog!.changes).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
