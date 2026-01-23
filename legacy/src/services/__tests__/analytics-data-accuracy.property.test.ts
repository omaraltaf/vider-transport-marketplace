import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { analyticsService } from '../analytics.service';
import { cacheService } from '../cache.service';

const prisma = new PrismaClient();

/**
 * Feature: mock-data-replacement, Property 3: Real data calculation consistency
 * 
 * For any financial metric or statistic calculation, all input data should be 
 * verifiable against corresponding database records
 * 
 * Validates: Requirements 1.3, 2.3, 2.4, 4.2, 4.5, 13.2
 */

describe('Analytics Data Accuracy Property Tests', () => {
  beforeAll(async () => {
    // Clear cache before tests
    await cacheService.invalidatePattern('analytics:*');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Property 3: Real data calculation consistency', () => {
    test('platform overview metrics should be verifiable against database records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userCount: fc.integer({ min: 0, max: 1000 }),
            companyCount: fc.integer({ min: 0, max: 100 }),
            bookingCount: fc.integer({ min: 0, max: 500 }),
            completedBookings: fc.integer({ min: 0, max: 300 })
          }),
          async (testData) => {
            // Clear cache to ensure fresh data
            await cacheService.invalidatePattern('analytics:*');

            // Get platform overview from service
            const overview = await analyticsService.getPlatformOverview();

            // Verify user metrics against database
            const actualUserCount = await prisma.user.count();
            const actualActiveUsers = await prisma.user.count({
              where: {
                updatedAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            });

            // Verify company metrics against database
            const actualCompanyCount = await prisma.company.count();
            const actualVerifiedCompanies = await prisma.company.count({
              where: { verified: true }
            });

            // Verify booking metrics against database
            const actualBookingCount = await prisma.booking.count();
            const actualCompletedBookings = await prisma.booking.count({
              where: { status: 'COMPLETED' }
            });

            // Verify financial metrics against database
            const actualRevenueResult = await prisma.booking.aggregate({
              where: { status: 'COMPLETED' },
              _sum: { total: true, platformCommission: true }
            });

            // Assert that service data matches database data
            expect(overview.users.total).toBe(actualUserCount);
            expect(overview.users.active).toBe(actualActiveUsers);
            expect(overview.companies.total).toBe(actualCompanyCount);
            expect(overview.companies.verified).toBe(actualVerifiedCompanies);
            expect(overview.bookings.total).toBe(actualBookingCount);
            expect(overview.bookings.completed).toBe(actualCompletedBookings);
            expect(overview.bookings.revenue).toBe(actualRevenueResult._sum.total || 0);
            expect(overview.financial.totalRevenue).toBe(actualRevenueResult._sum.total || 0);
            expect(overview.financial.commissions).toBe(actualRevenueResult._sum.platformCommission || 0);

            // Verify that all metrics are non-negative numbers
            expect(overview.users.total).toBeGreaterThanOrEqual(0);
            expect(overview.users.active).toBeGreaterThanOrEqual(0);
            expect(overview.users.newThisMonth).toBeGreaterThanOrEqual(0);
            expect(overview.companies.total).toBeGreaterThanOrEqual(0);
            expect(overview.companies.verified).toBeGreaterThanOrEqual(0);
            expect(overview.companies.active).toBeGreaterThanOrEqual(0);
            expect(overview.bookings.total).toBeGreaterThanOrEqual(0);
            expect(overview.bookings.completed).toBeGreaterThanOrEqual(0);
            expect(overview.financial.totalRevenue).toBeGreaterThanOrEqual(0);
            expect(overview.financial.commissions).toBeGreaterThanOrEqual(0);

            // Verify logical relationships
            expect(overview.users.active).toBeLessThanOrEqual(overview.users.total);
            expect(overview.companies.verified).toBeLessThanOrEqual(overview.companies.total);
            expect(overview.companies.active).toBeLessThanOrEqual(overview.companies.total);
            expect(overview.bookings.completed).toBeLessThanOrEqual(overview.bookings.total);
            expect(overview.financial.commissions).toBeLessThanOrEqual(overview.financial.totalRevenue);
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('booking metrics should be consistent with database aggregations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            statusFilter: fc.constantFrom('PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED')
          }),
          async (testData) => {
            // Clear cache to ensure fresh data
            await cacheService.invalidatePattern('analytics:*');

            // Get booking metrics from service
            const bookingMetrics = await analyticsService.getBookingMetrics();

            // Verify each status count against database
            const [
              actualPending,
              actualAccepted,
              actualActive,
              actualCompleted,
              actualCancelled,
              actualDisputed,
              actualTotal,
              actualAvgBooking
            ] = await Promise.all([
              prisma.booking.count({ where: { status: 'PENDING' } }),
              prisma.booking.count({ where: { status: 'ACCEPTED' } }),
              prisma.booking.count({ where: { status: 'ACTIVE' } }),
              prisma.booking.count({ where: { status: 'COMPLETED' } }),
              prisma.booking.count({ where: { status: 'CANCELLED' } }),
              prisma.booking.count({ where: { status: 'DISPUTED' } }),
              prisma.booking.count(),
              prisma.booking.aggregate({ _avg: { total: true } })
            ]);

            // Assert service data matches database data
            expect(bookingMetrics.pendingBookings).toBe(actualPending);
            expect(bookingMetrics.acceptedBookings).toBe(actualAccepted);
            expect(bookingMetrics.activeBookings).toBe(actualActive);
            expect(bookingMetrics.completedBookings).toBe(actualCompleted);
            expect(bookingMetrics.cancelledBookings).toBe(actualCancelled);
            expect(bookingMetrics.disputedBookings).toBe(actualDisputed);
            expect(bookingMetrics.averageBookingValue).toBe(
              Math.round((actualAvgBooking._avg.total || 0) * 100) / 100
            );

            // Verify total consistency
            const calculatedTotal = bookingMetrics.pendingBookings + 
                                  bookingMetrics.acceptedBookings + 
                                  bookingMetrics.activeBookings + 
                                  bookingMetrics.completedBookings + 
                                  bookingMetrics.cancelledBookings + 
                                  bookingMetrics.disputedBookings;
            expect(calculatedTotal).toBe(actualTotal);

            // Verify conversion rate calculation
            const expectedConversionRate = actualTotal > 0 
              ? Math.round((actualCompleted / actualTotal) * 100 * 100) / 100
              : 0;
            expect(bookingMetrics.bookingConversionRate).toBe(expectedConversionRate);

            // Verify all metrics are non-negative
            expect(bookingMetrics.pendingBookings).toBeGreaterThanOrEqual(0);
            expect(bookingMetrics.acceptedBookings).toBeGreaterThanOrEqual(0);
            expect(bookingMetrics.activeBookings).toBeGreaterThanOrEqual(0);
            expect(bookingMetrics.completedBookings).toBeGreaterThanOrEqual(0);
            expect(bookingMetrics.cancelledBookings).toBeGreaterThanOrEqual(0);
            expect(bookingMetrics.disputedBookings).toBeGreaterThanOrEqual(0);
            expect(bookingMetrics.averageBookingValue).toBeGreaterThanOrEqual(0);
            expect(bookingMetrics.bookingConversionRate).toBeGreaterThanOrEqual(0);
            expect(bookingMetrics.bookingConversionRate).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('financial metrics should match transaction and booking aggregations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            timeRange: fc.constantFrom('daily', 'monthly', 'yearly')
          }),
          async (testData) => {
            // Clear cache to ensure fresh data
            await cacheService.invalidatePattern('analytics:*');

            // Get financial metrics from service
            const financialMetrics = await analyticsService.getFinancialMetrics();

            // Calculate expected values from database
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const [
              actualDailyRevenue,
              actualMonthlyRevenue,
              actualCommissions,
              actualRefunds,
              actualDisputeRefunds,
              actualAvgTransaction,
              actualTotalTransactions,
              actualFailedTransactions
            ] = await Promise.all([
              prisma.booking.aggregate({
                where: { status: 'COMPLETED', completedAt: { gte: startOfDay } },
                _sum: { total: true }
              }),
              prisma.booking.aggregate({
                where: { status: 'COMPLETED', completedAt: { gte: startOfMonth } },
                _sum: { total: true }
              }),
              prisma.booking.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { platformCommission: true }
              }),
              prisma.transaction.aggregate({
                where: { type: 'REFUND', status: 'COMPLETED' },
                _sum: { amount: true }
              }),
              prisma.dispute.aggregate({
                where: { status: 'RESOLVED', refundAmount: { not: null } },
                _sum: { refundAmount: true }
              }),
              prisma.transaction.aggregate({
                where: { status: 'COMPLETED' },
                _avg: { amount: true }
              }),
              prisma.transaction.count(),
              prisma.transaction.count({ where: { status: 'FAILED' } })
            ]);

            // Assert service data matches database calculations
            expect(financialMetrics.dailyRevenue).toBe(
              Math.round((actualDailyRevenue._sum.total || 0) * 100) / 100
            );
            expect(financialMetrics.monthlyRevenue).toBe(
              Math.round((actualMonthlyRevenue._sum.total || 0) * 100) / 100
            );
            expect(financialMetrics.commissionEarned).toBe(
              Math.round((actualCommissions._sum.platformCommission || 0) * 100) / 100
            );
            expect(financialMetrics.refundsProcessed).toBe(
              Math.round((actualRefunds._sum.amount || 0) * 100) / 100
            );
            expect(financialMetrics.disputeRefunds).toBe(
              Math.round((actualDisputeRefunds._sum.refundAmount || 0) * 100) / 100
            );
            expect(financialMetrics.averageTransactionValue).toBe(
              Math.round((actualAvgTransaction._avg.amount || 0) * 100) / 100
            );

            // Verify payment failure rate calculation
            const expectedFailureRate = actualTotalTransactions > 0 
              ? Math.round((actualFailedTransactions / actualTotalTransactions) * 100 * 100) / 100
              : 0;
            expect(financialMetrics.paymentFailureRate).toBe(expectedFailureRate);

            // Verify all metrics are non-negative
            expect(financialMetrics.dailyRevenue).toBeGreaterThanOrEqual(0);
            expect(financialMetrics.monthlyRevenue).toBeGreaterThanOrEqual(0);
            expect(financialMetrics.commissionEarned).toBeGreaterThanOrEqual(0);
            expect(financialMetrics.refundsProcessed).toBeGreaterThanOrEqual(0);
            expect(financialMetrics.disputeRefunds).toBeGreaterThanOrEqual(0);
            expect(financialMetrics.averageTransactionValue).toBeGreaterThanOrEqual(0);
            expect(financialMetrics.paymentFailureRate).toBeGreaterThanOrEqual(0);
            expect(financialMetrics.paymentFailureRate).toBeLessThanOrEqual(100);

            // Verify logical relationships
            expect(financialMetrics.monthlyRevenue).toBeGreaterThanOrEqual(financialMetrics.dailyRevenue);
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('historical data should maintain consistency across time periods', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            metricType: fc.constantFrom('platform_overview', 'booking_metrics', 'financial_metrics'),
            days: fc.integer({ min: 1, max: 90 })
          }),
          async (testData) => {
            // Get historical data from service
            const historicalData = await analyticsService.getHistoricalData(testData.metricType, testData.days);

            // Verify data structure and consistency
            for (const snapshot of historicalData) {
              expect(snapshot).toHaveProperty('id');
              expect(snapshot).toHaveProperty('snapshotDate');
              expect(snapshot).toHaveProperty('metricType');
              expect(snapshot).toHaveProperty('metricData');
              expect(snapshot).toHaveProperty('createdAt');

              expect(snapshot.metricType).toBe(testData.metricType);
              expect(snapshot.snapshotDate).toBeInstanceOf(Date);
              expect(snapshot.createdAt).toBeInstanceOf(Date);
              expect(typeof snapshot.metricData).toBe('object');
              expect(snapshot.metricData).not.toBeNull();

              // Verify snapshot date is within expected range
              const daysDiff = Math.floor(
                (new Date().getTime() - snapshot.snapshotDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              expect(daysDiff).toBeLessThanOrEqual(testData.days);
              expect(daysDiff).toBeGreaterThanOrEqual(0);
            }

            // Verify chronological order
            for (let i = 1; i < historicalData.length; i++) {
              expect(historicalData[i].snapshotDate.getTime()).toBeGreaterThanOrEqual(
                historicalData[i - 1].snapshotDate.getTime()
              );
            }

            // Verify no duplicate dates for same metric type
            const dates = historicalData.map(d => d.snapshotDate.toISOString().split('T')[0]);
            const uniqueDates = new Set(dates);
            expect(uniqueDates.size).toBe(dates.length);
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    test('analytics cache invalidation should force fresh database queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            cacheOperation: fc.constantFrom('get', 'invalidate', 'refresh')
          }),
          async (testData) => {
            // Get initial data
            const initialOverview = await analyticsService.getPlatformOverview();
            
            // Invalidate cache
            await analyticsService.invalidateCache();
            
            // Get data again - should be fresh from database
            const refreshedOverview = await analyticsService.getPlatformOverview();
            
            // Verify data structure consistency
            expect(typeof initialOverview).toBe('object');
            expect(typeof refreshedOverview).toBe('object');
            
            expect(initialOverview).toHaveProperty('users');
            expect(initialOverview).toHaveProperty('companies');
            expect(initialOverview).toHaveProperty('bookings');
            expect(initialOverview).toHaveProperty('financial');
            
            expect(refreshedOverview).toHaveProperty('users');
            expect(refreshedOverview).toHaveProperty('companies');
            expect(refreshedOverview).toHaveProperty('bookings');
            expect(refreshedOverview).toHaveProperty('financial');
            
            // Both should have same structure and current database values
            const currentUserCount = await prisma.user.count();
            expect(initialOverview.users.total).toBe(currentUserCount);
            expect(refreshedOverview.users.total).toBe(currentUserCount);
            
            // Verify that both calls return consistent data (since database hasn't changed)
            expect(refreshedOverview.users.total).toBe(initialOverview.users.total);
            expect(refreshedOverview.companies.total).toBe(initialOverview.companies.total);
            expect(refreshedOverview.bookings.total).toBe(initialOverview.bookings.total);
          }
        ),
        { numRuns: 5, timeout: 30000 }
      );
    });
  });
});