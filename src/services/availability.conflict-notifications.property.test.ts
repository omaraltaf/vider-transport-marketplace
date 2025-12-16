/**
 * Property-Based Tests for Availability Conflict Notifications
 * Feature: listing-availability-calendar, Property 13: Conflict notification generation
 * Validates: Requirements 7.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient, BookingStatus, NotificationType } from '@prisma/client';
import { availabilityService } from './availability.service';

const prisma = new PrismaClient();

describe('Property 13: Conflict notification generation', () => {
  // Clean up test data before and after each test
  beforeEach(async () => {
    await prisma.notification.deleteMany({});
    await prisma.availabilityBlock.deleteMany({});
    await prisma.messageThread.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.driverListing.deleteMany({});
    await prisma.vehicleListing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
  });

  afterEach(async () => {
    await prisma.notification.deleteMany({});
    await prisma.availabilityBlock.deleteMany({});
    await prisma.messageThread.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.driverListing.deleteMany({});
    await prisma.vehicleListing.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
  });

  /**
   * Property 13: Conflict notification generation
   * For any availability block creation that conflicts with a pending booking request,
   * a notification should be generated for the provider
   */
  it('should generate conflict notification when block conflicts with pending booking', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random test data
        fc.integer({ min: 1, max: 10 }).chain(bookingDurationDays =>
          fc.record({
            // Company and user data
            providerCompanyName: fc.string({ minLength: 3, maxLength: 20 }),
            baseId: fc.uuid(),
            renterCompanyName: fc.string({ minLength: 3, maxLength: 20 }),
            
            // Listing data
            listingType: fc.constantFrom('vehicle' as const, 'driver' as const),
            listingTitle: fc.string({ minLength: 5, maxLength: 30 }),
            
            // Date range for booking (pending)
            bookingStartDayOffset: fc.integer({ min: 1, max: 30 }),
            bookingDurationDays: fc.constant(bookingDurationDays),
            
            // Date range for availability block (overlapping)
            // To guarantee overlap: block must start before booking ends
            // blockStartDayOffset < bookingDurationDays ensures overlap
            blockStartDayOffset: fc.integer({ min: 0, max: Math.max(0, bookingDurationDays - 1) }),
            blockDurationDays: fc.integer({ min: 1, max: 15 }),
            
            blockReason: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
          })
        ),
        async (data) => {
          // Clean up any existing data from previous iterations
          await prisma.notification.deleteMany({});
          await prisma.availabilityBlock.deleteMany({});
          await prisma.messageThread.deleteMany({});
          await prisma.booking.deleteMany({});
          await prisma.driverListing.deleteMany({});
          await prisma.vehicleListing.deleteMany({});
          await prisma.user.deleteMany({});
          await prisma.company.deleteMany({});

          // Derive unique identifiers from base UUID
          const providerOrgNumber = `P-${data.baseId}`;
          const renterOrgNumber = `R-${data.baseId}`;
          const providerUserEmail = `provider-${data.baseId}@test.com`;
          const renterUserEmail = `renter-${data.baseId}@test.com`;

          // Create provider company and user
          const providerCompany = await prisma.company.create({
            data: {
              name: data.providerCompanyName,
              organizationNumber: providerOrgNumber,
              businessAddress: 'Test Address 1',
              city: 'Oslo',
              postalCode: '0001',
              fylke: 'Oslo',
              kommune: 'Oslo',
              vatRegistered: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          const providerUser = await prisma.user.create({
            data: {
              email: providerUserEmail,
              passwordHash: 'test-hash',
              firstName: 'Provider',
              lastName: 'User',
              phone: '+4712345678',
              companyId: providerCompany.id,
              role: 'COMPANY_ADMIN',
            },
          });

          // Create renter company and user
          const renterCompany = await prisma.company.create({
            data: {
              name: data.renterCompanyName,
              organizationNumber: renterOrgNumber,
              businessAddress: 'Test Address 2',
              city: 'Bergen',
              postalCode: '5001',
              fylke: 'Vestland',
              kommune: 'Bergen',
              vatRegistered: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          const renterUser = await prisma.user.create({
            data: {
              email: renterUserEmail,
              passwordHash: 'test-hash',
              firstName: 'Renter',
              lastName: 'User',
              phone: '+4787654321',
              companyId: renterCompany.id,
              role: 'COMPANY_ADMIN',
            },
          });

          // Create listing
          let listingId: string;
          if (data.listingType === 'vehicle') {
            const listing = await prisma.vehicleListing.create({
              data: {
                companyId: providerCompany.id,
                title: data.listingTitle,
                description: 'Test vehicle listing',
                vehicleType: 'PALLET_8',
                capacity: 10,
                fuelType: 'DIESEL',
                city: 'Oslo',
                fylke: 'Oslo',
                kommune: 'Oslo',
                withDriver: false,
                withoutDriver: true,
                photos: [],
                tags: [],
                hourlyRate: 500,
                dailyRate: 3000,
                currency: 'NOK',
                status: 'ACTIVE',
              },
            });
            listingId = listing.id;
          } else {
            const listing = await prisma.driverListing.create({
              data: {
                companyId: providerCompany.id,
                name: data.listingTitle,
                licenseClass: 'CE',
                languages: [],
                hourlyRate: 400,
                dailyRate: 2500,
                currency: 'NOK',
                status: 'ACTIVE',
              },
            });
            listingId = listing.id;
          }

          // Calculate dates (inclusive: 1 day booking from June 1 means start=June 1, end=June 1)
          const bookingStartDate = new Date();
          bookingStartDate.setDate(bookingStartDate.getDate() + data.bookingStartDayOffset);
          bookingStartDate.setHours(0, 0, 0, 0);

          const bookingEndDate = new Date(bookingStartDate);
          bookingEndDate.setDate(bookingEndDate.getDate() + data.bookingDurationDays - 1);

          const blockStartDate = new Date(bookingStartDate);
          blockStartDate.setDate(blockStartDate.getDate() + data.blockStartDayOffset);
          blockStartDate.setHours(0, 0, 0, 0);

          const blockEndDate = new Date(blockStartDate);
          blockEndDate.setDate(blockEndDate.getDate() + data.blockDurationDays - 1);

          // Create pending booking
          const bookingData: any = {
            bookingNumber: `BK-TEST-${Date.now()}`,
            renterCompanyId: renterCompany.id,
            providerCompanyId: providerCompany.id,
            status: BookingStatus.PENDING,
            startDate: bookingStartDate,
            endDate: bookingEndDate,
            durationDays: data.bookingDurationDays,
            providerRate: 3000,
            platformCommission: 150,
            platformCommissionRate: 5,
            taxes: 787.5,
            taxRate: 25,
            total: 3937.5,
            currency: 'NOK',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          };

          if (data.listingType === 'vehicle') {
            bookingData.vehicleListingId = listingId;
          } else {
            bookingData.driverListingId = listingId;
          }

          const booking = await prisma.booking.create({ data: bookingData });

          // Count notifications before creating block
          const notificationsBefore = await prisma.notification.count({
            where: {
              userId: providerUser.id,
              type: NotificationType.AVAILABILITY_CONFLICT,
            },
          });

          // Create availability block that overlaps with pending booking
          const block = await availabilityService.createBlock({
            listingId,
            listingType: data.listingType,
            startDate: blockStartDate,
            endDate: blockEndDate,
            reason: data.blockReason,
            createdBy: providerUser.id,
          });

          // Count notifications after creating block
          const notificationsAfter = await prisma.notification.count({
            where: {
              userId: providerUser.id,
              type: NotificationType.AVAILABILITY_CONFLICT,
            },
          });

          // Property: A conflict notification should be generated
          expect(notificationsAfter).toBeGreaterThan(notificationsBefore);

          // Verify the notification contains correct information
          const notification = await prisma.notification.findFirst({
            where: {
              userId: providerUser.id,
              type: NotificationType.AVAILABILITY_CONFLICT,
            },
            orderBy: { createdAt: 'desc' },
          });

          expect(notification).toBeDefined();
          expect(notification!.metadata).toHaveProperty('blockId', block.id);
          expect(notification!.metadata).toHaveProperty('bookingId', booking.id);
          expect(notification!.metadata).toHaveProperty('bookingNumber', booking.bookingNumber);
          expect(notification!.message).toContain(booking.bookingNumber);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout for property test
});
