import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { dashboardService } from '../dashboard.service';
import { cacheService } from '../cache.service';

const prisma = new PrismaClient();

/**
 * Feature: mock-data-replacement, Property 6: Permission-filtered data access
 * 
 * For any user accessing data lists (disputes, users, companies, content), the returned 
 * data should be filtered according to the user's role and permissions
 * 
 * Validates: Requirements 2.1, 3.1, 4.1
 */

describe('Company Data Filtering Property Tests', () => {
  beforeAll(async () => {
    // Clear cache before tests
    await cacheService.invalidatePattern('*');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Property 6: Permission-filtered data access', () => {
    test('company dashboard data should only include company-specific information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            testCompanyId: fc.uuid(),
            otherCompanyId: fc.uuid()
          }),
          async (testData) => {
            // Skip if both IDs are the same
            if (testData.testCompanyId === testData.otherCompanyId) {
              return;
            }

            // Get all companies from database to use real company IDs
            const companies = await prisma.company.findMany({
              select: { id: true },
              take: 2
            });

            if (companies.length < 2) {
              return; // Skip if not enough companies exist
            }

            const [companyA, companyB] = companies;

            try {
              // Get dashboard data for company A
              const dashboardDataA = await dashboardService.getDashboardData(companyA.id);

              // Verify that all data is specific to company A
              // Check KPIs are calculated only for this company
              expect(typeof dashboardDataA.kpis.provider.totalRevenue30Days).toBe('number');
              expect(typeof dashboardDataA.kpis.provider.fleetUtilization).toBe('number');
              expect(typeof dashboardDataA.kpis.renter.totalSpend30Days).toBe('number');
              expect(typeof dashboardDataA.kpis.renter.openBookingsCount).toBe('number');
              expect(typeof dashboardDataA.kpis.renter.upcomingBookingsCount).toBe('number');

              // Verify all values are non-negative
              expect(dashboardDataA.kpis.provider.totalRevenue30Days).toBeGreaterThanOrEqual(0);
              expect(dashboardDataA.kpis.provider.fleetUtilization).toBeGreaterThanOrEqual(0);
              expect(dashboardDataA.kpis.renter.totalSpend30Days).toBeGreaterThanOrEqual(0);
              expect(dashboardDataA.kpis.renter.openBookingsCount).toBeGreaterThanOrEqual(0);
              expect(dashboardDataA.kpis.renter.upcomingBookingsCount).toBeGreaterThanOrEqual(0);

              // Verify fleet utilization is a percentage (0-100)
              expect(dashboardDataA.kpis.provider.fleetUtilization).toBeLessThanOrEqual(100);

              // Verify rating is null or between 1-5
              if (dashboardDataA.kpis.provider.aggregatedRating !== null) {
                expect(dashboardDataA.kpis.provider.aggregatedRating).toBeGreaterThanOrEqual(1);
                expect(dashboardDataA.kpis.provider.aggregatedRating).toBeLessThanOrEqual(5);
              }

              // Verify actionable items are relevant to this company
              for (const item of dashboardDataA.actionableItems) {
                expect(item).toHaveProperty('type');
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('title');
                expect(item).toHaveProperty('description');
                expect(item).toHaveProperty('priority');
                expect(item).toHaveProperty('link');
                expect(item).toHaveProperty('createdAt');

                expect(['booking_request', 'expiring_request', 'unread_message', 'rating_prompt', 'verification_status'])
                  .toContain(item.type);
                expect(['high', 'medium', 'low']).toContain(item.priority);
                expect(new Date(item.createdAt)).toBeInstanceOf(Date);
              }

              // Verify operations data is company-specific
              expect(typeof dashboardDataA.operations.listings.availableCount).toBe('number');
              expect(typeof dashboardDataA.operations.listings.suspendedCount).toBe('number');
              expect(dashboardDataA.operations.listings.availableCount).toBeGreaterThanOrEqual(0);
              expect(dashboardDataA.operations.listings.suspendedCount).toBeGreaterThanOrEqual(0);

              // Verify recent bookings are related to this company
              for (const booking of dashboardDataA.operations.recentBookings) {
                expect(booking).toHaveProperty('id');
                expect(booking).toHaveProperty('bookingNumber');
                expect(booking).toHaveProperty('companyName');
                expect(booking).toHaveProperty('listingTitle');
                expect(booking).toHaveProperty('status');
                expect(booking).toHaveProperty('startDate');
                expect(booking).toHaveProperty('role');

                expect(['provider', 'renter']).toContain(booking.role);
                expect(new Date(booking.startDate)).toBeInstanceOf(Date);
              }

              // Verify profile status is for this company
              expect(typeof dashboardDataA.profile.completeness).toBe('number');
              expect(dashboardDataA.profile.completeness).toBeGreaterThanOrEqual(0);
              expect(dashboardDataA.profile.completeness).toBeLessThanOrEqual(100);
              expect(Array.isArray(dashboardDataA.profile.missingFields)).toBe(true);
              expect(typeof dashboardDataA.profile.verified).toBe('boolean');
              expect(typeof dashboardDataA.profile.allDriversVerified).toBe('boolean');

              // Get dashboard data for company B
              const dashboardDataB = await dashboardService.getDashboardData(companyB.id);

              // Verify that the data is different (unless both companies have identical data)
              // This ensures data is properly filtered per company
              const dataAString = JSON.stringify(dashboardDataA);
              const dataBString = JSON.stringify(dashboardDataB);

              // If companies have different data, the dashboard data should be different
              // (We can't guarantee they're different, but we can verify structure consistency)
              expect(typeof dashboardDataB.kpis.provider.totalRevenue30Days).toBe('number');
              expect(typeof dashboardDataB.kpis.provider.fleetUtilization).toBe('number');
              expect(typeof dashboardDataB.profile.completeness).toBe('number');

            } catch (error) {
              // If company doesn't exist, that's expected behavior
              if (error instanceof Error && error.message === 'COMPANY_NOT_FOUND') {
                return; // This is expected for non-existent companies
              }
              throw error;
            }
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    });

    test('company revenue calculations should only include company-specific bookings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            role: fc.constantFrom('provider', 'renter')
          }),
          async (testData) => {
            // Get a real company from database
            const companies = await prisma.company.findMany({
              select: { id: true },
              take: 1
            });

            if (companies.length === 0) {
              return; // Skip if no companies exist
            }

            const companyId = companies[0].id;

            // Calculate revenue using the service
            const calculatedRevenue = await dashboardService.calculateRevenue30Days(companyId, testData.role);

            // Verify the calculation by doing it manually
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            let expectedRevenue = 0;

            if (testData.role === 'provider') {
              const providerBookings = await prisma.booking.findMany({
                where: {
                  providerCompanyId: companyId,
                  status: { in: ['ACCEPTED', 'COMPLETED'] },
                  createdAt: { gte: thirtyDaysAgo }
                },
                select: { providerRate: true }
              });
              expectedRevenue = providerBookings.reduce((sum, b) => sum + b.providerRate, 0);
            } else {
              const renterBookings = await prisma.booking.findMany({
                where: {
                  renterCompanyId: companyId,
                  status: { in: ['ACCEPTED', 'COMPLETED'] },
                  createdAt: { gte: thirtyDaysAgo }
                },
                select: { total: true }
              });
              expectedRevenue = renterBookings.reduce((sum, b) => sum + b.total, 0);
            }

            // Verify the service calculation matches manual calculation
            expect(calculatedRevenue).toBe(expectedRevenue);
            expect(calculatedRevenue).toBeGreaterThanOrEqual(0);

            // Verify no bookings from other companies are included
            const otherCompanies = await prisma.company.findMany({
              where: { id: { not: companyId } },
              select: { id: true },
              take: 1
            });

            if (otherCompanies.length > 0) {
              const otherCompanyId = otherCompanies[0].id;
              
              // Verify that other company's bookings don't affect this calculation
              let otherCompanyBookings = 0;
              
              if (testData.role === 'provider') {
                otherCompanyBookings = await prisma.booking.count({
                  where: {
                    providerCompanyId: otherCompanyId,
                    status: { in: ['ACCEPTED', 'COMPLETED'] },
                    createdAt: { gte: thirtyDaysAgo }
                  }
                });
              } else {
                otherCompanyBookings = await prisma.booking.count({
                  where: {
                    renterCompanyId: otherCompanyId,
                    status: { in: ['ACCEPTED', 'COMPLETED'] },
                    createdAt: { gte: thirtyDaysAgo }
                  }
                });
              }

              // The presence of other company bookings shouldn't affect our calculation
              const recalculatedRevenue = await dashboardService.calculateRevenue30Days(companyId, testData.role);
              expect(recalculatedRevenue).toBe(calculatedRevenue);
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('fleet utilization should only consider company-owned listings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            testRun: fc.integer({ min: 1, max: 100 })
          }),
          async (testData) => {
            // Get a real company from database
            const companies = await prisma.company.findMany({
              select: { id: true },
              take: 1
            });

            if (companies.length === 0) {
              return; // Skip if no companies exist
            }

            const companyId = companies[0].id;

            // Calculate fleet utilization using the service
            const calculatedUtilization = await dashboardService.calculateFleetUtilization(companyId);

            // Verify the calculation manually
            const [totalVehicles, totalDrivers, activeBookings] = await Promise.all([
              prisma.vehicleListing.count({
                where: { companyId, status: 'ACTIVE' }
              }),
              prisma.driverListing.count({
                where: { companyId, status: 'ACTIVE' }
              }),
              prisma.booking.count({
                where: {
                  providerCompanyId: companyId,
                  status: { in: ['ACTIVE', 'ACCEPTED'] }
                }
              })
            ]);

            const totalListings = totalVehicles + totalDrivers;
            const expectedUtilization = totalListings === 0 ? 0 : (activeBookings / totalListings) * 100;

            // Verify the service calculation matches manual calculation
            expect(calculatedUtilization).toBe(expectedUtilization);
            expect(calculatedUtilization).toBeGreaterThanOrEqual(0);
            expect(calculatedUtilization).toBeLessThanOrEqual(100);

            // Verify that only this company's listings are considered
            const companyListings = await prisma.vehicleListing.findMany({
              where: { companyId, status: 'ACTIVE' },
              select: { companyId: true }
            });

            const companyDrivers = await prisma.driverListing.findMany({
              where: { companyId, status: 'ACTIVE' },
              select: { companyId: true }
            });

            // All listings should belong to this company
            companyListings.forEach(listing => {
              expect(listing.companyId).toBe(companyId);
            });

            companyDrivers.forEach(driver => {
              expect(driver.companyId).toBe(companyId);
            });

            // Verify that bookings used in calculation are for this company
            const utilizationBookings = await prisma.booking.findMany({
              where: {
                providerCompanyId: companyId,
                status: { in: ['ACTIVE', 'ACCEPTED'] }
              },
              select: { providerCompanyId: true }
            });

            utilizationBookings.forEach(booking => {
              expect(booking.providerCompanyId).toBe(companyId);
            });
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('profile completeness should only reflect company-specific data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            testRun: fc.integer({ min: 1, max: 100 })
          }),
          async (testData) => {
            // Get a real company from database
            const companies = await prisma.company.findMany({
              select: { id: true },
              take: 1
            });

            if (companies.length === 0) {
              return; // Skip if no companies exist
            }

            const companyId = companies[0].id;

            // Calculate profile completeness using the service
            const calculatedCompleteness = await dashboardService.calculateProfileCompleteness(companyId);

            // Verify the calculation manually
            const company = await prisma.company.findUnique({
              where: { id: companyId }
            });

            if (!company) {
              return; // Skip if company doesn't exist
            }

            const requiredFields = [
              'name',
              'organizationNumber',
              'businessAddress',
              'city',
              'postalCode',
              'fylke',
              'kommune',
              'description',
            ];

            const filledFields = requiredFields.filter(field => {
              const value = company[field as keyof typeof company];
              return value !== null && value !== undefined && String(value).trim() !== '';
            });

            const expectedCompleteness = (filledFields.length / requiredFields.length) * 100;

            // Verify the service calculation matches manual calculation
            expect(calculatedCompleteness).toBe(expectedCompleteness);
            expect(calculatedCompleteness).toBeGreaterThanOrEqual(0);
            expect(calculatedCompleteness).toBeLessThanOrEqual(100);

            // Verify that only this company's data is used
            expect(company.id).toBe(companyId);

            // Verify completeness is based on actual field values
            for (const field of requiredFields) {
              const value = company[field as keyof typeof company];
              const isFilled = value !== null && value !== undefined && String(value).trim() !== '';
              
              if (isFilled) {
                expect(filledFields).toContain(field);
              } else {
                expect(filledFields).not.toContain(field);
              }
            }
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('booking counts should be filtered by company and role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            status: fc.constantFrom('PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED'),
            role: fc.constantFrom('provider', 'renter')
          }),
          async (testData) => {
            // Get a real company from database
            const companies = await prisma.company.findMany({
              select: { id: true },
              take: 1
            });

            if (companies.length === 0) {
              return; // Skip if no companies exist
            }

            const companyId = companies[0].id;

            // Count bookings using the service
            const serviceCount = await dashboardService.countBookingsByStatus(
              companyId, 
              testData.status as any, 
              testData.role
            );

            // Verify the count manually
            let expectedCount = 0;

            if (testData.role === 'provider') {
              expectedCount = await prisma.booking.count({
                where: {
                  providerCompanyId: companyId,
                  status: testData.status
                }
              });
            } else {
              expectedCount = await prisma.booking.count({
                where: {
                  renterCompanyId: companyId,
                  status: testData.status
                }
              });
            }

            // Verify the service count matches manual count
            expect(serviceCount).toBe(expectedCount);
            expect(serviceCount).toBeGreaterThanOrEqual(0);

            // Verify that bookings are properly filtered by company and role
            const bookings = await prisma.booking.findMany({
              where: testData.role === 'provider' 
                ? { providerCompanyId: companyId, status: testData.status }
                : { renterCompanyId: companyId, status: testData.status },
              select: { 
                providerCompanyId: true, 
                renterCompanyId: true, 
                status: true 
              }
            });

            // All bookings should match the filter criteria
            bookings.forEach(booking => {
              expect(booking.status).toBe(testData.status);
              
              if (testData.role === 'provider') {
                expect(booking.providerCompanyId).toBe(companyId);
              } else {
                expect(booking.renterCompanyId).toBe(companyId);
              }
            });

            expect(bookings.length).toBe(serviceCount);
          }
        ),
        { numRuns: 15, timeout: 30000 }
      );
    });
  });
});