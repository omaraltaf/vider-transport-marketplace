import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient, Role, VehicleType, FuelType, ListingStatus, BookingStatus } from '@prisma/client';
import { availabilityService } from './availability.service';

const prisma = new PrismaClient();

// Helper function to create a test company
async function createTestCompany(orgNumber: string) {
  return prisma.company.create({
    data: {
      name: `Test Company ${orgNumber}`,
      organizationNumber: orgNumber,
      businessAddress: '123 Test St',
      city: 'Oslo',
      postalCode: '0001',
      fylke: 'Oslo',
      kommune: 'Oslo',
      vatRegistered: true,
    },
  });
}

// Helper function to create a test user
async function createTestUser(companyId: string, email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: 'hashedpassword',
      role: Role.COMPANY_ADMIN,
      companyId,
      firstName: 'Test',
      lastName: 'User',
      phone: '+4712345678',
      emailVerified: true,
    },
  });
}

// Helper function to create a test vehicle listing
async function createTestVehicleListing(companyId: string) {
  return prisma.vehicleListing.create({
    data: {
      companyId,
      title: 'Test Vehicle',
      description: 'Test Description',
      vehicleType: VehicleType.PALLET_18,
      capacity: 18,
      fuelType: FuelType.DIESEL,
      city: 'Oslo',
      fylke: 'Oslo',
      kommune: 'Oslo',
      hourlyRate: 500,
      dailyRate: 3000,
      currency: 'NOK',
      withDriver: false,
      withoutDriver: true,
      photos: [],
      tags: [],
      status: ListingStatus.ACTIVE,
    },
  });
}

// Helper to count days in a date range (inclusive)
function countDaysInRange(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // +1 to include both start and end dates
}

// Helper to get all unique dates covered by blocks/bookings
function getUniqueDates(items: Array<{ startDate: Date; endDate: Date }>): Set<string> {
  const dates = new Set<string>();
  
  for (const item of items) {
    const current = new Date(item.startDate);
    const end = new Date(item.endDate);
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    while (current <= end) {
      dates.add(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  }
  
  return dates;
}

describe('AvailabilityService - Analytics Property Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.availabilityBlock.deleteMany();
    await prisma.recurringBlock.deleteMany();
    await prisma.message.deleteMany();
    await prisma.messageThread.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.vehicleListing.deleteMany();
    await prisma.driverListing.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.availabilityBlock.deleteMany();
    await prisma.recurringBlock.deleteMany();
    await prisma.message.deleteMany();
    await prisma.messageThread.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.vehicleListing.deleteMany();
    await prisma.driverListing.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  });

  /**
   * Feature: listing-availability-calendar, Property 15: Availability statistics calculation
   * Validates: Requirements 9.1, 9.2, 9.3
   * 
   * For any listing and time period, the percentage of blocked days should equal 
   * (count of blocked days / total days in period) × 100, and utilization rate should equal 
   * (count of booked days / count of available days) × 100
   */
  it('should correctly calculate availability statistics for any listing and time period', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a time period (30-90 days)
        fc.integer({ min: 30, max: 90 }),
        // Generate number of blocks (0-5)
        fc.integer({ min: 0, max: 5 }),
        // Generate number of bookings (0-5)
        fc.integer({ min: 0, max: 5 }),
        async (periodDays, numBlocks, numBookings) => {
          // Setup: Create test data
          const company = await createTestCompany(`ORG-${Date.now()}-${Math.random()}`);
          const user = await createTestUser(company.id, `test-${Date.now()}-${Math.random()}@example.com`);
          const listing = await createTestVehicleListing(company.id);

          // Define the analysis period
          const periodStart = new Date();
          periodStart.setHours(0, 0, 0, 0);
          const periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + periodDays - 1);
          periodEnd.setHours(23, 59, 59, 999);

          const totalDays = periodDays;

          // Create random availability blocks within the period
          const blocks: Array<{ startDate: Date; endDate: Date }> = [];
          for (let i = 0; i < numBlocks; i++) {
            const blockStartOffset = Math.floor(Math.random() * (periodDays - 1));
            const blockDuration = Math.floor(Math.random() * Math.min(5, periodDays - blockStartOffset)) + 1;
            
            const blockStart = new Date(periodStart);
            blockStart.setDate(blockStart.getDate() + blockStartOffset);
            const blockEnd = new Date(blockStart);
            blockEnd.setDate(blockEnd.getDate() + blockDuration - 1);

            await availabilityService.createBlock({
              listingId: listing.id,
              listingType: 'vehicle',
              startDate: blockStart,
              endDate: blockEnd,
              reason: `Test block ${i}`,
              createdBy: user.id,
            });

            blocks.push({ startDate: blockStart, endDate: blockEnd });
          }

          // Create random bookings within the period (avoiding blocked dates)
          const bookings: Array<{ startDate: Date; endDate: Date }> = [];
          for (let i = 0; i < numBookings; i++) {
            const bookingStartOffset = Math.floor(Math.random() * (periodDays - 1));
            const bookingDuration = Math.floor(Math.random() * Math.min(5, periodDays - bookingStartOffset)) + 1;
            
            const bookingStart = new Date(periodStart);
            bookingStart.setDate(bookingStart.getDate() + bookingStartOffset);
            const bookingEnd = new Date(bookingStart);
            bookingEnd.setDate(bookingEnd.getDate() + bookingDuration - 1);

            // Check if this booking would conflict with blocks
            const availability = await availabilityService.checkAvailability({
              listingId: listing.id,
              listingType: 'vehicle',
              startDate: bookingStart,
              endDate: bookingEnd,
            });

            // Only create booking if no conflicts
            if (availability.available) {
              const renterCompany = await createTestCompany(`RENTER-${Date.now()}-${Math.random()}`);
              const renterUser = await createTestUser(renterCompany.id, `renter-${Date.now()}-${Math.random()}@example.com`);

              const expiresAt = new Date(bookingStart);
              expiresAt.setDate(expiresAt.getDate() + 7); // Expires 7 days after start

              const booking = await prisma.booking.create({
                data: {
                  bookingNumber: `BK-${Date.now()}-${Math.random()}`,
                  vehicleListingId: listing.id,
                  providerCompanyId: company.id,
                  renterCompanyId: renterCompany.id,
                  startDate: bookingStart,
                  endDate: bookingEnd,
                  providerRate: 1000,
                  platformCommission: 100,
                  platformCommissionRate: 0.1,
                  taxes: 50,
                  taxRate: 0.05,
                  total: 1150,
                  currency: 'NOK',
                  status: BookingStatus.ACCEPTED,
                  expiresAt,
                },
              });

              bookings.push({ startDate: bookingStart, endDate: bookingEnd });
            }
          }

          // Calculate expected statistics
          const blockedDates = getUniqueDates(blocks);
          const bookedDates = getUniqueDates(bookings);
          
          const blockedDaysCount = blockedDates.size;
          const bookedDaysCount = bookedDates.size;
          
          // Available days = total days - blocked days
          const availableDaysCount = totalDays - blockedDaysCount;
          
          // Calculate expected percentages
          const expectedBlockedPercentage = (blockedDaysCount / totalDays) * 100;
          const expectedUtilizationRate = availableDaysCount > 0 
            ? (bookedDaysCount / availableDaysCount) * 100 
            : 0;

          // Get analytics from service
          const analytics = await availabilityService.getAnalytics(
            listing.id,
            'vehicle',
            periodStart,
            periodEnd
          );

          // Verify: Statistics match expected calculations
          expect(analytics.totalDays).toBe(totalDays);
          expect(analytics.blockedDays).toBe(blockedDaysCount);
          expect(analytics.bookedDays).toBe(bookedDaysCount);
          expect(analytics.availableDays).toBe(availableDaysCount);
          
          // Allow small floating point differences (within 0.01%)
          expect(Math.abs(analytics.blockedPercentage - expectedBlockedPercentage)).toBeLessThan(0.01);
          expect(Math.abs(analytics.utilizationRate - expectedUtilizationRate)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });
});
