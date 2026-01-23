/**
 * Property-Based Tests for Automatic Booking Rejection
 * Feature: listing-availability-calendar, Property 14: Automatic booking rejection for blocked dates
 * Validates: Requirements 7.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient, NotificationType } from '@prisma/client';
import { bookingService } from './booking.service';
import { availabilityService } from './availability.service';

const prisma = new PrismaClient();

describe('Property 14: Automatic booking rejection for blocked dates', () => {
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
   * Property 14: Automatic booking rejection for blocked dates
   * For any booking request for dates that are blocked, the system should automatically
   * reject the request with a reason indicating the dates are unavailable
   */
  it('should automatically reject booking and notify renter when dates are blocked', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random test data
        fc.integer({ min: 1, max: 10 }).chain(blockDurationDays =>
          fc.record({
            // Company and user data
            providerCompanyName: fc.string({ minLength: 3, maxLength: 20 }),
            baseId: fc.uuid(),
            renterCompanyName: fc.string({ minLength: 3, maxLength: 20 }),
            
            // Listing data
            listingType: fc.constantFrom('vehicle' as const, 'driver' as const),
            listingTitle: fc.string({ minLength: 5, maxLength: 30 }),
            
            // Date range for availability block
            blockStartDayOffset: fc.integer({ min: 1, max: 30 }),
            blockDurationDays: fc.constant(blockDurationDays),
            
            // Date range for booking request (overlapping with block)
            // To guarantee overlap: booking must start before block ends
            // bookingStartDayOffset < blockDurationDays ensures overlap
            bookingStartDayOffset: fc.integer({ min: 0, max: Math.max(0, blockDurationDays - 1) }),
            bookingDurationDays: fc.integer({ min: 1, max: 15 }),
            
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
          const blockStartDate = new Date();
          blockStartDate.setDate(blockStartDate.getDate() + data.blockStartDayOffset);
          blockStartDate.setHours(0, 0, 0, 0);

          const blockEndDate = new Date(blockStartDate);
          blockEndDate.setDate(blockEndDate.getDate() + data.blockDurationDays - 1);

          const bookingStartDate = new Date(blockStartDate);
          bookingStartDate.setDate(bookingStartDate.getDate() + data.bookingStartDayOffset);
          bookingStartDate.setHours(0, 0, 0, 0);

          const bookingEndDate = new Date(bookingStartDate);
          bookingEndDate.setDate(bookingEndDate.getDate() + data.bookingDurationDays - 1);

          // Create availability block
          await availabilityService.createBlock({
            listingId,
            listingType: data.listingType,
            startDate: blockStartDate,
            endDate: blockEndDate,
            reason: data.blockReason,
            createdBy: providerUser.id,
          });

          // Count notifications before booking attempt
          const notificationsBefore = await prisma.notification.count({
            where: {
              userId: renterUser.id,
              type: NotificationType.BOOKING_REJECTED_BLOCKED_DATES,
            },
          });

          // Attempt to create booking for blocked dates
          const bookingData: any = {
            renterCompanyId: renterCompany.id,
            providerCompanyId: providerCompany.id,
            startDate: bookingStartDate,
            endDate: bookingEndDate,
            durationDays: data.bookingDurationDays,
          };

          if (data.listingType === 'vehicle') {
            bookingData.vehicleListingId = listingId;
          } else {
            bookingData.driverListingId = listingId;
          }

          // Property: Booking should be rejected (throw error)
          let bookingRejected = false;
          let errorMessage = '';
          try {
            await bookingService.createBookingRequest(bookingData);
          } catch (error: any) {
            bookingRejected = true;
            errorMessage = error.message;
          }

          // Debug: Log dates if booking wasn't rejected
          if (!bookingRejected) {
            console.log('DEBUG: Booking was not rejected!');
            console.log('Block dates:', { start: blockStartDate.toISOString(), end: blockEndDate.toISOString() });
            console.log('Booking dates:', { start: bookingStartDate.toISOString(), end: bookingEndDate.toISOString() });
            console.log('Test data:', data);
            
            // Check if block exists
            const blocks = await prisma.availabilityBlock.findMany({
              where: { listingId, listingType: data.listingType }
            });
            console.log('Existing blocks:', blocks.map(b => ({ start: b.startDate, end: b.endDate })));
          }

          // Verify booking was rejected
          expect(bookingRejected).toBe(true);
          expect(errorMessage).toMatch(/NOT_AVAILABLE/);

          // Count notifications after booking attempt
          const notificationsAfter = await prisma.notification.count({
            where: {
              userId: renterUser.id,
              type: NotificationType.BOOKING_REJECTED_BLOCKED_DATES,
            },
          });

          // Property: A rejection notification should be sent to the renter
          expect(notificationsAfter).toBeGreaterThan(notificationsBefore);

          // Verify the notification contains correct information
          const notification = await prisma.notification.findFirst({
            where: {
              userId: renterUser.id,
              type: NotificationType.BOOKING_REJECTED_BLOCKED_DATES,
            },
            orderBy: { createdAt: 'desc' },
          });

          expect(notification).toBeDefined();
          expect(notification!.metadata).toHaveProperty('listingId', listingId);
          expect(notification!.metadata).toHaveProperty('listingType', data.listingType);
          expect(notification!.message).toContain('rejected');
          expect(notification!.message).toContain('blocked');
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // 60 second timeout for property test
});
