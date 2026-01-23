/**
 * Property-Based Tests for Calendar Export
 * Feature: listing-availability-calendar, Property 16: Calendar export completeness
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient, Role, VehicleType, FuelType, ListingStatus } from '@prisma/client';
import { availabilityService } from './availability.service';

const prisma = new PrismaClient();

describe('Property 16: Calendar export completeness', () => {
  let testCompanyId: string;
  let testUserId: string;
  let testListingId: string;

  beforeAll(async () => {
    // Create test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Export Company',
        organizationNumber: 'ORG-EXPORT-123',
        businessAddress: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        fylke: 'Test Fylke',
        kommune: 'Test Kommune',
        vatRegistered: true,
        description: 'Test company for export',
        verified: true,
      },
    });
    testCompanyId = company.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'exportuser@test.com',
        passwordHash: 'hash',
        firstName: 'Export',
        lastName: 'User',
        phone: '1234567890',
        role: Role.COMPANY_ADMIN,
        companyId: testCompanyId,
      },
    });
    testUserId = user.id;

    // Create test vehicle listing
    const listing = await prisma.vehicleListing.create({
      data: {
        companyId: testCompanyId,
        vehicleType: VehicleType.PALLET_8,
        title: 'Test Export Vehicle',
        description: 'Test vehicle for export',
        capacity: 1000,
        fuelType: FuelType.DIESEL,
        city: 'Test City',
        fylke: 'Test Fylke',
        kommune: 'Test Kommune',
        dailyRate: 100,
        currency: 'NOK',
        withDriver: false,
        withoutDriver: true,
        photos: [],
        tags: [],
        status: ListingStatus.ACTIVE,
      },
    });
    testListingId = listing.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.availabilityBlock.deleteMany({
      where: { listingId: testListingId },
    });
    await prisma.recurringBlock.deleteMany({
      where: { listingId: testListingId },
    });
    await prisma.booking.deleteMany({
      where: { vehicleListingId: testListingId },
    });
    await prisma.vehicleListing.deleteMany({
      where: { id: testListingId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.company.deleteMany({
      where: { id: testCompanyId },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up blocks and bookings before each test
    await prisma.availabilityBlock.deleteMany({
      where: { listingId: testListingId },
    });
    await prisma.recurringBlock.deleteMany({
      where: { listingId: testListingId },
    });
    await prisma.booking.deleteMany({
      where: { vehicleListingId: testListingId },
    });
  });

  it('should include all availability blocks in the exported calendar', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of blocks (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Generate random date range for export
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        async (numBlocks, exportStart, exportEnd) => {
          // Ensure export dates are in order
          if (exportStart > exportEnd) {
            [exportStart, exportEnd] = [exportEnd, exportStart];
          }

          // Create random availability blocks within the export range
          const blocks = [];
          for (let i = 0; i < numBlocks; i++) {
            const blockStart = new Date(
              exportStart.getTime() +
                Math.random() * (exportEnd.getTime() - exportStart.getTime())
            );
            const blockEnd = new Date(
              blockStart.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000
            );

            const block = await availabilityService.createBlock({
              listingId: testListingId,
              listingType: 'vehicle',
              startDate: blockStart,
              endDate: blockEnd,
              reason: `Test block ${i + 1}`,
              createdBy: testUserId,
            });
            blocks.push(block);
          }

          // Export calendar
          const icalContent = await availabilityService.exportCalendar(
            testListingId,
            'vehicle',
            exportStart,
            exportEnd
          );

          // Verify all blocks are included in the export
          for (const block of blocks) {
            // Check that the block ID appears in the calendar
            expect(icalContent).toContain(`block-${block.id}@vider-marketplace`);
            
            // Check that the reason appears if provided
            if (block.reason) {
              expect(icalContent).toContain(block.reason);
            }
          }

          // Verify iCalendar structure
          expect(icalContent).toContain('BEGIN:VCALENDAR');
          expect(icalContent).toContain('END:VCALENDAR');
          expect(icalContent).toContain('VERSION:2.0');
          
          // Count VEVENT entries - should match number of blocks
          const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
          expect(eventCount).toBe(blocks.length);

          // Clean up blocks for next iteration
          await prisma.availabilityBlock.deleteMany({
            where: { listingId: testListingId },
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all bookings in the exported calendar', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random number of bookings (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Generate random date range for export
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        async (numBookings, exportStart, exportEnd) => {
          // Ensure export dates are in order
          if (exportStart > exportEnd) {
            [exportStart, exportEnd] = [exportEnd, exportStart];
          }

          // Create a renter company for bookings
          const renterCompany = await prisma.company.create({
            data: {
              name: 'Test Renter Company',
              organizationNumber: `ORG-RENTER-${Date.now()}`,
              businessAddress: '456 Renter St',
              city: 'Renter City',
              postalCode: '54321',
              fylke: 'Renter Fylke',
              kommune: 'Renter Kommune',
              vatRegistered: true,
              verified: true,
            },
          });

          // Create random bookings within the export range
          const bookings = [];
          for (let i = 0; i < numBookings; i++) {
            const bookingStart = new Date(
              exportStart.getTime() +
                Math.random() * (exportEnd.getTime() - exportStart.getTime())
            );
            const bookingEnd = new Date(
              bookingStart.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000
            );

            const booking = await prisma.booking.create({
              data: {
                bookingNumber: `BK-EXPORT-${Date.now()}-${i}`,
                vehicleListingId: testListingId,
                providerCompanyId: testCompanyId,
                renterCompanyId: renterCompany.id,
                startDate: bookingStart,
                endDate: bookingEnd,
                providerRate: 500,
                platformCommission: 25,
                platformCommissionRate: 5,
                taxes: 125,
                taxRate: 25,
                total: 650,
                status: 'ACCEPTED',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
            bookings.push(booking);
          }

          // Export calendar
          const icalContent = await availabilityService.exportCalendar(
            testListingId,
            'vehicle',
            exportStart,
            exportEnd
          );

          // Verify all bookings are included in the export
          for (const booking of bookings) {
            // Check that the booking ID appears in the calendar
            expect(icalContent).toContain(`booking-${booking.id}@vider-marketplace`);
            
            // Check that the booking number appears
            expect(icalContent).toContain(booking.bookingNumber);
          }

          // Verify iCalendar structure
          expect(icalContent).toContain('BEGIN:VCALENDAR');
          expect(icalContent).toContain('END:VCALENDAR');
          
          // Count VEVENT entries - should match number of bookings
          const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
          expect(eventCount).toBe(bookings.length);

          // Clean up bookings and renter company
          await prisma.booking.deleteMany({
            where: { vehicleListingId: testListingId },
          });
          await prisma.company.delete({ where: { id: renterCompany.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include both blocks and bookings in the exported calendar', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random numbers of blocks and bookings
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        // Generate random date range for export
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        async (numBlocks, numBookings, exportStart, exportEnd) => {
          // Ensure export dates are in order
          if (exportStart > exportEnd) {
            [exportStart, exportEnd] = [exportEnd, exportStart];
          }

          // Create availability blocks
          const blocks = [];
          for (let i = 0; i < numBlocks; i++) {
            const blockStart = new Date(
              exportStart.getTime() +
                Math.random() * (exportEnd.getTime() - exportStart.getTime()) * 0.5
            );
            const blockEnd = new Date(
              blockStart.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000
            );

            const block = await availabilityService.createBlock({
              listingId: testListingId,
              listingType: 'vehicle',
              startDate: blockStart,
              endDate: blockEnd,
              reason: `Test block ${i + 1}`,
              createdBy: testUserId,
            });
            blocks.push(block);
          }

          // Create a renter company for bookings
          const renterCompany = await prisma.company.create({
            data: {
              name: 'Test Mixed Renter',
              organizationNumber: `ORG-MIXED-${Date.now()}`,
              businessAddress: '789 Mixed St',
              city: 'Mixed City',
              postalCode: '99999',
              fylke: 'Mixed Fylke',
              kommune: 'Mixed Kommune',
              vatRegistered: true,
              verified: true,
            },
          });

          // Create bookings
          const bookings = [];
          for (let i = 0; i < numBookings; i++) {
            const bookingStart = new Date(
              exportStart.getTime() +
                Math.random() * (exportEnd.getTime() - exportStart.getTime()) * 0.5 +
                (exportEnd.getTime() - exportStart.getTime()) * 0.5
            );
            const bookingEnd = new Date(
              bookingStart.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000
            );

            const booking = await prisma.booking.create({
              data: {
                bookingNumber: `BK-MIXED-${Date.now()}-${i}`,
                vehicleListingId: testListingId,
                providerCompanyId: testCompanyId,
                renterCompanyId: renterCompany.id,
                startDate: bookingStart,
                endDate: bookingEnd,
                providerRate: 500,
                platformCommission: 25,
                platformCommissionRate: 5,
                taxes: 125,
                taxRate: 25,
                total: 650,
                status: 'ACCEPTED',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
            bookings.push(booking);
          }

          // Export calendar
          const icalContent = await availabilityService.exportCalendar(
            testListingId,
            'vehicle',
            exportStart,
            exportEnd
          );

          // Verify all blocks are included
          for (const block of blocks) {
            expect(icalContent).toContain(`block-${block.id}@vider-marketplace`);
          }

          // Verify all bookings are included
          for (const booking of bookings) {
            expect(icalContent).toContain(`booking-${booking.id}@vider-marketplace`);
            expect(icalContent).toContain(booking.bookingNumber);
          }

          // Count total VEVENT entries
          const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
          expect(eventCount).toBe(blocks.length + bookings.length);

          // Clean up blocks, bookings, and renter company
          await prisma.availabilityBlock.deleteMany({
            where: { listingId: testListingId },
          });
          await prisma.booking.deleteMany({
            where: { vehicleListingId: testListingId },
          });
          await prisma.company.delete({ where: { id: renterCompany.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect date range filtering in export', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate dates for blocks and export range
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-03-31') }),
        fc.date({ min: new Date('2024-04-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-09-30') }),
        async (earlyDate, middleDate, lateDate) => {
          // Create blocks at different times
          const earlyBlock = await availabilityService.createBlock({
            listingId: testListingId,
            listingType: 'vehicle',
            startDate: earlyDate,
            endDate: new Date(earlyDate.getTime() + 24 * 60 * 60 * 1000),
            reason: 'Early block',
            createdBy: testUserId,
          });

          const middleBlock = await availabilityService.createBlock({
            listingId: testListingId,
            listingType: 'vehicle',
            startDate: middleDate,
            endDate: new Date(middleDate.getTime() + 24 * 60 * 60 * 1000),
            reason: 'Middle block',
            createdBy: testUserId,
          });

          const lateBlock = await availabilityService.createBlock({
            listingId: testListingId,
            listingType: 'vehicle',
            startDate: lateDate,
            endDate: new Date(lateDate.getTime() + 24 * 60 * 60 * 1000),
            reason: 'Late block',
            createdBy: testUserId,
          });

          // Export only the middle period
          const exportStart = new Date('2024-04-01');
          const exportEnd = new Date('2024-06-30');

          const icalContent = await availabilityService.exportCalendar(
            testListingId,
            'vehicle',
            exportStart,
            exportEnd
          );

          // Middle block should be included
          expect(icalContent).toContain(`block-${middleBlock.id}@vider-marketplace`);

          // Early and late blocks should NOT be included
          expect(icalContent).not.toContain(`block-${earlyBlock.id}@vider-marketplace`);
          expect(icalContent).not.toContain(`block-${lateBlock.id}@vider-marketplace`);

          // Should have exactly 1 event
          const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
          expect(eventCount).toBe(1);

          // Clean up blocks for next iteration
          await prisma.availabilityBlock.deleteMany({
            where: { listingId: testListingId },
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include recurring block instances in the export', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random days of week (1-3 days)
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 3 }).map(arr => [...new Set(arr)]),
        // Generate date range
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-01-31') }),
        async (daysOfWeek, startDate) => {
          const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

          // Create recurring block
          const recurringBlock = await availabilityService.createRecurringBlock({
            listingId: testListingId,
            listingType: 'vehicle',
            daysOfWeek,
            startDate,
            endDate,
            reason: 'Recurring test',
            createdBy: testUserId,
          });

          // Export calendar
          const icalContent = await availabilityService.exportCalendar(
            testListingId,
            'vehicle',
            startDate,
            endDate
          );

          // Generate expected instances
          const instances = availabilityService.generateRecurringInstances(
            recurringBlock,
            startDate,
            endDate
          );

          // Verify all instances are in the export
          for (const instance of instances) {
            expect(icalContent).toContain(`recurring-${instance.id}@vider-marketplace`);
          }

          // Verify recurring label
          expect(icalContent).toContain('Unavailable (Recurring)');

          // Count events should match instances
          const eventCount = (icalContent.match(/BEGIN:VEVENT/g) || []).length;
          expect(eventCount).toBe(instances.length);

          // Clean up recurring blocks for next iteration
          await prisma.recurringBlock.deleteMany({
            where: { listingId: testListingId },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
