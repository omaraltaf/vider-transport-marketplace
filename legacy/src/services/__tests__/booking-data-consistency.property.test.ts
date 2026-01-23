/**
 * Property-Based Tests for Booking Data Round-Trip Consistency
 * **Feature: mock-data-replacement, Property 15: Booking data round-trip consistency**
 * **Validates: Requirements 12.2**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { bookingService } from '../booking.service';
import { logger } from '../../config/logger';

const prisma = new PrismaClient();

describe('Booking Data Round-Trip Consistency Properties', () => {
  let testCompanyIds: string[] = [];

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.booking.deleteMany({
      where: {
        bookingNumber: {
          startsWith: 'TEST-'
        }
      }
    });

    // Create test companies for foreign key constraints
    const company1 = await prisma.company.create({
      data: {
        name: 'Test Company 1',
        organizationNumber: `TEST-${Date.now()}-1`,
        businessAddress: 'Test Address 1',
        city: 'Oslo',
        postalCode: '0001',
        fylke: 'Oslo',
        kommune: 'Oslo',
        vatRegistered: true,
        verified: true
      }
    });

    const company2 = await prisma.company.create({
      data: {
        name: 'Test Company 2',
        organizationNumber: `TEST-${Date.now()}-2`,
        businessAddress: 'Test Address 2',
        city: 'Bergen',
        postalCode: '5001',
        fylke: 'Vestland',
        kommune: 'Bergen',
        vatRegistered: true,
        verified: true
      }
    });

    testCompanyIds = [company1.id, company2.id];
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.booking.deleteMany({
      where: {
        bookingNumber: {
          startsWith: 'TEST-'
        }
      }
    });

    // Clean up test companies
    await prisma.company.deleteMany({
      where: {
        id: { in: testCompanyIds }
      }
    });
    testCompanyIds = [];
  });

  /**
   * Property 15: Booking data round-trip consistency
   * **Feature: mock-data-replacement, Property 15: Booking data round-trip consistency**
   * **Validates: Requirements 12.2**
   * 
   * For any booking displayed in the system, all booking details should match 
   * the corresponding database record exactly
   */
  it('should maintain booking data consistency between database and API responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test booking data with simpler values to avoid floating point issues
        fc.record({
          bookingNumber: fc.uuid().map(uuid => `TEST-${uuid}`),
          status: fc.constantFrom('PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED'),
          startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
          endDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
          durationHours: fc.option(fc.integer({ min: 1, max: 168 })),
          durationDays: fc.option(fc.integer({ min: 1, max: 30 })),
          providerRate: fc.integer({ min: 100, max: 10000 }),
          platformCommission: fc.integer({ min: 10, max: 1000 }),
          platformCommissionRate: fc.integer({ min: 1, max: 15 }),
          taxes: fc.integer({ min: 20, max: 2000 }),
          taxRate: fc.integer({ min: 10, max: 30 }),
          total: fc.integer({ min: 200, max: 15000 }),
          currency: fc.constantFrom('NOK', 'EUR', 'USD'),
          requestedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
          expiresAt: fc.date({ min: new Date(), max: new Date('2025-12-31') })
        }),
        async (bookingData) => {
          // Use existing test companies
          const renterCompanyId = testCompanyIds[0];
          const providerCompanyId = testCompanyIds[1];

          // Ensure endDate is after startDate
          if (bookingData.endDate <= bookingData.startDate) {
            bookingData.endDate = new Date(bookingData.startDate.getTime() + 24 * 60 * 60 * 1000);
          }

          // Ensure at least one duration is provided
          if (!bookingData.durationHours && !bookingData.durationDays) {
            bookingData.durationDays = fc.sample(fc.integer({ min: 1, max: 7 }), 1)[0];
          }

          try {
            // Create booking directly in database
            const createdBooking = await prisma.booking.create({
              data: {
                bookingNumber: bookingData.bookingNumber,
                renterCompanyId,
                providerCompanyId,
                vehicleListingId: null, // Simplified for testing
                driverListingId: null,  // Simplified for testing
                status: bookingData.status as any,
                startDate: bookingData.startDate,
                endDate: bookingData.endDate,
                durationHours: bookingData.durationHours,
                durationDays: bookingData.durationDays,
                providerRate: bookingData.providerRate,
                platformCommission: bookingData.platformCommission,
                platformCommissionRate: bookingData.platformCommissionRate,
                taxes: bookingData.taxes,
                taxRate: bookingData.taxRate,
                total: bookingData.total,
                currency: bookingData.currency,
                requestedAt: bookingData.requestedAt,
                expiresAt: bookingData.expiresAt
              }
            });

            // Retrieve booking through service (simulating API call)
            const retrievedBooking = await bookingService.getBookingById(createdBooking.id);

            // Verify booking was retrieved
            expect(retrievedBooking).toBeDefined();
            expect(retrievedBooking).not.toBeNull();

            // Verify all critical fields match exactly
            expect(retrievedBooking.id).toBe(createdBooking.id);
            expect(retrievedBooking.bookingNumber).toBe(bookingData.bookingNumber);
            expect(retrievedBooking.renterCompanyId).toBe(renterCompanyId);
            expect(retrievedBooking.providerCompanyId).toBe(providerCompanyId);
            expect(retrievedBooking.vehicleListingId).toBeUndefined(); // Service returns undefined for null
            expect(retrievedBooking.driverListingId).toBeUndefined(); // Service returns undefined for null
            expect(retrievedBooking.status).toBe(bookingData.status);

            // Verify dates (converted to ISO strings for comparison)
            expect(retrievedBooking.startDate).toBe(bookingData.startDate.toISOString());
            expect(retrievedBooking.endDate).toBe(bookingData.endDate.toISOString());

            // Verify duration fields (service returns undefined for null)
            expect(retrievedBooking.duration.hours).toBe(bookingData.durationHours || undefined);
            expect(retrievedBooking.duration.days).toBe(bookingData.durationDays || undefined);

            // Verify financial data (using integers to avoid floating point issues)
            expect(retrievedBooking.costs.providerRate).toBe(bookingData.providerRate);
            expect(retrievedBooking.costs.platformCommission).toBe(bookingData.platformCommission);
            expect(retrievedBooking.costs.platformCommissionRate).toBe(bookingData.platformCommissionRate);
            expect(retrievedBooking.costs.taxes).toBe(bookingData.taxes);
            expect(retrievedBooking.costs.taxRate).toBe(bookingData.taxRate);
            expect(retrievedBooking.costs.total).toBe(bookingData.total);
            expect(retrievedBooking.costs.currency).toBe(bookingData.currency);

            // Verify timestamps
            expect(retrievedBooking.requestedAt).toBe(bookingData.requestedAt.toISOString());
            expect(retrievedBooking.expiresAt).toBe(bookingData.expiresAt.toISOString());

            // Verify that the retrieved booking has all required fields
            expect(typeof retrievedBooking.createdAt).toBe('string');
            expect(typeof retrievedBooking.updatedAt).toBe('string');

            logger.info('Booking round-trip consistency verified', {
              bookingId: createdBooking.id,
              bookingNumber: bookingData.bookingNumber
            });

            // Clean up the created booking
            await prisma.booking.delete({ where: { id: createdBooking.id } });

          } catch (error) {
            logger.error('Booking round-trip consistency test failed', {
              bookingNumber: bookingData.bookingNumber,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
          }
        }
      ),
      { numRuns: 25 } // Reduced runs to avoid database load
    );
  });

  /**
   * Property: Booking search results consistency
   * **Feature: mock-data-replacement, Property 15: Booking data round-trip consistency**
   * **Validates: Requirements 12.4**
   * 
   * For any booking search operation, all returned booking records should be 
   * verifiable against the database
   */
  it('should maintain consistency between booking search results and database records', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple test bookings
        fc.array(
          fc.record({
            bookingNumber: fc.uuid().map(uuid => `TEST-SEARCH-${uuid}`),
            status: fc.constantFrom('PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED'),
            startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
            endDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
            durationDays: fc.integer({ min: 1, max: 7 }),
            providerRate: fc.integer({ min: 100, max: 5000 }),
            platformCommission: fc.integer({ min: 10, max: 500 }),
            platformCommissionRate: fc.integer({ min: 1, max: 15 }),
            taxes: fc.integer({ min: 20, max: 1000 }),
            taxRate: fc.integer({ min: 10, max: 30 }),
            total: fc.integer({ min: 200, max: 7500 }),
            currency: fc.constantFrom('NOK', 'EUR'),
            requestedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
            expiresAt: fc.date({ min: new Date(), max: new Date('2025-12-31') })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (bookingsData) => {
          const createdBookings = [];

          try {
            // Create multiple bookings in database
            for (const bookingData of bookingsData) {
              // Use existing test companies
              const renterCompanyId = testCompanyIds[0];
              const providerCompanyId = testCompanyIds[1];

              // Ensure endDate is after startDate
              if (bookingData.endDate <= bookingData.startDate) {
                bookingData.endDate = new Date(bookingData.startDate.getTime() + 24 * 60 * 60 * 1000);
              }

              const createdBooking = await prisma.booking.create({
                data: {
                  bookingNumber: bookingData.bookingNumber,
                  renterCompanyId,
                  providerCompanyId,
                  vehicleListingId: null, // Simplified for testing
                  status: bookingData.status as any,
                  startDate: bookingData.startDate,
                  endDate: bookingData.endDate,
                  durationDays: bookingData.durationDays,
                  providerRate: bookingData.providerRate,
                  platformCommission: bookingData.platformCommission,
                  platformCommissionRate: bookingData.platformCommissionRate,
                  taxes: bookingData.taxes,
                  taxRate: bookingData.taxRate,
                  total: bookingData.total,
                  currency: bookingData.currency,
                  requestedAt: bookingData.requestedAt,
                  expiresAt: bookingData.expiresAt
                }
              });

              createdBookings.push(createdBooking);
            }

            // Test company bookings retrieval
            if (createdBookings.length > 0) {
              const companyId = createdBookings[0].renterCompanyId;
              const companyBookings = await bookingService.getCompanyBookings(companyId);

              // Find our test bookings in the results
              const testBookings = companyBookings.filter(booking => 
                booking.bookingNumber.startsWith('TEST-SEARCH-')
              );

              // Verify that all created bookings are found in company bookings
              for (const createdBooking of createdBookings) {
                if (createdBooking.renterCompanyId === companyId || createdBooking.providerCompanyId === companyId) {
                  const foundBooking = testBookings.find(b => b.id === createdBooking.id);
                  expect(foundBooking).toBeDefined();
                  
                  if (foundBooking) {
                    // Verify key fields match
                    expect(foundBooking.bookingNumber).toBe(createdBooking.bookingNumber);
                    expect(foundBooking.status).toBe(createdBooking.status);
                    expect(foundBooking.costs.total).toBe(createdBooking.total);
                    expect(foundBooking.costs.currency).toBe(createdBooking.currency);
                  }
                }
              }
            }

            logger.info('Booking search consistency verified', {
              bookingsCreated: createdBookings.length
            });

          } catch (error) {
            logger.error('Booking search consistency test failed', {
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
          } finally {
            // Clean up created bookings
            for (const booking of createdBookings) {
              try {
                await prisma.booking.delete({ where: { id: booking.id } });
              } catch (cleanupError) {
                // Ignore cleanup errors
              }
            }
          }
        }
      ),
      { numRuns: 25 } // Reduced runs to avoid database load
    );
  });
});